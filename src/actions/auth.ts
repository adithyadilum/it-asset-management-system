'use server';

import { getServerSession } from 'next-auth';


import { authOptions } from '@/lib/auth/auth-options';
import { logAuditAction } from '@/lib/audit';
import type { UserRole } from '@/types/auth';
import { serverEnv } from '@/lib/env';

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

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

/**
 * Returns the currently authenticated user, or `null` if the session is
 * missing or any required field is invalid.
 *
 * The return type is intentionally kept identical to the previous custom-JWT
 * implementation so the 50+ call-sites remain unchanged.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.error === 'RefreshAccessTokenError') {
    return null;
  }

  const { id, email, name, role } = session.user;

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

  return {
    id,
    email,
    name,
    role: normalizeRole(role),
  };
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
