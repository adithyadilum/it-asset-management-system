'use server';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import {
  assetAssignments,
  assets,
  categories,
  models,
  notificationQueue,
  softwareAllocations,
  softwareLicenses,
} from '@/db/schema';
import { getPortalAlerts, type PortalAlerts } from '@/lib/data/portal-repo';
import {
  acceptAssignmentSchema,
  rejectAssignmentSchema,
} from '@/lib/validations/portal';
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
  pillar: string;
};

export type EmployeeSoftwareAsset = {
  allocationId: number;
  assetId: string;
  assetTag: string;
  licenseKey: string | null;
  modelName: string;
  status: string;
  allocatedDate: string;
  licenseType: string;
  pillar: 'Software';
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
        pillar: categories.pillar,
      })
      .from(assetAssignments)
      .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .where(
        and(
          eq(assetAssignments.assignedToUserId, currentUser.id),
          isNull(assetAssignments.returnedDate),
          inArray(assetAssignments.state, ['assigned', 'overdue', 'requested'])
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

/**
 * Returns active software license allocations for the currently authenticated employee.
 */
export async function getCurrentEmployeeSoftwareAssets(): Promise<
  EmployeeSoftwareAsset[]
> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  const startTime = Date.now();
  try {
    const rows = await db
      .select({
        allocationId: softwareAllocations.id,
        assetId: assets.id,
        assetTag: assets.assetTag,
        licenseKey: softwareLicenses.licenseKey,
        modelName: models.name,
        allocatedDate: softwareAllocations.allocatedAt,
        licenseType: softwareLicenses.licenseType,
      })
      .from(softwareAllocations)
      .innerJoin(
        softwareLicenses,
        eq(softwareAllocations.licenseId, softwareLicenses.id)
      )
      .innerJoin(assets, eq(softwareLicenses.assetId, assets.id))
      .innerJoin(models, eq(softwareLicenses.modelId, models.id))
      .where(
        and(
          eq(softwareAllocations.assignedToUserId, currentUser.id),
          isNull(softwareAllocations.revokedAt),
          eq(softwareLicenses.isActive, true)
        )
      )
      .orderBy(desc(softwareAllocations.allocatedAt));

    console.info('getCurrentEmployeeSoftwareAssets succeeded', {
      userId: currentUser.id,
      durationMs: Date.now() - startTime,
      rowCount: rows.length,
    });

    return rows.map((row) => ({
      allocationId: row.allocationId,
      assetId: row.assetId,
      assetTag: row.assetTag,
      licenseKey: row.licenseKey,
      modelName: row.modelName,
      status: 'active',
      allocatedDate: row.allocatedDate.toISOString(),
      licenseType: row.licenseType,
      pillar: 'Software',
    }));
  } catch (error) {
    console.error('getCurrentEmployeeSoftwareAssets failed', {
      userId: currentUser.id,
      durationMs: Date.now() - startTime,
      error,
    });
    throw new Error('Failed to load your software access.');
  }
}

// ----------------------
// Portal Actions
// ----------------------

export async function acceptAssignmentAction(
  assignmentId: number
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  try {
    try {
      acceptAssignmentSchema.parse({ assignmentId });
    } catch (err) {
      if (err instanceof ZodError)
        return { success: false, error: err.issues[0]?.message };
      throw err;
    }

    // Verify assignment belongs to user and is pending
    const [assignment] = await db
      .select({
        id: assetAssignments.id,
        state: assetAssignments.state,
        assignedToUserId: assetAssignments.assignedToUserId,
        assignedById: assetAssignments.assignedById,
      })
      .from(assetAssignments)
      .where(eq(assetAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return { success: false, error: 'Assignment not found' };
    if (String(assignment.assignedToUserId) !== String(currentUser.id))
      return {
        success: false,
        error: 'Assignment does not belong to the current user',
      };
    if (assignment.state !== 'pending approval')
      return { success: false, error: 'Assignment is not pending approval' };

    await db.transaction(async (tx) => {
      const [updatedAssignment] = await tx
        .update(assetAssignments)
        .set({
          state: 'assigned',
          acceptanceStatus: 'accepted',
          acceptedAt: new Date(),
        })
        .where(
          and(
            eq(assetAssignments.id, assignmentId),
            eq(assetAssignments.state, 'pending approval')
          )
        )
        .returning({ id: assetAssignments.id });

      if (!updatedAssignment) {
        throw new Error('Assignment is no longer pending approval');
      }

      const processedNotifications = await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(
          and(
            eq(notificationQueue.assignmentId, assignmentId),
            eq(notificationQueue.recipientId, currentUser.id)
          )
        )
        .returning({ id: notificationQueue.id });

      if (processedNotifications.length === 0) {
        console.warn(
          'No employee notification queue rows were updated for accepted assignment',
          {
            assignmentId,
            employeeId: currentUser.id,
          }
        );
      }

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
      try {
        await dispatchAlert({
          eventType: 'ASSIGNMENT_ACCEPTED',
          userId: String(assignment.assignedById),
          title: 'Assignment Accepted',
          message: `Assignment #${assignmentId} was accepted by ${currentUser.name}`,
          targetUrl: '/operations/assignments',
        });
      } catch (error) {
        console.error('Failed to dispatch assignment accepted alert', error);
      }
    }

    revalidatePath('/dashboard');
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

  try {
    try {
      rejectAssignmentSchema.parse({ assignmentId, reason });
    } catch (err) {
      if (err instanceof ZodError)
        return { success: false, error: err.issues[0]?.message };
      throw err;
    }

    const [assignment] = await db
      .select({
        id: assetAssignments.id,
        assetId: assetAssignments.assetId,
        state: assetAssignments.state,
        assignedToUserId: assetAssignments.assignedToUserId,
        assignedById: assetAssignments.assignedById,
        notes: assetAssignments.notes,
      })
      .from(assetAssignments)
      .where(eq(assetAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) return { success: false, error: 'Assignment not found' };
    if (String(assignment.assignedToUserId) !== String(currentUser.id))
      return {
        success: false,
        error: 'Assignment does not belong to the current user',
      };
    if (assignment.state !== 'pending approval')
      return { success: false, error: 'Assignment is not pending approval' };

    const newNotes =
      (assignment.notes ? `${assignment.notes}\n` : '') +
      `Rejection reason: ${reason}`;

    await db.transaction(async (tx) => {
      const [updatedAssignment] = await tx
        .update(assetAssignments)
        .set({
          acceptanceStatus: 'rejected',
          state: 'returned',
          returnedDate: new Date(),
          notes: newNotes,
        })
        .where(
          and(
            eq(assetAssignments.id, assignmentId),
            eq(assetAssignments.state, 'pending approval')
          )
        )
        .returning({ id: assetAssignments.id });

      if (!updatedAssignment) {
        throw new Error('Assignment is no longer pending approval');
      }

      // Mark notification queue processed
      const processedNotifications = await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(
          and(
            eq(notificationQueue.assignmentId, assignmentId),
            eq(notificationQueue.recipientId, currentUser.id)
          )
        )
        .returning({ id: notificationQueue.id });

      if (processedNotifications.length === 0) {
        console.warn(
          'No employee notification queue rows were updated for rejected assignment',
          {
            assignmentId,
            employeeId: currentUser.id,
          }
        );
      }

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
        newData: {
          state: 'returned',
          acceptanceStatus: 'rejected',
          notes: reason,
        },
      });
    });

    if (assignment.assignedById) {
      try {
        await dispatchAlert({
          eventType: 'ASSIGNMENT_DECLINED',
          userId: String(assignment.assignedById),
          title: 'Assignment Rejected',
          message: `Assignment #${assignmentId} was rejected by ${currentUser.name}: ${reason}`,
          targetUrl: '/operations/assignments',
        });
      } catch (error) {
        console.error('Failed to dispatch assignment rejected alert', error);
      }
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('rejectAssignmentAction failed', error);
    return { success: false, error: 'Failed to reject assignment' };
  }
}

export async function getPortalAlertsAction(): Promise<PortalAlerts> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) throw new Error('Unauthorized');

  return getPortalAlerts(currentUser.id);
}
