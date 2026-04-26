import { and, eq, isNull, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { getJwtSecretKey } from '@/lib/auth/jwt';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { isValidUuid } from '@/lib/auth/uuid';

const SESSION_COOKIE_NAME = 'session_token';

export type UserRole = typeof users.$inferSelect.role;

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

function normalizeTokenRole(role: unknown): UserRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}

/**
 * Retrieves the authenticated user from the session cookie.
 * Returns `null` if the user is not authenticated, the session is expired,
 * or the token is invalid.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const authTimer = startLatencyTimer();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    if (!isValidUuid(payload.sub)) {
      return null;
    }

    if (!payload.sid || typeof payload.sid !== 'string') {
      return null;
    }

    const role = normalizeTokenRole(payload.role);

    if (!role) {
      return null;
    }

    const activeSession = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenId, payload.sid),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (activeSession.length === 0) {
      return null;
    }

    return {
      id: payload.sub,
      role,
    };
  } catch {
    return null;
  } finally {
    logLatency({
      scope: 'ACTION AUTH',
      label: 'getAuthenticatedUser',
      startTime: authTimer,
    });
  }
}

/**
 * Returns `true` if the role has permission to manage assets.
 */
export function canManageAssets(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}
