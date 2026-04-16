'use server';

import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq, ilike, or, and, isNull, inArray, sql } from 'drizzle-orm';
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

function normalizeTargetUserIds(targetUserIds: number[]) {
  const normalizedTargetUserIds = new Set<number>();

  for (const targetUserId of targetUserIds) {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      continue;
    }

    normalizedTargetUserIds.add(targetUserId);
  }

  return [...normalizedTargetUserIds];
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
 * Assigns a role to multiple users in one transaction.
 */
export async function assignUsersRoleBulk(
  targetUserIds: number[],
  newRole: UserRole
) {
  const currentUser = await getAuthenticatedUser();

  // Authorization Guard.
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    throw new Error('Forbidden: Only Global Administrators can modify roles.');
  }

  const normalizedNewRole = normalizeTokenRole(newRole);
  if (!normalizedNewRole) {
    throw new Error('Invalid role value.');
  }

  const normalizedTargetUserIds = normalizeTargetUserIds(targetUserIds);
  if (normalizedTargetUserIds.length === 0) {
    return {
      success: false,
      error: 'Select at least one valid user to assign.',
    };
  }

  try {
    const mutationSummary = await db.transaction(async (tx) => {
      const matchedUsers = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(inArray(users.id, normalizedTargetUserIds));

      const targetUserIdsToUpdate = matchedUsers
        .filter((matchedUser) => matchedUser.role !== normalizedNewRole)
        .map((matchedUser) => matchedUser.id);

      // Anti-Lockout Guard only applies to rows where a mutation would occur.
      if (targetUserIdsToUpdate.includes(currentUser.id)) {
        throw new Error('Action Prohibited: You cannot modify your own role.');
      }

      if (targetUserIdsToUpdate.length === 0) {
        return {
          updatedCount: 0,
          skippedCount: normalizedTargetUserIds.length,
        };
      }

      const updatedUsers = await tx
        .update(users)
        .set({ role: normalizedNewRole })
        .where(inArray(users.id, targetUserIdsToUpdate))
        .returning({ updatedId: users.id });

      // Revoke active sessions so role changes take effect immediately.
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            inArray(sessions.userId, targetUserIdsToUpdate),
            isNull(sessions.revokedAt),
            sql`${sessions.expiresAt} > NOW()`
          )
        );

      return {
        updatedCount: updatedUsers.length,
        skippedCount: normalizedTargetUserIds.length - updatedUsers.length,
      };
    });

    revalidatePath('/settings/roles');
    return {
      success: true,
      ...mutationSummary,
    };
  } catch (error) {
    console.error('Bulk Assignment Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed.',
    };
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

/**
 * Removes a user from a managed role by assigning the baseline Employee role.
 */
export async function removeUserFromManagedRole(targetUserId: number) {
  return assignUserRole(targetUserId, 'Employee');
}
