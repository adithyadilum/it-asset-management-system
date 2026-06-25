'use server';

import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import {  enforceActionAccess } from '@/actions/auth';
import { db } from '@/db';
import {
  assetDisposals,
  assets,
  systemAuditLogs,
  assetAssignments,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { normalizeAssetIds } from '@/actions/disposals/utils';
import {  canManageAssets } from '@/lib/auth/roles';
import { createDisposalRequestSchema } from '@/lib/validations/disposals';

export async function createDisposalRequest(input: {
  assetIds: string[];
  reason: string;
  justification?: string;
}) {
  const actionTimer = startLatencyTimer();
  const user = await enforceActionAccess(canManageAssets);

  // ── Zod validation ────────────────────────────────────────────────────────
  const parsed = createDisposalRequestSchema.safeParse({
    assetIds: input.assetIds,
    reason: input.reason,
    justification: input.justification,
  });

  if (!parsed.success) {
    const firstError =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      'Validation failed.';
    throw new Error(firstError);
  }

  const { assetIds: rawAssetIds, reason, justification } = parsed.data;

  // Normalize and deduplicate (filter invalid UUIDs that slipped past Zod coercion)
  const normalizedAssetIds = normalizeAssetIds(rawAssetIds);

  if (normalizedAssetIds.length === 0)
    throw new Error('Select at least one valid asset.');

  try {
    const checkTimer = startLatencyTimer();

    const invalidAssets = await db
      .select({ id: assets.id, assetTag: assets.assetTag })
      .from(assets)
      .where(
        and(
          inArray(assets.id, normalizedAssetIds),
          or(
            eq(assets.status, 'Disposed'),
            eq(assets.isArchived, true)
          )
        )
      );

    if (invalidAssets.length > 0) {
      const tags = invalidAssets.map(a => a.assetTag).join(', ');
      throw new Error(`Cannot request disposal: Assets [${tags}] are already disposed or archived.`);
    }

    const existing = await db
      .select({ assetId: assetDisposals.assetId })
      .from(assetDisposals)
      .where(
        and(
          eq(assetDisposals.status, 'Pending Approval'),
          inArray(assetDisposals.assetId, normalizedAssetIds)
        )
      );

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.bulk_request.check_existing',
      startTime: checkTimer,
      metadata: {
        selected: normalizedAssetIds.length,
        existing: existing.length,
      },
    });

    const existingSet = new Set(existing.map((r) => r.assetId));
    const toInsert = normalizedAssetIds.filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      throw new Error(
        'All selected assets already have a pending disposal request.'
      );
    }

    // Transactional bulk insert + asset status update + audit logging
    const result = await db.transaction(async (tx) => {
      const insertTimer = startLatencyTimer();

      const insertedDisposals = await tx
        .insert(assetDisposals)
        .values(
          toInsert.map((assetId) => ({
            assetId,
            requestedById: user.id,
            reason,
            justification,
            status: 'Pending Approval' as const,
            requestedAt: new Date(),
          }))
        )
        .returning({ id: assetDisposals.id, assetId: assetDisposals.assetId });

      logLatency({
        scope: 'DB ACTION',
        label: 'disposals.bulk_request.insert',
        startTime: insertTimer,
        metadata: { inserted: insertedDisposals.length },
      });

      if (insertedDisposals.length !== toInsert.length) {
        throw new Error('Failed to insert all disposal requests.');
      }

      // Update asset status in same transaction
      const updateTimer = startLatencyTimer();
      const updatedAssets = await tx
        .update(assets)
        .set({ status: 'Pending Disposal', updatedAt: new Date() })
        .where(inArray(assets.id, toInsert))
        .returning({ id: assets.id });

      logLatency({
        scope: 'DB ACTION',
        label: 'disposals.bulk_request.update_assets_status',
        startTime: updateTimer,
        metadata: { updated: updatedAssets.length },
      });

      if (updatedAssets.length !== toInsert.length) {
        throw new Error('Failed to update asset statuses.');
      }

      // Automatically terminate active assignments for assets requested for disposal
      await tx
        .update(assetAssignments)
        .set({ returnedDate: new Date() })
        .where(
          and(
            inArray(assetAssignments.assetId, toInsert),
            isNull(assetAssignments.returnedDate)
          )
        );

      // Log audit entries for each asset
      const auditTimer = startLatencyTimer();
      const auditEntries = toInsert.map((assetId) => ({
        entityType: 'Asset' as const,
        entityId: assetId,
        actionType: 'DISPOSAL_REQUESTED',
        performedById: user.id,
        newValue: {
          status: 'Pending Disposal',
          disposalReason: reason,
          disposalJustification: justification,
        },
        performedAt: new Date(),
      }));

      await tx.insert(systemAuditLogs).values(auditEntries);

      logLatency({
        scope: 'DB ACTION',
        label: 'disposals.bulk_request.audit_log',
        startTime: auditTimer,
        metadata: { entries: auditEntries.length },
      });

      return {
        inserted: toInsert.length,
        insertedDisposals,
      };
    });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    result.insertedDisposals.forEach((disposal) => {
      void dispatchWebhookEvent('disposal.requested', {
        disposalId: disposal.id,
        assetId: disposal.assetId,
        reason,
        justification,
        requestedById: user.id,
      });
    });

    // skipped = valid assets that were not inserted (already pending)
    // Uses normalizedAssetIds (not raw input) so malformed IDs don't inflate the count
    return {
      success: true as const,
      inserted: result.inserted,
      skipped: normalizedAssetIds.length - result.inserted,
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.bulk_request',
      startTime: actionTimer,
    });
  }
}