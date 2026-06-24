'use server';

import { db } from '@/db';
import { departments, users } from '@/db/schema';
import { eq, ilike, or, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { logAuditActionTx } from '@/lib/audit';
import { isValidUuid } from '@/lib/auth/uuid';
import { getAuthenticatedUser } from '@/actions/auth';
import type { UserRole } from '@/types/auth';
import { requireAccess, isGlobalAdmin } from '@/lib/auth/roles';

function normalizeTokenRole(role: unknown): UserRole | null {
  const validRoles: UserRole[] = ['GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee'];
  return validRoles.includes(role as UserRole) ? (role as UserRole) : null;
}

function normalizeTargetUserIds(targetUserIds: string[]): string[] {
  return [...new Set(targetUserIds.filter(isValidUuid))];
}

/**
 * Search for users by name or email.
 */
export async function searchUsers(query: string) {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    throw new Error('Forbidden');
  }
  requireAccess(currentUser, isGlobalAdmin);

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
          isActive: users.isActive,
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
  if (!currentUser) {
    throw new Error('Forbidden');
  }
  requireAccess(currentUser, isGlobalAdmin);

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
    const updatedUsers = await db.transaction(async (tx) => {
      const previousUsers = await tx.query.users.findMany({
        where: inArray(users.id, normalizedTargetUserIds),
        columns: {
          id: true,
          role: true,
        },
      });

      const updateUsersTimer = startLatencyTimer();
      const updated = await tx
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
          updatedCount: updated.length,
        },
      });

      const previousUserById = new Map(
        previousUsers.map((previousUser) => [previousUser.id, previousUser])
      );

      await Promise.all(
        updated.map((updatedUser) => {
          const previousUser = previousUserById.get(updatedUser.updatedId);

          return logAuditActionTx(tx, {
            entityType: 'users',
            entityId: updatedUser.updatedId,
            actionType: 'UPDATE',
            performedById: currentUser.id,
            oldData: previousUser ? { role: previousUser.role } : { role: null },
            newData: { role: updatedUser.updatedRole },
          });
        })
      );

      return updated;
    });

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
  if (!currentUser) {
    throw new Error('Forbidden');
  }
  requireAccess(currentUser, isGlobalAdmin);

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
    const success = await db.transaction(async (tx) => {
      const previousUser = await tx.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: {
          id: true,
          role: true,
        },
      });

      // Use .returning() to verify a row was actually affected.
      const updateUserTimer = startLatencyTimer();
      const updatedUsers = await tx
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
        return false;
      }

      await logAuditActionTx(tx, {
        entityType: 'users',
        entityId: targetUserId,
        actionType: 'UPDATE',
        performedById: currentUser.id,
        oldData: previousUser ? { role: previousUser.role } : { role: null },
        newData: { role: updatedUsers[0].updatedRole },
      });

      return true;
    });

    if (!success) {
      return { success: false, error: 'User not found or no changes made.' };
    }

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

/**
 * Activates or deactivates a user account.
 */
export async function setUserActiveStatus(targetUserId: string, isActive: boolean) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  // Authorization Guard.
  if (!currentUser) {
    throw new Error('Forbidden');
  }
  requireAccess(currentUser, isGlobalAdmin);

  if (!isValidUuid(targetUserId)) {
    throw new Error('Invalid target user id.');
  }

  // Anti-Lockout Guard
  if (targetUserId === currentUser.id) {
    throw new Error('Action Prohibited: You cannot modify your own active status.');
  }

  try {
    const result = await db.transaction(async (tx) => {
      const previousUser = await tx.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: {
          id: true,
          isActive: true,
        },
      });

      if (!previousUser) {
        return { success: false, error: 'User not found.' };
      }

      const updateUserTimer = startLatencyTimer();
      const updatedUsers = await tx
        .update(users)
        .set({ isActive })
        .where(eq(users.id, targetUserId))
        .returning({ updatedId: users.id, updatedIsActive: users.isActive });

      logLatency({
        scope: 'DB ACTION',
        label: 'roles.setUserActiveStatus.update_user_status',
        startTime: updateUserTimer,
        metadata: {
          targetUserId,
          isActive,
        },
      });

      if (updatedUsers.length === 0) {
        return { success: false, error: 'Failed to update user status.' };
      }

      await logAuditActionTx(tx, {
        entityType: 'users',
        entityId: targetUserId,
        actionType: 'UPDATE',
        performedById: currentUser.id,
        oldData: { isActive: previousUser.isActive },
        newData: { isActive: updatedUsers[0].updatedIsActive },
      });

      return { success: true };
    });

    if (result.success) {
      revalidatePath('/settings/roles');
    }
    return result;
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'roles.setUserActiveStatus',
      error,
      metadata: {
        targetUserId,
        isActive,
      },
    });
    return { success: false, error: 'Database update failed.' };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'roles.setUserActiveStatus',
      startTime: actionTimer,
      metadata: {
        targetUserId,
        isActive,
      },
    });
  }
}

