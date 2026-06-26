'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { softwareLicenses, softwareAllocations } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logAuditActionTx } from '@/lib/audit';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

export type AllocateSoftwareResult =
  | { success: true; allocatedCount: number }
  | { success: false; error: string };

export type RevokeSoftwareAllocationResult =
  | { success: true }
  | { success: false; error: string };

export async function allocateSoftwareLicensesAction(assetId: string, userIds: string[]): Promise<AllocateSoftwareResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return { success: false, error: 'Unauthorized: Please sign in.' };
  }

  if (!canManageAssets(currentUser.role)) {
    return { success: false, error: 'Forbidden: You do not have permission to allocate software.' };
  }

  if (!userIds.length) {
    return { success: false, error: 'No users selected.' };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get the software license for this asset
      const license = await tx.query.softwareLicenses.findFirst({
        where: eq(softwareLicenses.assetId, assetId),
        with: {
          allocations: {
            where: (allocations, { isNull }) => isNull(allocations.revokedAt),
          }
        }
      });

      if (!license) {
        throw new Error('Software license not found for this asset.');
      }

      // 2. Validate available seats
      const currentAllocations = license.allocations.length;
      const availableSeats = license.totalSeats - currentAllocations;

      if (userIds.length > availableSeats) {
        throw new Error(`Cannot allocate ${userIds.length} users. Only ${availableSeats} seats available.`);
      }

      // Prevent duplicates
      const alreadyAssignedUserIds = license.allocations.map(a => a.assignedToUserId);
      const newUsers = userIds.filter(uid => !alreadyAssignedUserIds.includes(uid));

      if (!newUsers.length) {
        throw new Error('All selected users are already allocated to this software.');
      }

      // 3. Create allocations
      const insertValues = newUsers.map(uid => ({
        licenseId: license.id,
        assignedToUserId: uid,
      }));

      await tx.insert(softwareAllocations).values(insertValues);

      // 4. Audit Log
      await logAuditActionTx(tx, {
        entityType: 'SoftwareLicense',
        entityId: license.id,
        actionType: 'ASSIGN',
        performedById: currentUser.id,
        newData: { allocatedUsers: newUsers },
      });

      return { success: true as const, allocatedCount: newUsers.length };
    });

    revalidatePath('/assets');
    revalidatePath('/assets/software');
    revalidatePath('/my-assets');
    revalidateTag('dashboard-kpis', 'max');
    
    return result;
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'software.allocateSoftwareLicensesAction',
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to allocate software licenses.'
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'software.allocateSoftwareLicensesAction',
      startTime: actionTimer,
    });
  }
}

export async function revokeSoftwareLicenseAllocationAction(
  assetId: string,
  userId: string
): Promise<RevokeSoftwareAllocationResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return { success: false, error: 'Unauthorized: Please sign in.' };
  }

  if (!canManageAssets(currentUser.role)) {
    return { success: false, error: 'Forbidden: You do not have permission to revoke software allocations.' };
  }

  if (!assetId || !userId) {
    return { success: false, error: 'Asset and user are required.' };
  }

  try {
    await db.transaction(async (tx) => {
      const license = await tx.query.softwareLicenses.findFirst({
        where: eq(softwareLicenses.assetId, assetId),
      });

      if (!license) {
        throw new Error('Software license not found for this asset.');
      }

      const revokedAt = new Date();
      const [revokedAllocation] = await tx
        .update(softwareAllocations)
        .set({ revokedAt })
        .where(
          and(
            eq(softwareAllocations.licenseId, license.id),
            eq(softwareAllocations.assignedToUserId, userId),
            isNull(softwareAllocations.revokedAt)
          )
        )
        .returning({ id: softwareAllocations.id });

      if (!revokedAllocation) {
        throw new Error('Active software allocation not found for this user.');
      }

      await logAuditActionTx(tx, {
        entityType: 'SoftwareLicense',
        entityId: license.id,
        actionType: 'RETURN',
        performedById: currentUser.id,
        newData: { revokedUser: userId, revokedAt: revokedAt.toISOString() },
      });
    });

    revalidatePath('/assets');
    revalidatePath('/assets/software');
    revalidatePath('/my-assets');
    revalidateTag('dashboard-kpis', 'max');

    return { success: true };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'software.revokeSoftwareLicenseAllocationAction',
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke software allocation.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'software.revokeSoftwareLicenseAllocationAction',
      startTime: actionTimer,
    });
  }
}
