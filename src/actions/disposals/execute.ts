'use server';

import { eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { enforceFormAccess } from '@/actions/auth';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { db } from '@/db';
import {
  assetDisposals,
  assets,
  assetPurchases,
  systemAuditLogs,
  assetDocuments,
} from '@/db/schema';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import {
  calculateCurrentBookValue,
  DEFAULT_USEFUL_LIFE_MONTHS,
} from '@/lib/depreciation';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { executeDisposalSchema } from '@/lib/validations/disposals';
import type { DisposalFormState } from '@/types/disposals';
import {
  normalizeDisposalIds,
  normalizeAssetIds,
} from '@/actions/disposals/utils';

export async function executeAssetDisposal(
  _prevState: DisposalFormState,
  formData: FormData
): Promise<DisposalFormState> {
  const actionTimer = startLatencyTimer();

  // ── 1. Auth FIRST ─────────────────────────────────────────────────────────
  const auth = await enforceFormAccess(isGlobalAdmin);
  if (!auth.ok) return auth.payload;
  const user = auth.user;

  try {
    // ── 2. Parse and validate JSON payloads ──────────────────────────────────
    let parsedDisposalIds: number[];
    let parsedAssetIds: string[];
    let parsedReceiptUrls: string[];

    try {
      parsedDisposalIds = JSON.parse(
        String(formData.get('disposalIds') || '[]')
      );
      parsedAssetIds = JSON.parse(String(formData.get('assetIds') || '[]'));
      parsedReceiptUrls = JSON.parse(
        String(formData.get('receiptUrls') || '[]')
      );
    } catch {
      return { success: false, message: 'Invalid payload format.' };
    }

    // ── 3. Validate schema ───────────────────────────────────────────────────
    const parsed = executeDisposalSchema.safeParse({
      disposalIds: parsedDisposalIds,
      assetIds: parsedAssetIds,
      reason: formData.get('reason')?.toString() || '',
      disposalDate: formData.get('disposalDate')?.toString() || undefined,
      disposalMethod: formData.get('disposalMethod')?.toString() || '',
      dataWiped: formData.get('dataWiped') === 'true',
      tagsRemoved: formData.get('tagsRemoved') === 'true',
      actualSalvageValue:
        formData.get('actualSalvageValue')?.toString() || undefined,
      receiptUrls: parsedReceiptUrls,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const validData = parsed.data;

    // ── 4. Normalize and deduplicate ─────────────────────────────────────────
    const normalizedDisposalIds = normalizeDisposalIds(validData.disposalIds);
    const normalizedAssetIds = normalizeAssetIds(validData.assetIds);

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

    const dbTimer = startLatencyTimer();

    // Atomic transaction: verify, execute, audit
    const result = await db.transaction(async (tx) => {
      const allowedExecutionStatuses: readonly string[] = [
        'Pending Approval',
        'Approved',
      ];

      // 1. Fetch and verify all disposal records
      const disposalRecords = await tx
        .select({
          disposalId: assetDisposals.id,
          assetId: assetDisposals.assetId,
          status: assetDisposals.status,
        })
        .from(assetDisposals)
        .where(inArray(assetDisposals.id, normalizedDisposalIds));

      if (disposalRecords.length !== normalizedDisposalIds.length) {
        throw new Error('One or more disposal requests could not be found.');
      }

      // 2. Verify disposal status and asset ID mapping
      const allEligible = disposalRecords.every((d) =>
        allowedExecutionStatuses.includes(d.status)
      );

      if (!allEligible) {
        throw new Error(
          'One or more disposal requests are not in an eligible status.'
        );
      }

      // Asset ID mapping verification
      const disposalAssetIds = disposalRecords.map((d) => d.assetId);
      const requestedAssetIdSet = new Set(normalizedAssetIds);

      if (
        disposalAssetIds.length !== normalizedAssetIds.length ||
        !disposalAssetIds.every((id) => requestedAssetIdSet.has(id))
      ) {
        throw new Error(
          'Submitted assets do not match the selected disposal requests.'
        );
      }

      // 3. Fetch current asset data for audit
      const currentAssets = await tx
        .select({
          id: assets.id,
          status: assets.status,
          isArchived: assets.isArchived,
        })
        .from(assets)
        .where(inArray(assets.id, disposalAssetIds));

      const assetStatusMap = new Map(
        currentAssets.map((a) => [a.id, a.status])
      );

      // 4. Batch-fetch purchase data for all assets (replaces N+1 getAssetFinancialVitals calls)
      const purchaseData = await tx
        .select({
          assetId: assetPurchases.assetId,
          totalCost: assetPurchases.totalCost,
          purchaseDate: assetPurchases.purchaseDate,
          usefulLifeMonths: sql<number>`COALESCE(${assets.usefulLifeMonths}, ${DEFAULT_USEFUL_LIFE_MONTHS})`,
          salvageValue: assets.salvageValue,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(inArray(assetPurchases.assetId, normalizedAssetIds));

      const bookValuesMap = new Map<string, number>();
      for (const row of purchaseData) {
        const totalCost = parseFloat(row.totalCost?.toString() || '0');
        const salvage = parseFloat(row.salvageValue?.toString() || '0');
        const bookValue = calculateCurrentBookValue({
          cost: totalCost,
          salvageValue: salvage,
          usefulLifeMonths: row.usefulLifeMonths,
          purchaseDate: row.purchaseDate,
        });
        bookValuesMap.set(row.assetId, Math.round(bookValue * 100) / 100);
      }

      const totalSalvage = validData.actualSalvageValue ?? 0;
      const salvagePerAsset =
        normalizedAssetIds.length > 0
          ? totalSalvage / normalizedAssetIds.length
          : 0;

      // 5. Execute disposal: update all disposal records in parallel
      const updatedDisposalIds: number[] = [];
      const updateResults = await Promise.all(
        disposalRecords.map((record) => {
          const bookValue = bookValuesMap.get(record.assetId) ?? 0;
          return tx
            .update(assetDisposals)
            .set({
              status: 'Completed',
              approvedById: user.id,
              resolvedAt: validData.disposalDate
                ? new Date(validData.disposalDate)
                : new Date(),
              reason: validData.reason,
              actualSalvageValue: String(salvagePerAsset.toFixed(2)),
              bookValueAtDisposal: String(bookValue.toFixed(2)),
            })
            .where(eq(assetDisposals.id, record.disposalId))
            .returning({ disposalId: assetDisposals.id });
        })
      );

      for (const res of updateResults) {
        if (res.length > 0) {
          updatedDisposalIds.push(res[0].disposalId);
        }
      }

      if (updatedDisposalIds.length !== normalizedDisposalIds.length) {
        throw new Error('Failed to update all disposal requests.');
      }

      // 6. Update asset statuses + set is_archived = true
      const updatedAssets = await tx
        .update(assets)
        .set({
          status: 'Disposed',
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(inArray(assets.id, normalizedAssetIds))
        .returning({ assetId: assets.id });

      if (updatedAssets.length !== normalizedAssetIds.length) {
        throw new Error('Failed to update all assets.');
      }

      // 7. Save uploaded disposal certificates/receipts (optional)
      //
      // A bulk disposal shares one upload across the batch, so each asset does
      // get a row — that part is intended. What was missing is `disposalId`:
      // without it a document was tied only to an asset, so an asset disposed
      // more than once (rejected, re-requested, completed) showed every receipt
      // it had ever accumulated on every one of its disposal rows.
      const documentEntries = disposalRecords.flatMap((record) =>
        validData.receiptUrls.map((url) => ({
          assetId: record.assetId,
          disposalId: record.disposalId,
          documentType: 'disposal-certificate',
          fileUrl: url,
          uploadedById: user.id,
          uploadedAt: new Date(),
        }))
      );

      if (documentEntries.length > 0) {
        await tx.insert(assetDocuments).values(documentEntries);
      }

      // 8. Log comprehensive audit trail
      const auditEntries = normalizedAssetIds.map((assetId) => ({
        entityType: 'Asset' as const,
        entityId: assetId,
        actionType: 'ASSET_DISPOSED',
        performedById: user.id,
        oldValue: {
          status: assetStatusMap.get(assetId) || 'Unknown',
          isArchived: false,
        },
        newValue: {
          status: 'Disposed',
          isArchived: true,
          disposalMethod: validData.disposalMethod,
          disposalDate: validData.disposalDate || new Date().toISOString(),
          dataWiped: validData.dataWiped,
          tagsRemoved: validData.tagsRemoved,
          // Use the array field (receiptUrls), not the removed singular receiptUrl
          receiptUrls: validData.receiptUrls,
          reason: validData.reason,
        },
        performedAt: new Date(),
      }));

      await tx.insert(systemAuditLogs).values(auditEntries);

      return {
        disposedCount: updatedAssets.length,
        disposalRecords,
      };
    });

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.executeAssetDisposal',
      startTime: dbTimer,
    });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    result.disposalRecords.forEach((disposal) => {
      void dispatchWebhookEvent('disposal.approved', {
        disposalId: disposal.disposalId,
        assetId: disposal.assetId,
        approvedById: user.id,
        disposalMethod: validData.disposalMethod,
      });
    });

    return {
      success: true,
      message: `${result.disposedCount} asset(s) disposed successfully.`,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'disposals.executeAssetDisposal',
      error,
    });

    const KNOWN_ERRORS = [
      'One or more disposal requests could not be found.',
      'One or more disposal requests are not in an eligible status.',
      'Submitted assets do not match the selected disposal requests.',
      'Failed to update all disposal requests.',
      'Failed to update all assets.',
    ];

    if (error instanceof Error && KNOWN_ERRORS.includes(error.message)) {
      return { success: false, message: error.message };
    }

    return { success: false, message: 'Failed to execute asset disposal.' };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.executeAssetDisposal',
      startTime: actionTimer,
    });
  }
}
