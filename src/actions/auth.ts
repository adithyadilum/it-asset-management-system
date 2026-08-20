'use server';

import { getServerSession } from 'next-auth';
import { cache } from 'react';

import { authOptions } from '@/lib/auth/auth-options';
import { logAuditAction } from '@/lib/audit';
import type { UserRole } from '@/types/auth';
import { serverEnv } from '@/lib/env';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

function normalizeRole(role: unknown): UserRole {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinancialAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return 'Employee';
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

/**
 * Returns the currently authenticated user, or `null` if the session is
 * missing or any required field is invalid.
 *
 * The return type is intentionally kept identical to the previous custom-JWT
 * implementation so the 50+ call-sites remain unchanged.
 */
async function loadAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.error === 'RefreshAccessTokenError') {
    return null;
  }

  const { id, email, name } = session.user;

  // Explicitly validate every field — NextAuth fields can be null/undefined.
  if (
    typeof id !== 'string' ||
    typeof email !== 'string' ||
    typeof name !== 'string' ||
    !id ||
    !email ||
    !name
  ) {
    return null;
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!currentUser?.isActive) return null;

  return {
    ...currentUser,
    role: normalizeRole(currentUser.role),
    isActive: true,
  };
}

// React scopes this cache to the current server request. Server-rendered pages
// can call several protected loaders without re-reading the same user row.
const getRequestAuthenticatedUser = cache(loadAuthenticatedUser);

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return getRequestAuthenticatedUser();
}

/**
 * Logs the logout action and constructs the Keycloak federated logout URL.
 * The client should call this, then call next-auth signOut({ redirect: false }),
 * and finally redirect the window to the returned URL.
 */
export async function getFederatedLogoutUrl() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    await logAuditAction({
      entityType: 'sessions',
      entityId: session.user.id,
      actionType: 'LOGOUT',
      performedById: session.user.id,
      newData: { email: session.user.email },
    });
  }

  const idToken = session?.idToken || '';
  const endSessionUrl = `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;

  // Use NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL to dynamically determine the callback origin
  const baseUrl = serverEnv.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = encodeURIComponent(`${baseUrl}/login`);

  return `${endSessionUrl}?id_token_hint=${idToken}&post_logout_redirect_uri=${redirectUri}`;
}

/**
 * Server action helper to enforce authentication and RBAC in a single call.
 * If authentication fails, or if the role predicate fails, it throws a standard error.
 *
 * @param predicate Optional function to check if the user's role has permission.
 * @returns The authenticated user object.
 */
export async function enforceActionAccess(
  predicate?: (role: UserRole) => boolean
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  if (predicate && !predicate(user.role)) {
    throw new Error('FORBIDDEN: Forbidden');
  }

  return user;
}

/**
 * Form action helper to enforce authentication and RBAC.
 * Instead of throwing, it returns a standard failure payload.
 *
 * @param predicate Optional function to check if the user's role has permission.
 * @returns An object with { ok: true, user } or { ok: false, payload }
 */
export async function enforceFormAccess(
  predicate?: (role: UserRole) => boolean
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      ok: false as const,
      payload: { success: false, message: 'Unauthorized.' },
    };
  }

  if (predicate && !predicate(user.role)) {
    return {
      ok: false as const,
      payload: {
        success: false,
        message: 'Forbidden: insufficient permissions.',
      },
    };
  }

  return { ok: true as const, user };
}
