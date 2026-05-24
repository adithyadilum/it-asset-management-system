'use server';

import { db } from '@/db';
import { departments, users, sessions } from '@/db/schema';
import { eq, ilike, or, and, isNull, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { logAuditAction } from '@/lib/audit';
import { isValidUuid } from '@/lib/auth/uuid';
import { getAuthenticatedUser } from '@/actions/auth';

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

function normalizeTargetUserIds(targetUserIds: string[]) {
  const normalizedTargetUserIds = new Set<string>();

  for (const targetUserId of targetUserIds) {
    if (!isValidUuid(targetUserId)) {
      continue;
    }

    normalizedTargetUserIds.add(targetUserId);
  }

  return [...normalizedTargetUserIds];
}

/**
 * Search for users by name or email.
 */
export async function searchUsers(query: string) {
  const actionTimer = startLatencyTimer();

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
          department: sql<string>`coalesce(${departments.name}, 'Unassigned')`,
          role: users.role,
        })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
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
  targetUserIds: string[],
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
    const previousUsers = await db.query.users.findMany({
      where: inArray(users.id, normalizedTargetUserIds),
      columns: {
        id: true,
        role: true,
      },
    });

    const updateUsersTimer = startLatencyTimer();
    const updatedUsers = await db
      .update(users)
      .set({ role: normalizedNewRole })
      .where(inArray(users.id, normalizedTargetUserIds))
      .returning({ updatedId: users.id, updatedRole: users.role });

    logLatency({
      scope: 'DB ACTION',
      label: 'roles.assignUsersRoleBulk.update_users',
      startTime: updateUsersTimer,
      metadata: {
        requestedCount: normalizedTargetUserIds.length,
        updatedCount: updatedUsers.length,
      },
    });

    const previousUserById = new Map(
      previousUsers.map((previousUser) => [previousUser.id, previousUser])
    );

    await Promise.all(
      updatedUsers.map((updatedUser) => {
        const previousUser = previousUserById.get(updatedUser.updatedId);

        return logAuditAction({
          entityType: 'users',
          entityId: updatedUser.updatedId,
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: previousUser ? { role: previousUser.role } : { role: null },
          newData: { role: updatedUser.updatedRole },
        });
      })
    );

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
      error: 'Database update failed.',
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
export async function assignUserRole(targetUserId: string, newRole: UserRole) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  // Authorization Guard.
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    throw new Error('Forbidden: Only Global Administrators can modify roles.');
  }

  if (!isValidUuid(targetUserId)) {
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
    const previousUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: {
        id: true,
        role: true,
      },
    });

    // Use .returning() to verify a row was actually affected.
    const updateUserTimer = startLatencyTimer();
    const updatedUsers = await db
      .update(users)
      .set({ role: normalizedNewRole })
      .where(eq(users.id, targetUserId))
      .returning({ updatedId: users.id, updatedRole: users.role });
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

    await logAuditAction({
      entityType: 'users',
      entityId: targetUserId,
      actionType: 'UPDATE',
      performedById: currentUser.id,
      oldData: previousUser ? { role: previousUser.role } : { role: null },
      newData: { role: updatedUsers[0].updatedRole },
    });

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
export async function removeUserFromManagedRole(targetUserId: string) {
  return assignUserRole(targetUserId, 'Employee');
}
