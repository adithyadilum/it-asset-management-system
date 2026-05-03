'use server';

import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { getJwtSecretKey } from '@/lib/auth/jwt';
import { logAuditAction } from '@/lib/audit';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { isValidUuid } from '@/lib/auth/uuid';
import type { LoginActionResult, LoginRequest, UserRole } from '@/types/auth';
import {
  authSessionCache,
  buildAuthCacheKey,
} from '@/lib/auth/auth-session-cache';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

const SESSION_TTL_SECONDS = 60 * 60 * 24;

function normalizeRole(role: unknown): UserRole {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return 'Employee';
}

export async function mockLogin(
  credentials: LoginRequest
): Promise<LoginActionResult> {
  const actionTimer = startLatencyTimer();

  try {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const userLookupTimer = startLatencyTimer();
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    logLatency({
      scope: 'DB ACTION',
      label: 'auth.mockLogin.find_user',
      startTime: userLookupTimer,
    });

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'Your account is inactive. Contact IT support.',
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    const tokenId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const role = normalizeRole(user.role);

    const createSessionTimer = startLatencyTimer();
    const createdSessions = await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenId,
        expiresAt,
      })
      .returning({
        tokenId: sessions.tokenId,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      });
    logLatency({
      scope: 'DB ACTION',
      label: 'auth.mockLogin.create_session',
      startTime: createSessionTimer,
      metadata: { userId: user.id },
    });

    if (createdSessions[0]) {
      await logAuditAction({
        entityType: 'sessions',
        entityId: createdSessions[0].tokenId,
        actionType: 'LOGIN',
        performedById: user.id,
        newData: createdSessions[0],
      });
    }

    const token = await new SignJWT({
      sid: tokenId,
      email: user.email,
      role,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
      .sign(getJwtSecretKey());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
      sessionId: tokenId,
      expiresAt: expiresAt.toISOString(),
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'auth.mockLogin',
      startTime: actionTimer,
    });
  }
}

export async function logout() {
  const actionTimer = startLatencyTimer();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      try {
        const verified = await jwtVerify(token, getJwtSecretKey());
        const sessionId = verified.payload.sid;
        const sub = verified.payload.sub;

        if (typeof sessionId === 'string' && typeof sub === 'string') {
          authSessionCache.delete(buildAuthCacheKey({ sid: sessionId, sub }));
        }

        if (typeof sessionId === 'string') {
          const previousSession = await db.query.sessions.findFirst({
            where: eq(sessions.tokenId, sessionId),
            columns: {
              tokenId: true,
              userId: true,
              expiresAt: true,
              revokedAt: true,
            },
          });

          const revokeSessionTimer = startLatencyTimer();
          const revokedSessions = await db
            .update(sessions)
            .set({ revokedAt: new Date() })
            .where(
              and(eq(sessions.tokenId, sessionId), isNull(sessions.revokedAt))
            )
            .returning({
              tokenId: sessions.tokenId,
              userId: sessions.userId,
              expiresAt: sessions.expiresAt,
              revokedAt: sessions.revokedAt,
            });

          logLatency({
            scope: 'DB ACTION',
            label: 'auth.logout.revoke_session',
            startTime: revokeSessionTimer,
            metadata: {
              updated: revokedSessions.length,
            },
          });

          if (previousSession && revokedSessions[0]) {
            await logAuditAction({
              entityType: 'sessions',
              entityId: revokedSessions[0].tokenId,
              actionType: 'LOGOUT',
              performedById:
                typeof sub === 'string' && isValidUuid(sub)
                  ? sub
                  : revokedSessions[0].userId,
              oldData: previousSession,
              newData: revokedSessions[0],
            });
          }
        }
      } catch {
        // Ignore invalid token; cookie is removed below regardless.
      }
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    redirect('/login');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'auth.logout',
      startTime: actionTimer,
    });
  }
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const actionTimer = startLatencyTimer();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    if (!isValidUuid(payload.sub)) return null;
    if (!payload.sid || typeof payload.sid !== 'string') return null;

    const cacheKey = buildAuthCacheKey({ sid: payload.sid, sub: payload.sub });
    const cached = authSessionCache.get(cacheKey);

    if (cached !== undefined) {
      logLatency({
        scope: 'ACTION AUTH',
        label: 'auth.getAuthenticatedUser.cache_hit',
        startTime: actionTimer,
      });
      return cached;
    }

    const dbTimer = startLatencyTimer();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenId, payload.sid),
          eq(sessions.userId, payload.sub),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`
        )
      )
      .limit(1);
    logLatency({
      scope: 'DB ACTION',
      label: 'auth.getAuthenticatedUser.session_join_user',
      startTime: dbTimer,
    });

    if (rows.length === 0) {
      authSessionCache.set(cacheKey, null);
      return null;
    }

    const user = rows[0];

    if (!user.isActive) {
      authSessionCache.set(cacheKey, null);
      return null;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
    };

    authSessionCache.set(cacheKey, authUser);
    return authUser;
  } catch {
    return null;
  } finally {
    logLatency({
      scope: 'ACTION AUTH',
      label: 'auth.getAuthenticatedUser',
      startTime: actionTimer,
    });
  }
}
