'use server';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { 
  assetDisposals, 
  assetPurchases, 
  assets, 
  users, 
  models, 
  categories, 
  brands, 
  systemAuditLogs,
  maintenanceTickets,
  assetDocuments,
  assetAssignments,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { uploadFileToStorage } from '@/lib/storage'; 
import { isValidUuid } from '@/lib/auth/uuid';
import { getAssetFinancialVitals } from '@/actions/asset-financial-vitals';

import { executeDisposalSchema, rejectDisposalSchema } from '@/lib/validations/disposals';
import type { DisposalReviewDetails, DisposalFormState } from '@/types/disposals';

// ============================================================================
// AUTHORIZATION & VALIDATION HELPERS
// ============================================================================

function assertAllowed(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }
}

function normalizeDisposalIds(ids: number[]): number[] {
  return [...new Set(
    ids.filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function normalizeAssetIds(ids: string[]): string[] {
  return [...new Set(
    ids.filter((id) => isValidUuid(id))
  )];
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getDisposalReviewDetails(disposalId: number): Promise<DisposalReviewDetails> {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin']);

  if (!Number.isFinite(disposalId) || disposalId <= 0) {
    throw new Error('Invalid disposal id.');
  }

  try {
    const queryTimer = startLatencyTimer();

    const rows = await db
      .select({
        disposalId: assetDisposals.id,
        assetId: assets.id,
        assetTag: assets.assetTag,
        assetName: assets.name,
        serialNumber: assets.serialNumber, 
        createdAt: assets.createdAt,
        categoryName: categories.name,
        brandName: brands.name,
        requestedBy: users.name,
        requestedAt: assetDisposals.requestedAt,
        reason: assetDisposals.reason,
        justification: assetDisposals.justification,
        purchaseDate: assetPurchases.purchaseDate,
        totalCost: assetPurchases.totalCost,
        basePrice: assetPurchases.basePrice,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assetDisposals)
      .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
      .innerJoin(users, eq(assetDisposals.requestedById, users.id))
      .leftJoin(assetPurchases, eq(assetPurchases.assetId, assets.id))
      .leftJoin(models, eq(assets.modelId, models.id))
      .leftJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(brands, eq(models.brandId, brands.id))
      .where(eq(assetDisposals.id, disposalId))
      .orderBy(desc(assetPurchases.createdAt))
      .limit(1);

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.getDisposalReviewDetails.query',
      startTime: queryTimer,
      metadata: { disposalId },
    });

    const row = rows[0];
    if (!row) {
      throw new Error('Disposal request not found.');
    }

    const originalCostRaw = row.totalCost ?? row.basePrice ?? null;
    const originalCost = originalCostRaw === null ? null : Number(originalCostRaw);

    let warrantyStatus: DisposalReviewDetails['warrantyStatus'] = 'Unknown';
    if (row.warrantyExpiry) {
      const expiry = new Date(row.warrantyExpiry);
      warrantyStatus = expiry.getTime() >= Date.now() ? 'Valid' : 'Expired';
    }

    const details: DisposalReviewDetails = {
      disposalId: row.disposalId,
      assetId: row.assetId,
      assetTag: row.assetTag,
      assetName: row.assetName,
      serialNumber: row.serialNumber,
      category: row.categoryName ?? 'Unknown',
      brand: row.brandName ?? 'Unknown',
      requestedBy: row.requestedBy,
      requestedAt: row.requestedAt.toISOString(),
      reason: row.reason,
      justification: row.justification ?? null,
      dateCreated: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      purchaseDate: row.purchaseDate ? new Date(row.purchaseDate).toISOString() : null,
      originalCost,
      currentBookValue: null, // Placeholder
      warrantyStatus,
    };

    // Fetch real-time book value from centralized financial module
    try {
      const vitals = await getAssetFinancialVitals(row.assetId);
      details.currentBookValue = vitals.currentBookValue;
    } catch (e) {
      console.warn(`[getDisposalReviewDetails] Could not fetch book value for asset ${row.assetId}:`, e);
    }

    return details;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.getDisposalReviewDetails',
      startTime: actionTimer,
    });
  }
}

// ============================================================================
// BULK DISPOSAL REQUESTS
// ============================================================================

export async function createBulkDisposalRequests(input: {
  assetIds: string[];
  reason: string;
  justification?: string;
}) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['ITOperator', 'GlobalAdmin']);

  const normalizedAssetIds = normalizeAssetIds(input.assetIds);
  const reason = input.reason?.trim();
  const justification = input.justification?.trim() || null;

  if (normalizedAssetIds.length === 0) throw new Error('Select at least one asset.');
  if (!reason) throw new Error('Reason is required.');

  try {
    const checkTimer = startLatencyTimer();

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
      metadata: { selected: normalizedAssetIds.length, existing: existing.length },
    });

    const existingSet = new Set(existing.map((r) => r.assetId));
    const toInsert = normalizedAssetIds.filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      throw new Error('All selected assets already have a pending disposal request.');
    }

    // Transactional bulk insert + asset status update + audit logging
    const result = await db.transaction(async (tx) => {
      const insertTimer = startLatencyTimer();

      const insertedDisposals = await tx.insert(assetDisposals).values(
        toInsert.map((assetId) => ({
          assetId,
          requestedById: user.id,
          reason,
          justification,
          status: 'Pending Approval' as const,
          requestedAt: new Date(),
        }))
      ).returning({ id: assetDisposals.id, assetId: assetDisposals.assetId });

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

      return { inserted: toInsert.length };
    });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return {
      success: true as const,
      inserted: result.inserted,
      skipped: input.assetIds.length - result.inserted,
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.bulk_request',
      startTime: actionTimer,
    });
  }
}

// ============================================================================
// REJECT DISPOSAL REQUESTS
// ============================================================================

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
    rejectionReason: formData.get('rejectionReason'),
    fallbackStatus: formData.get('fallbackStatus'),
    maintenanceIssue: formData.get('maintenanceIssue'),
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
    maintenanceIssue
  } = parsed.data;

  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return { success: false, message: 'FORBIDDEN: Only admins can reject disposals.' };
  }

  // Normalize and deduplicate
  const normalizedDisposalIds = normalizeDisposalIds(validDisposalIds);
  const normalizedAssetIds = normalizeAssetIds(validAssetIds);

  if (normalizedDisposalIds.length === 0 || normalizedAssetIds.length === 0) {
    return { success: false, message: 'No valid disposal or asset IDs provided.' };
  }

  if (normalizedDisposalIds.length !== normalizedAssetIds.length) {
    return { success: false, message: 'Disposal and asset ID counts do not match.' };
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
      const allPending = existingDisposals.every((d) => d.status === 'Pending Approval');
      if (!allPending) {
        throw new Error('One or more requested disposals are not eligible for rejection.');
      }

      // 2. Verify asset IDs match disposal records (prevent tampering)
      const disposalAssetIds = existingDisposals.map((d) => d.assetId);
      const requestedAssetIdSet = new Set(normalizedAssetIds);

      if (
        disposalAssetIds.length !== normalizedAssetIds.length ||
        !disposalAssetIds.every((id) => requestedAssetIdSet.has(id))
      ) {
        throw new Error('Submitted assets do not match the selected disposal requests.');
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

      const assetStatusMap = new Map(currentAssets.map((a) => [a.id, a.status]));

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
          isArchived: false,  // ⭐ Soft delete reversal - asset is no longer archived
          updatedAt: new Date(),
        })
        .where(inArray(assets.id, normalizedAssetIds))
        .returning({ id: assets.id });
        
      if (updatedAssets.length !== normalizedAssetIds.length) {
        throw new Error('Failed to revert asset statuses.');
      }

      // 5b. Create Maintenance Tickets for 'In Repair' Assets
      if (validFallbackStatus === 'In Repair') {
        const issueText = maintenanceIssue?.trim() || `Automated Routing - Disposal Rejected. Reason: ${normalizedReason}`;
        
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
          isArchived: true,  // Was marked for archival
        },
        newValue: {
          status: validFallbackStatus,
          isArchived: false,  // ⭐ Soft delete reversed
          disposalRejected: true,
          rejectionReason: normalizedReason,
        },
        performedAt: new Date(),
      }));

      await tx.insert(systemAuditLogs).values(auditEntries);

      return { updatedCount: updatedDisposals.length };
    });

    logLatency({ scope: 'DB ACTION', label: 'disposals.reject', startTime: dbTimer });

    revalidatePath('/operations/disposals');
    revalidatePath('/operations/maintenance');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return { 
      success: true, 
      message: `${result.updatedCount} disposal request(s) rejected successfully.` 
    };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to reject disposal requests.' 
    };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.reject', startTime: actionTimer });
  }
}

// ============================================================================
// UPLOAD DISPOSAL RECEIPT
// ============================================================================

export async function uploadDisposalReceipt(formData: FormData) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return { success: false, message: 'FORBIDDEN: Only admins can upload disposal receipts.' };
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No file provided in the payload.');

    const storageTimer = startLatencyTimer();
    const uploadedUrl = await uploadFileToStorage(file, 'disposals');
    
    logLatency({ scope: 'STORAGE', label: 'disposals.uploadReceipt', startTime: storageTimer });

    return { 
      success: true, 
      url: uploadedUrl,     
      fileUrl: uploadedUrl  
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Upload failed.' 
    };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.uploadReceipt', startTime: actionTimer });
  }
}

// ============================================================================
// EXECUTE ASSET DISPOSAL
// ============================================================================

export async function executeAssetDisposal(
  _prevState: DisposalFormState,
  formData: FormData
): Promise<DisposalFormState> {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return { success: false, message: 'FORBIDDEN: Only admins can execute disposals.' };
  }

  try {
    // Parse and validate JSON payloads
    let parsedDisposalIds: number[];
    let parsedAssetIds: string[];
    let parsedReceiptUrls: string[];

    try {
      parsedDisposalIds = JSON.parse(String(formData.get('disposalIds') || '[]'));
      parsedAssetIds = JSON.parse(String(formData.get('assetIds') || '[]'));
      parsedReceiptUrls = JSON.parse(String(formData.get('receiptUrls') || '[]'));
    } catch {
      return { success: false, message: 'Invalid payload format.' };
    }

    // Validate schema
    const parsed = executeDisposalSchema.safeParse({
      disposalIds: parsedDisposalIds,
      assetIds: parsedAssetIds,
      reason: formData.get('reason'),
      disposalDate: formData.get('disposalDate') || undefined,
      disposalMethod: formData.get('disposalMethod'),
      dataWiped: formData.get('dataWiped') === 'true',
      tagsRemoved: formData.get('tagsRemoved') === 'true',
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

    // Normalize and deduplicate
    const normalizedDisposalIds = normalizeDisposalIds(validData.disposalIds);
    const normalizedAssetIds = normalizeAssetIds(validData.assetIds);

    if (normalizedDisposalIds.length === 0 || normalizedAssetIds.length === 0) {
      return { success: false, message: 'No valid disposal or asset IDs provided.' };
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
      const allowedExecutionStatuses: readonly string[] = ['Pending Approval', 'Approved'];

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
        throw new Error('One or more disposal requests are not in an eligible status.');
      }

      // Asset ID mapping verification
      const disposalAssetIds = disposalRecords.map((d) => d.assetId);
      const requestedAssetIdSet = new Set(normalizedAssetIds);

      if (
        disposalAssetIds.length !== normalizedAssetIds.length ||
        !disposalAssetIds.every((id) => requestedAssetIdSet.has(id))
      ) {
        throw new Error('Submitted assets do not match the selected disposal requests.');
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

      const assetStatusMap = new Map(currentAssets.map((a) => [a.id, a.status]));

      // 4. Execute disposal: update disposal records
      const updatedDisposals = await tx
        .update(assetDisposals)
        .set({
          status: 'Completed',
          approvedById: user.id,
          resolvedAt: validData.disposalDate ? new Date(validData.disposalDate) : new Date(),
          reason: validData.reason, 
        })
        .where(inArray(assetDisposals.id, normalizedDisposalIds))
        .returning({ disposalId: assetDisposals.id });

      if (updatedDisposals.length !== normalizedDisposalIds.length) {
        throw new Error('Failed to update all disposal requests.');
      }

      // 5. Execute disposal: update asset statuses + SET is_archived = true
      // ⭐ KEY UPDATE: Set is_archived = true when disposal is completed
      const updatedAssets = await tx
        .update(assets)
        .set({ 
          status: 'Disposed',
          isArchived: true,  // ⭐ Soft delete - archive the asset
          updatedAt: new Date() 
        })
        .where(inArray(assets.id, normalizedAssetIds))
        .returning({ assetId: assets.id });

      if (updatedAssets.length !== normalizedAssetIds.length) {
        throw new Error('Failed to update all assets.');
      }

      // 5b. Save uploaded disposal certificates/receipts
      const documentEntries = normalizedAssetIds.flatMap((assetId) => 
        validData.receiptUrls.map((url) => ({
          assetId,
          documentType: 'disposal-certificate',
          fileUrl: url,
          uploadedById: user.id,
          uploadedAt: new Date(),
        }))
      );

      if (documentEntries.length > 0) {
        await tx.insert(assetDocuments).values(documentEntries);
      }

      // 6. Log comprehensive audit trail
      const auditEntries = normalizedAssetIds.map((assetId) => ({
        entityType: 'Asset' as const,
        entityId: assetId,
        actionType: 'ASSET_DISPOSED',
        performedById: user.id,
        oldValue: {
          status: assetStatusMap.get(assetId) || 'Unknown',
          isArchived: false,  // Was active
        },
        newValue: {
          status: 'Disposed',
          isArchived: true,  // ⭐ Now archived
          disposalMethod: validData.disposalMethod,
          disposalDate: validData.disposalDate || new Date().toISOString(),
          dataWiped: validData.dataWiped,
          tagsRemoved: validData.tagsRemoved,
          receiptUrl: validData.receiptUrl,
          reason: validData.reason,
        },
        performedAt: new Date(),
      }));

      await tx.insert(systemAuditLogs).values(auditEntries);

      return { disposedCount: updatedAssets.length };
    });

    logLatency({ scope: 'DB ACTION', label: 'disposals.executeAssetDisposal', startTime: dbTimer });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');
    
    return { 
      success: true, 
      message: `${result.disposedCount} asset(s) disposed successfully.` 
    };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Database error: Failed to execute disposal.' 
    };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.executeAssetDisposal', startTime: actionTimer });
  }
}