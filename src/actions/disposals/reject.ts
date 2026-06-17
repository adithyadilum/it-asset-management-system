'use server';

import { inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import {
  assetDisposals,
  assets,
  systemAuditLogs,
  maintenanceTickets,
} from '@/db/schema';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { rejectDisposalSchema } from '@/lib/validations/disposals';
import type { DisposalFormState } from '@/types/disposals';
import { normalizeDisposalIds, normalizeAssetIds } from '@/actions/disposals/utils';

export async function rejectDisposalRequest(
  _prevState: DisposalFormState,
  formData: FormData
): Promise<DisposalFormState> {
  const actionTimer = startLatencyTimer();

  let parsedDisposalIds: number[];
  let parsedAssetIds: string[];

  // Safe JSON parsing
  try {
    parsedDisposalIds = JSON.parse(String(formData.get('disposalIds') || '[]'));
    parsedAssetIds = JSON.parse(String(formData.get('assetIds') || '[]'));
  } catch {
    return { success: false, message: 'Invalid payload format for IDs.' };
  }

  // Validate schema
  const parsed = rejectDisposalSchema.safeParse({
    disposalIds: parsedDisposalIds,
    assetIds: parsedAssetIds,
    rejectionReason: formData.get('rejectionReason')?.toString() || '',
    fallbackStatus: formData.get('fallbackStatus')?.toString() || '',
    maintenanceIssue: formData.get('maintenanceIssue')?.toString() || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    disposalIds: validDisposalIds,
    assetIds: validAssetIds,
    rejectionReason: normalizedReason,
    fallbackStatus: validStatus,
    maintenanceIssue,
  } = parsed.data;

  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return {
      success: false,
      message: 'FORBIDDEN: Only admins can reject disposals.',
    };
  }

  // Normalize and deduplicate
  const normalizedDisposalIds = normalizeDisposalIds(validDisposalIds);
  const normalizedAssetIds = normalizeAssetIds(validAssetIds);

  if (normalizedDisposalIds.length === 0 || normalizedAssetIds.length === 0) {
    return {
      success: false,
      message: 'No valid disposal or asset IDs provided.',
    };
  }

  if (normalizedDisposalIds.length !== normalizedAssetIds.length) {
    return {
      success: false,
      message: 'Disposal and asset ID counts do not match.',
    };
  }

  try {
    const dbTimer = startLatencyTimer();

    // Atomic transaction: verify, reject, revert asset status, audit
    const result = await db.transaction(async (tx) => {
      // 1. Verify all disposal records exist and are in correct state
      const existingDisposals = await tx
        .select({
          id: assetDisposals.id,
          assetId: assetDisposals.assetId,
          status: assetDisposals.status,
        })
        .from(assetDisposals)
        .where(inArray(assetDisposals.id, normalizedDisposalIds));

      if (existingDisposals.length !== normalizedDisposalIds.length) {
        throw new Error('One or more disposal requests could not be found.');
      }

      // Verify all are in 'Pending Approval' state
      const allPending = existingDisposals.every(
        (d) => d.status === 'Pending Approval'
      );
      if (!allPending) {
        throw new Error(
          'One or more requested disposals are not eligible for rejection.'
        );
      }

      // 2. Verify asset IDs match disposal records (prevent tampering)
      const disposalAssetIds = existingDisposals.map((d) => d.assetId);
      const requestedAssetIdSet = new Set(normalizedAssetIds);

      if (
        disposalAssetIds.length !== normalizedAssetIds.length ||
        !disposalAssetIds.every((id) => requestedAssetIdSet.has(id))
      ) {
        throw new Error(
          'Submitted assets do not match the selected disposal requests.'
        );
      }

      // 3. Fetch current asset data for audit trail
      const currentAssets = await tx
        .select({
          id: assets.id,
          status: assets.status,
          isArchived: assets.isArchived,
        })
        .from(assets)
        .where(inArray(assets.id, normalizedAssetIds));

      const assetStatusMap = new Map(
        currentAssets.map((a) => [a.id, a.status])
      );

      // 4. Update disposal records
      const updatedDisposals = await tx
        .update(assetDisposals)
        .set({
          status: 'Rejected',
          approvedById: user.id,
          resolvedAt: new Date(),
          rejectionReason: normalizedReason,
        })
        .where(inArray(assetDisposals.id, normalizedDisposalIds))
        .returning({ id: assetDisposals.id });

      if (updatedDisposals.length !== normalizedDisposalIds.length) {
        throw new Error('Failed to reject all disposal requests.');
      }

      // 5. Revert asset statuses + UNSET is_archived (soft delete reversal)
      // ⭐ KEY UPDATE: Ensure is_archived = false when rejection happens
      const validFallbackStatus = validStatus as 'Available' | 'In Repair';
      const updatedAssets = await tx
        .update(assets)
        .set({
          status: validFallbackStatus,
          isArchived: false, // ⭐ Soft delete reversal - asset is no longer archived
          updatedAt: new Date(),
        })
        .where(inArray(assets.id, normalizedAssetIds))
        .returning({ id: assets.id });

      if (updatedAssets.length !== normalizedAssetIds.length) {
        throw new Error('Failed to revert asset statuses.');
      }

      // 5b. Create Maintenance Tickets for 'In Repair' Assets
      if (validFallbackStatus === 'In Repair') {
        const issueText =
          maintenanceIssue?.trim() ||
          `Automated Routing - Disposal Rejected. Reason: ${normalizedReason}`;

        const maintenanceEntries = normalizedAssetIds.map((assetId) => ({
          assetId: assetId,
          ticketType: 'INTERNAL' as const,
          reportedIssue: issueText,
          status: 'ACTIVE' as const,
          dispatchedById: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(maintenanceTickets).values(maintenanceEntries);
      }

      // 6. Log audit trail
      const auditEntries = normalizedAssetIds.map((assetId) => ({
        entityType: 'Asset' as const,
        entityId: assetId,
        actionType: 'DISPOSAL_REJECTED',
        performedById: user.id,
        oldValue: {
          status: assetStatusMap.get(assetId) || 'Pending Disposal',
          isArchived: true, // Was marked for archival
        },
        newValue: {
          status: validFallbackStatus,
          isArchived: false, // ⭐ Soft delete reversed
          disposalRejected: true,
          rejectionReason: normalizedReason,
        },
        performedAt: new Date(),
      }));

      await tx.insert(systemAuditLogs).values(auditEntries);

      return { updatedCount: updatedDisposals.length };
    });

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.reject',
      startTime: dbTimer,
    });

    revalidatePath('/operations/disposals');
    revalidatePath('/operations/maintenance');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return {
      success: true,
      message: `${result.updatedCount} disposal request(s) rejected successfully.`,
    };
  } catch (error) {
    logError({ scope: 'ACTION', label: 'disposals.reject', error });
    const KNOWN_REJECT_ERRORS = [
      'One or more disposal requests could not be found.',
      'One or more requested disposals are not eligible for rejection.',
      'Submitted assets do not match the selected disposal requests.',
      'Failed to reject all disposal requests.',
      'Failed to revert asset statuses.',
    ];
    const isKnown =
      error instanceof Error && KNOWN_REJECT_ERRORS.includes(error.message);
    return {
      success: false,
      message: isKnown && error instanceof Error
        ? error.message
        : 'Failed to reject disposal requests.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.reject',
      startTime: actionTimer,
    });
  }
}
