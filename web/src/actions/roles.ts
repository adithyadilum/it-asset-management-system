'use server';

import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq, ilike, or, and, isNull, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/jwt';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

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
  const authTimer = startLatencyTimer();
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
    let activeSession: Array<{ id: number }> = [];
    const sessionLookupTimer = startLatencyTimer();
    try {
      activeSession = await db
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
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'roles.getAuthenticatedUser.session_lookup',
        startTime: sessionLookupTimer,
      });
    }

    if (activeSession.length === 0) {
      return null; // Session is revoked or expired
    }

    return {
      id: Number(payload.sub),
      role,
    };
  } catch {
    return null;
  } finally {
    logLatency({
      scope: 'ACTION AUTH',
      label: 'roles.getAuthenticatedUser',
      startTime: authTimer,
    });
  }
}

/**
 * Search for users by name or email.
 */
export async function searchUsers(query: string) {
  const actionTimer = startLatencyTimer();
  // Authentication & Authorization Guard (prevents data enumeration).
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    throw new Error('Forbidden: You do not have permission to search users.');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const queryTimer = startLatencyTimer();
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
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'roles.searchUsers.query',
        startTime: queryTimer,
        metadata: {
          queryLength: trimmedQuery.length,
        },
      });
    }
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'roles.searchUsers',
      error,
    });
    throw new Error('Failed to search users.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'roles.searchUsers',
      startTime: actionTimer,
      metadata: {
        queryLength: trimmedQuery.length,
      },
    });
  }
}

/**
 * Assigns a role to multiple users via a single atomic update.
 */
export async function assignUsersRoleBulk(
  targetUserIds: number[],
  newRole: UserRole
) {
  const actionTimer = startLatencyTimer();
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

  // Anti-Lockout Guard.
  if (normalizedTargetUserIds.includes(currentUser.id)) {
    throw new Error('Action Prohibited: You cannot modify your own role.');
  }

  try {
    const updateUsersTimer = startLatencyTimer();
    const updatedUsers = await db
      .update(users)
      .set({ role: normalizedNewRole })
      .where(inArray(users.id, normalizedTargetUserIds))
      .returning({ updatedId: users.id });

    logLatency({
      scope: 'DB ACTION',
      label: 'roles.assignUsersRoleBulk.update_users',
      startTime: updateUsersTimer,
      metadata: {
        requestedCount: normalizedTargetUserIds.length,
        updatedCount: updatedUsers.length,
      },
    });

    const updatedUserIds = updatedUsers.map(
      (updatedUser) => updatedUser.updatedId
    );
    if (updatedUserIds.length > 0) {
      const revokeSessionsTimer = startLatencyTimer();
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            inArray(sessions.userId, updatedUserIds),
            isNull(sessions.revokedAt),
            sql`${sessions.expiresAt} > NOW()`
          )
        );

      logLatency({
        scope: 'DB ACTION',
        label: 'roles.assignUsersRoleBulk.revoke_sessions',
        startTime: revokeSessionsTimer,
        metadata: {
          updatedCount: updatedUsers.length,
        },
      });
    }

    revalidatePath('/settings/roles');
    return {
      success: true,
      count: updatedUsers.length,
      updatedCount: updatedUsers.length,
      skippedCount: Math.max(
        0,
        normalizedTargetUserIds.length - updatedUsers.length
      ),
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'roles.assignUsersRoleBulk',
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'roles.assignUsersRoleBulk',
      startTime: actionTimer,
      metadata: {
        requestedCount: normalizedTargetUserIds.length,
      },
    });
  }
}

/**
 * Assigns a new role to a user.
 */
export async function assignUserRole(targetUserId: number, newRole: UserRole) {
  const actionTimer = startLatencyTimer();
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
    const updateUserTimer = startLatencyTimer();
    const updatedUsers = await db
      .update(users)
      .set({ role: normalizedNewRole })
      .where(eq(users.id, targetUserId))
      .returning({ updatedId: users.id });
    logLatency({
      scope: 'DB ACTION',
      label: 'roles.assignUserRole.update_user_role',
      startTime: updateUserTimer,
      metadata: {
        targetUserId,
      },
    });

    if (updatedUsers.length === 0) {
      return { success: false, error: 'User not found or no changes made.' };
    }

    // Revoke active sessions so role changes take effect immediately.
    const revokeSessionTimer = startLatencyTimer();
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
    logLatency({
      scope: 'DB ACTION',
      label: 'roles.assignUserRole.revoke_sessions',
      startTime: revokeSessionTimer,
      metadata: {
        targetUserId,
      },
    });

    revalidatePath('/settings/roles');
    return { success: true };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'roles.assignUserRole',
      error,
      metadata: {
        targetUserId,
      },
    });
    return { success: false, error: 'Database update failed.' };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'roles.assignUserRole',
      startTime: actionTimer,
      metadata: {
        targetUserId,
      },
    });
  }
}

/**
 * Removes a user from a managed role by assigning the baseline Employee role.
 */
export async function removeUserFromManagedRole(targetUserId: number) {
  return assignUserRole(targetUserId, 'Employee');
}
