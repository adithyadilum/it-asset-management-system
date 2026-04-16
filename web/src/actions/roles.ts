'use server';

import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq, ilike, or, and, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/jwt';

const SESSION_COOKIE_NAME = 'session_token';
type UserRole = typeof users.$inferSelect.role;

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
 * Helper to get the current user ID and verify session validity.
 */
async function getAuthenticatedUser(): Promise<{
  id: number;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    // Validate sub is numeric and sid exists
    if (!payload.sub || isNaN(Number(payload.sub))) return null;
    if (!payload.sid || typeof payload.sid !== 'string') return null;

    const role = normalizeTokenRole(payload.role);
    if (!role) return null;

    // Verify the session against the database to ensure it hasn't been revoked.
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
      return null; // Session is revoked or expired
    }

    return {
      id: Number(payload.sub),
      role,
    };
  } catch {
    return null;
  }
}

/**
 * Search for users by name or email.
 */
export async function searchUsers(query: string) {
  // Authentication & Authorization Guard (prevents data enumeration).
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    throw new Error('Forbidden: You do not have permission to search users.');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        department: users.department,
        role: users.role,
      })
      .from(users)
      .where(
        or(
          ilike(users.name, `%${trimmedQuery}%`),
          ilike(users.email, `%${trimmedQuery}%`)
        )
      )
      .limit(10);
  } catch (error) {
    console.error('Search Error:', error);
    throw new Error('Failed to search users.');
  }
}

/**
 * Assigns a new role to a user.
 */
export async function assignUserRole(targetUserId: number, newRole: UserRole) {
  const currentUser = await getAuthenticatedUser();

  // Authorization Guard.
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    throw new Error('Forbidden: Only Global Administrators can modify roles.');
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    throw new Error('Invalid target user id.');
  }

  const normalizedNewRole = normalizeTokenRole(newRole);
  if (!normalizedNewRole) {
    throw new Error('Invalid role value.');
  }

  // Anti-Lockout Guard
  if (targetUserId === currentUser.id) {
    throw new Error('Action Prohibited: You cannot modify your own role.');
  }

  try {
    // Use .returning() to verify a row was actually affected.
    const updatedUsers = await db
      .update(users)
      .set({ role: normalizedNewRole })
      .where(eq(users.id, targetUserId))
      .returning({ updatedId: users.id });

    if (updatedUsers.length === 0) {
      return { success: false, error: 'User not found or no changes made.' };
    }

    // Revoke active sessions so role changes take effect immediately.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, targetUserId),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`
        )
      );

    revalidatePath('/settings/roles');
    return { success: true };
  } catch (error) {
    console.error('Assignment Error:', error);
    return { success: false, error: 'Database update failed.' };
  }
}
