'use server';

import { and, desc, eq, inArray } from 'drizzle-orm';
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
  systemAuditLogs 
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { uploadFileToStorage } from '@/lib/storage'; 

// Import Zod validations
import { executeDisposalSchema, rejectDisposalSchema } from '@/lib/validations/disposals';

// Import Types
import type { DisposalReviewDetails, DisposalFormState } from '@/types/disposals';


function assertAllowed(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }
}

export async function getDisposalReviewDetails(disposalId: number): Promise<DisposalReviewDetails> {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin']);

  if (!Number.isFinite(disposalId)) {
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
        // Added serialNumber to support the UI review panel requirement
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
      serialNumber: row.serialNumber, // Mapped here
      category: row.categoryName ?? 'Unknown',
      brand: row.brandName ?? 'Unknown',
      requestedBy: row.requestedBy,
      requestedAt: row.requestedAt.toISOString(),
      reason: row.reason,
      justification: row.justification ?? null,
      dateCreated: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      purchaseDate: row.purchaseDate ? new Date(row.purchaseDate).toISOString() : null,
      originalCost,
      warrantyStatus,
    };

    return details;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.getDisposalReviewDetails',
      startTime: actionTimer,
    });
  }
}

export async function createBulkDisposalRequests(input: {
  assetIds: string[];
  reason: string;
  justification?: string;
}) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['ITOperator', 'GlobalAdmin']);

  const assetIds = Array.from(
    new Set(input.assetIds.map((id) => id.trim()).filter(Boolean))
  );
  const reason = input.reason?.trim();
  const justification = input.justification?.trim() || null;

  if (assetIds.length === 0) throw new Error('Select at least one asset.');
  if (!reason) throw new Error('Reason is required.');

  try {
    const checkTimer = startLatencyTimer();

    const existing = await db
      .select({ assetId: assetDisposals.assetId })
      .from(assetDisposals)
      .where(
        and(
          eq(assetDisposals.status, 'Pending Approval'),
          inArray(assetDisposals.assetId, assetIds)
        )
      );

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.bulk_request.check_existing',
      startTime: checkTimer,
      metadata: { selected: assetIds.length, existing: existing.length },
    });

    const existingSet = new Set(existing.map((r) => r.assetId));
    const toInsert = assetIds.filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      throw new Error('All selected assets already have a pending disposal request.');
    }

    const insertTimer = startLatencyTimer();

    await db.insert(assetDisposals).values(
      toInsert.map((assetId) => ({
        assetId,
        requestedById: user.id,
        reason,
        justification,
      }))
    );

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.bulk_request.insert',
      startTime: insertTimer,
      metadata: { inserted: toInsert.length },
    });

    const verifyTimer = startLatencyTimer();

    const insertedOrExistingPending = await db
      .select({ assetId: assetDisposals.assetId })
      .from(assetDisposals)
      .where(
        and(
          eq(assetDisposals.status, 'Pending Approval'),
          inArray(assetDisposals.assetId, toInsert)
        )
      );

    const assetIdsToMarkPendingDisposal = insertedOrExistingPending.map(
      (r) => r.assetId
    );

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.bulk_request.verify_pending',
      startTime: verifyTimer,
      metadata: {
        requested: toInsert.length,
        verified: assetIdsToMarkPendingDisposal.length,
      },
    });

    if (assetIdsToMarkPendingDisposal.length > 0) {
      const updateTimer = startLatencyTimer();

      await db
        .update(assets)
        .set({ status: 'Pending Disposal' })
        .where(inArray(assets.id, assetIdsToMarkPendingDisposal));

      logLatency({
        scope: 'DB ACTION',
        label: 'disposals.bulk_request.update_assets_status',
        startTime: updateTimer,
        metadata: { updated: assetIdsToMarkPendingDisposal.length },
      });
    }

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return {
      success: true as const,
      inserted: toInsert.length,
      skipped: assetIds.length - toInsert.length,
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.bulk_request',
      startTime: actionTimer,
    });
  }
}

export async function rejectDisposalRequest(
  _prevState: DisposalFormState,
  formData: FormData
): Promise<DisposalFormState> {
  const actionTimer = startLatencyTimer();
  
  let parsedDisposalIds: number[];
  let parsedAssetIds: string[];

  // Fix: Safe JSON parsing outside Zod to prevent unhandled runtime errors
  try {
    parsedDisposalIds = JSON.parse(String(formData.get('disposalIds') || '[]'));
    parsedAssetIds = JSON.parse(String(formData.get('assetIds') || '[]'));
  } catch {
    return { success: false, message: 'Invalid payload format for IDs.' };
  }

  const parsed = rejectDisposalSchema.safeParse({
    disposalIds: parsedDisposalIds,
    assetIds: parsedAssetIds,
    rejectionReason: formData.get('rejectionReason'),
    fallbackStatus: formData.get('fallbackStatus'),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { 
    disposalIds,
    assetIds,
    rejectionReason: normalizedReason, 
    fallbackStatus: validStatus 
  } = parsed.data;

  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return { success: false, message: 'FORBIDDEN: Only admins can reject disposals.' };
  }

  try {
    const dbTimer = startLatencyTimer();
    
    // Fix: Wrap in a transaction with .returning() and strict status verification
    await db.transaction(async (tx) => {
      const updatedDisposals = await tx
        .update(assetDisposals)
        .set({
          status: 'Rejected',
          approvedById: user.id, 
          resolvedAt: new Date(),
          rejectionReason: normalizedReason,
        }) 
        .where(
          and(
            inArray(assetDisposals.id, disposalIds),
            eq(assetDisposals.status, 'Pending Approval') 
          )
        )
        .returning({ id: assetDisposals.id });

      if (updatedDisposals.length !== disposalIds.length) {
        throw new Error('One or more requested disposals are not eligible for rejection.');
      }

      const updatedAssets = await tx
        .update(assets)
        .set({
          status: validStatus as "Available" | "In Repair", 
        })
        .where(inArray(assets.id, assetIds))
        .returning({ id: assets.id });
        
      if (updatedAssets.length !== assetIds.length) {
        throw new Error('One or more requested assets could not be marked as rejected.');
      }
    });

    logLatency({ scope: 'DB ACTION', label: 'disposals.reject', startTime: dbTimer });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return { success: true, message: 'Disposal request rejected successfully.' };
  } catch (error) {
    console.error('Rejection failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to reject requests in the database.' };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.reject', startTime: actionTimer });
  }
}

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
    
    // NOTE: For future security hardening, consider updating uploadFileToStorage 
    // to store sensitive compliance documents (like receipts) with private ACLs 
    // and fetch them via authenticated signed URLs.
    const uploadedUrl = await uploadFileToStorage(file, 'disposals');
    
    logLatency({ scope: 'STORAGE', label: 'disposals.uploadReceipt', startTime: storageTimer });

    return { 
      success: true, 
      url: uploadedUrl,     
      fileUrl: uploadedUrl  
    };
    
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Upload failed.' };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.uploadReceipt', startTime: actionTimer });
  }
}

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
    let parsedDisposalIds: number[];
    let parsedAssetIds: string[];
    let parsedReceiptUrls: string[];

    // Fix: Safe JSON parsing
    try {
      parsedDisposalIds = JSON.parse(String(formData.get('disposalIds') || '[]'));
      parsedAssetIds = JSON.parse(String(formData.get('assetIds') || '[]'));
      parsedReceiptUrls = JSON.parse(String(formData.get('receiptUrls') || '[]'));
    } catch {
      return { success: false, message: 'Invalid payload format.' };
    }

    const parsed = executeDisposalSchema.safeParse({
      disposalIds: parsedDisposalIds,
      assetIds: parsedAssetIds,
      reason: formData.get('reason'),
      disposalDate: formData.get('disposalDate') || undefined,
      disposalMethod: formData.get('disposalMethod'),
      dataWiped: formData.get('dataWiped') === 'true',
      tagsRemoved: formData.get('tagsRemoved') === 'true',
      receiptUrls: parsedReceiptUrls, // Passing the structured array, not a joined string
    });

    if (!parsed.success) {
      return {
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const validData = parsed.data;
    const dbTimer = startLatencyTimer();
    
    // Fix: Validate Disposals mapping to Assets to prevent payload tampering
    const requestedDisposalIds = [...new Set(validData.disposalIds)];
    const requestedAssetIds = [...new Set(validData.assetIds)];
    const allowedExecutionStatuses = ['Pending Approval', 'Approved'] as const;

    if (
      requestedDisposalIds.length !== validData.disposalIds.length ||
      requestedAssetIds.length !== validData.assetIds.length
    ) {
      return {
        success: false,
        message: 'Validation failed: Duplicate disposal or asset identifiers are not allowed.',
      };
    }

    const disposalRecords = await db
      .select({
        disposalId: assetDisposals.id,
        assetId: assetDisposals.assetId,
      })
      .from(assetDisposals)
      .where(inArray(assetDisposals.id, requestedDisposalIds));

    if (disposalRecords.length !== requestedDisposalIds.length) {
      return { success: false, message: 'One or more disposal requests could not be found.' };
    }

    const disposalAssetIds = disposalRecords.map((record) => record.assetId);
    const disposalAssetIdSet = new Set(disposalAssetIds);

    const hasMismatchedAssets =
      disposalAssetIds.length !== requestedAssetIds.length ||
      requestedAssetIds.some((assetId) => !disposalAssetIdSet.has(assetId));

    if (hasMismatchedAssets) {
      return { success: false, message: 'Submitted assets do not match the selected disposal requests.' };
    }
    
    // Fix: Implement transaction with .returning() guarantees
    await db.transaction(async (tx) => {
      const updatedDisposals = await tx
        .update(assetDisposals)
        .set({
          status: 'Completed',
          approvedById: user.id,
          resolvedAt: validData.disposalDate ? new Date(validData.disposalDate) : new Date(),
          reason: validData.reason, 
          disposalMethod: validData.disposalMethod,
          dataWiped: validData.dataWiped,
          tagsRemoved: validData.tagsRemoved,
          disposalReceiptUrl: validData.receiptUrl, // The schema normalizes this for DB storage
        })
        .where(
          and(
            inArray(assetDisposals.id, requestedDisposalIds),
            inArray(assetDisposals.status, [...allowedExecutionStatuses])
          )
        )
        .returning({ disposalId: assetDisposals.id });

      if (updatedDisposals.length !== requestedDisposalIds.length) {
        throw new Error('Failed to update all disposal requests. Ensure they are in an eligible status.');
      }

      const updatedAssets = await tx
        .update(assets)
        .set({ status: 'Disposed' })
        .where(inArray(assets.id, disposalAssetIds))
        .returning({ assetId: assets.id });

      if (updatedAssets.length !== disposalAssetIds.length) {
        throw new Error('Failed to update all assets for disposal.');
      }

      const auditLogsToInsert = disposalAssetIds.map((assetId) => ({
        entityType: 'Asset' as const,
        entityId: assetId,
        actionType: 'Asset Disposed',
        performedById: user.id,
        newValue: { 
          method: validData.disposalMethod, 
          receipt: validData.receiptUrl,
          wiped: validData.dataWiped,
          untagged: validData.tagsRemoved,
          reason: validData.reason
        },
      }));

      if (auditLogsToInsert.length > 0) {
        await tx.insert(systemAuditLogs).values(auditLogsToInsert);
      }
    });

    logLatency({ scope: 'DB ACTION', label: 'disposals.executeAssetDisposal', startTime: dbTimer });

    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');
    
    return { success: true, message: 'Disposal executed successfully.' };
  } catch (error) {
    console.error('Execution failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Database error: Failed to execute disposal.' };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.executeAssetDisposal', startTime: actionTimer });
  }
}