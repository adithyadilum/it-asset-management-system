"use server";

import { and, desc, eq, isNull } from 'drizzle-orm';

import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { assetAssignments, assets, models, notificationQueue } from '@/db/schema';
import type { PortalAlerts } from '@/lib/data/portal-repo';
import { acceptAssignmentSchema, rejectAssignmentSchema } from '@/lib/validations/portal';
import { logAuditActionTx } from '@/lib/audit';
import { dispatchAlert } from '@/lib/notifications/dispatcher';

export type EmployeeAssignedAsset = {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  serialNumber: string | null;
  modelName: string;
  status: string;
  assignedDate: string;
};

/**
 * Returns active asset assignments for the currently authenticated employee.
 */
export async function getCurrentEmployeeAssets(): Promise<
  EmployeeAssignedAsset[]
> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error('Unauthorized');
  }
  if (currentUser.role !== 'Employee') {
    throw new Error('Forbidden');
  }

 const startTime = Date.now();
  try {
    const rows = await db
      .select({
        assignmentId: assetAssignments.id,
        assetId: assets.id,
        assetTag: assets.assetTag,
        serialNumber: assets.serialNumber,
        modelName: models.name,
        status: assets.status,
        assignedDate: assetAssignments.assignedDate,
      })
      .from(assetAssignments)
      .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .where(
        and(
          eq(assetAssignments.assignedToUserId, currentUser.id),
          isNull(assetAssignments.returnedDate)
        )
      )
      .orderBy(desc(assetAssignments.assignedDate));
    console.info('getCurrentEmployeeAssets succeeded', {
      userId: currentUser.id,
      durationMs: Date.now() - startTime,
      rowCount: rows.length,
    });
    return rows.map((row) => ({
      ...row,
      assignedDate: row.assignedDate.toISOString(),
    }));
  } catch (error) {
    console.error('getCurrentEmployeeAssets failed', {
      userId: currentUser.id,
      durationMs: Date.now() - startTime,
      error,
    });
    throw new Error('Failed to load your assigned assets.');
  }
}

// ----------------------
// Portal Actions
// ----------------------

export async function acceptAssignmentAction(
  assignmentId: number
): Promise<{ success: boolean; error?: string }>
{
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };
  if (currentUser.role !== 'Employee') return { success: false, error: 'Forbidden' };

  try {
    try {
      acceptAssignmentSchema.parse({ assignmentId });
    } catch (err) {
      if (err instanceof ZodError) return { success: false, error: err.issues[0]?.message };
      throw err;
    }

    // Verify assignment belongs to user and is pending
    const [assignment] = await db
      .select({ id: assetAssignments.id, state: assetAssignments.state, assignedToUserId: assetAssignments.assignedToUserId, assignedById: assetAssignments.assignedById })
      .from(assetAssignments)
      .where(eq(assetAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return { success: false, error: 'Assignment not found' };
    if (String(assignment.assignedToUserId) !== String(currentUser.id)) return { success: false, error: 'Assignment does not belong to the current user' };
    if (assignment.state !== 'pending approval') return { success: false, error: 'Assignment is not pending approval' };

    await db.transaction(async (tx) => {
      await tx
        .update(assetAssignments)
        .set({ state: 'assigned', acceptanceStatus: 'accepted', acceptedAt: new Date() })
        .where(eq(assetAssignments.id, assignmentId));

      await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(eq(notificationQueue.assignmentId, assignmentId));

      await logAuditActionTx(tx, {
        entityType: 'asset_assignment',
        entityId: String(assignmentId),
        actionType: 'ASSIGN',
        performedById: currentUser.id,
        oldData: null,
        newData: { state: 'assigned', acceptanceStatus: 'accepted' },
      });
    });

    // Notify assigning admin
    if (assignment.assignedById) {
      void dispatchAlert({
        eventType: 'ASSIGNMENT_ACCEPTED',
        userId: String(assignment.assignedById),
        title: 'Assignment Accepted',
        message: `Assignment #${assignmentId} was accepted by ${currentUser.name}`,
        targetUrl: '/operations/assignments',
      });
    }

    revalidatePath('/portal/my-assets');
    return { success: true };
  } catch (error) {
    console.error('acceptAssignmentAction failed', error);
    return { success: false, error: 'Failed to accept assignment' };
  }
}

export async function rejectAssignmentAction(
  assignmentId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };
  if (currentUser.role !== 'Employee') return { success: false, error: 'Forbidden' };

  try {
    try {
      rejectAssignmentSchema.parse({ assignmentId, reason });
    } catch (err) {
      if (err instanceof ZodError) return { success: false, error: err.issues[0]?.message };
      throw err;
    }

    const [assignment] = await db
      .select({ id: assetAssignments.id, assetId: assetAssignments.assetId, state: assetAssignments.state, assignedToUserId: assetAssignments.assignedToUserId, assignedById: assetAssignments.assignedById, notes: assetAssignments.notes })
      .from(assetAssignments)
      .where(eq(assetAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return { success: false, error: 'Assignment not found' };
    if (String(assignment.assignedToUserId) !== String(currentUser.id)) return { success: false, error: 'Assignment does not belong to the current user' };
    if (assignment.state !== 'pending approval') return { success: false, error: 'Assignment is not pending approval' };

    const newNotes = (assignment.notes ? `${assignment.notes}\n` : '') + `Rejection reason: ${reason}`;

    await db.transaction(async (tx) => {
      await tx
        .update(assetAssignments)
        .set({ acceptanceStatus: 'rejected', state: 'returned', returnedDate: new Date(), notes: newNotes })
        .where(eq(assetAssignments.id, assignmentId));

      // Mark notification queue processed
      await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(eq(notificationQueue.assignmentId, assignmentId));

      // Make the asset available again
      await tx
        .update(assets)
        .set({ status: 'Available' })
        .where(eq(assets.id, assignment.assetId));

      await logAuditActionTx(tx, {
        entityType: 'asset_assignment',
        entityId: String(assignmentId),
        actionType: 'RETURN',
        performedById: currentUser.id,
        oldData: null,
        newData: { state: 'returned', acceptanceStatus: 'rejected', notes: reason },
      });
    });

    if (assignment.assignedById) {
      void dispatchAlert({
        eventType: 'ASSIGNMENT_DECLINED',
        userId: String(assignment.assignedById),
        title: 'Assignment Rejected',
        message: `Assignment #${assignmentId} was rejected by ${currentUser.name}: ${reason}`,
        targetUrl: '/operations/assignments',
      });
    }

    revalidatePath('/portal/my-assets');
    return { success: true };
  } catch (error) {
    console.error('rejectAssignmentAction failed', error);
    return { success: false, error: 'Failed to reject assignment' };
  }
}

export async function getPortalAlertsAction(): Promise<PortalAlerts> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) throw new Error('Unauthorized');
  if (currentUser.role !== 'Employee') throw new Error('Forbidden');

  // Lazy import to avoid circular dependencies
  const repo = await import('@/lib/data/portal-repo');
  const alerts = (await repo.getPortalAlerts(currentUser.id)) as PortalAlerts;
  return alerts;
}