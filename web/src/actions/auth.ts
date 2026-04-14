'use server';

import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { getJwtSecretKey } from '@/lib/jwt';
import type { LoginActionResult, LoginRequest, UserRole } from '@/types/auth';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_TTL_SECONDS = 60 * 60 * 24;

function normalizeRole(role: string): UserRole {
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
  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
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

  await db.insert(sessions).values({
    userId: user.id,
    tokenId,
    expiresAt,
  });

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
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const verified = await jwtVerify(token, getJwtSecretKey());
      const sessionId = verified.payload.sid;

      if (typeof sessionId === 'string') {
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(
            and(eq(sessions.tokenId, sessionId), isNull(sessions.revokedAt))
          );
      }
    } catch {
      // Ignore invalid token here; cookie is removed below regardless.
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
