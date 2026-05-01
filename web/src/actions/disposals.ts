'use server';

import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
// 1. Updated imports to include models, categories, and brands
import { assetDisposals, assetPurchases, assets, users, models, categories, brands, systemAuditLogs } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';

// Import your Zod validations
import { executeDisposalSchema, rejectDisposalSchema } from '@/lib/validations/disposals';

function assertAllowed(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }
}

export type DisposalReviewDetails = {
  disposalId: number;
  assetId: string;
  assetTag: string;
  assetName: string | null;
  
  // 2. Added category and brand to the type definition
  category: string;
  brand: string;

  requestedBy: string;
  requestedAt: string; // ISO
  reason: string;
  justification: string | null;

  // Financial-ish fields (optional)
  purchaseDate: string | null; // ISO date string if present
  originalCost: number | null;
  warrantyStatus: 'Valid' | 'Expired' | 'Unknown';
};

/**
 * Fetch extended details for the Disposal Review side panel.
 * Client wrapper calls this when a row is clicked.
 */
export async function getDisposalReviewDetails(disposalId: number) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  // Review panel is for admins/finance typically; allow IT too if you want them to view.
  assertAllowed(user.role, ['ITOperator', 'GlobalAdmin', 'FinanceAuditor']);

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
        
        // 3. Select the actual names from the joined tables
        categoryName: categories.name,
        brandName: brands.name,

        requestedBy: users.name,
        requestedAt: assetDisposals.requestedAt,
        reason: assetDisposals.reason,
        justification: assetDisposals.justification,

        purchaseDate: assetPurchases.purchaseDate,
        // Prefer totalCost if present; fallback to basePrice if not.
        totalCost: assetPurchases.totalCost,
        basePrice: assetPurchases.basePrice,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assetDisposals)
      .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
      .innerJoin(users, eq(assetDisposals.requestedById, users.id))
      .leftJoin(assetPurchases, eq(assetPurchases.assetId, assets.id))
      // 4. Join the models, categories, and brands tables
      .leftJoin(models, eq(assets.modelId, models.id))
      .leftJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(brands, eq(models.brandId, brands.id))
      .where(eq(assetDisposals.id, disposalId))
      .orderBy(desc(assetPurchases.createdAt)) // pick latest purchase record if multiple exist
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
    const originalCost =
      originalCostRaw === null ? null : Number(originalCostRaw);

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
      
      // 5. Map the joined names to the return object
      category: row.categoryName ?? 'Unknown',
      brand: row.brandName ?? 'Unknown',

      requestedBy: row.requestedBy,
      requestedAt: row.requestedAt.toISOString(),
      reason: row.reason,
      justification: row.justification ?? null,

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
    //Check for existing Pending Approval requests (dedupe)
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

    // Insert disposal request rows
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

    // Verify
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

    // Update assets.status -> Pending Disposal
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

/**
 * Rejects a pending disposal request and reverts the asset to a fallback status.
 */
export async function rejectDisposalRequest(
  disposalId: number,
  assetId: string,
  rejectionReason: string,
  fallbackStatus: string
) {
  const actionTimer = startLatencyTimer();
  
  // Validate input data against Zod schema
  const validatedFields = rejectDisposalSchema.safeParse({
    disposalId,
    assetId,
    rejectionReason,
    fallbackStatus,
  });

  if (!validatedFields.success) {
    throw new Error(validatedFields.error.issues[0].message);
  }

  const { 
    rejectionReason: normalizedReason, 
    fallbackStatus: validStatus 
  } = validatedFields.data;

  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin']);

  try {
    const dbTimer = startLatencyTimer();
    
    // Update the disposal request to Rejected, attach reason and resolver
    await db
      .update(assetDisposals)
      .set({
        status: 'Rejected',
        approvedById: user.id, 
        resolvedAt: new Date(),
        rejectionReason: normalizedReason,
      } ) 
      .where(eq(assetDisposals.id, disposalId));

    // Revert the Asset's status to the selected fallback status
    await db
      .update(assets)
      .set({
        status: validStatus, 
      })
      .where(eq(assets.id, assetId));

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.reject',
      startTime: dbTimer,
    });

    // Revalidate relevant pages so the UI updates instantly
    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');

    return { success: true as const };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.reject', startTime: actionTimer });
  }
}

export async function uploadDisposalReceipt(formData: FormData) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin']); // Execution is strictly Global Admin

  try {
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No file provided in the payload.');

    // Validate file types according to US-18.2
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only .pdf, .jpg, and .png are allowed.');
    }

    // Enforce a 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds the 5MB upload limit.');
    }

    const storageTimer = startLatencyTimer();

    // Mock URL for current development (Replace with S3/Blob storage logic later)
    const mockFileUrl = `https://storage.tiqri.local/disposals/${Date.now()}-${file.name}`;

    logLatency({ scope: 'STORAGE', label: 'disposals.uploadReceipt', startTime: storageTimer });

    return { success: true, fileUrl: mockFileUrl };
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.uploadReceipt', startTime: actionTimer });
  }
}

export async function executeAssetDisposal(payload: {
  disposalId: number;
  assetId: string;
  disposalMethod: 'Sold' | 'Stolen' | 'E-waste' | 'Donated';
  dataWiped: boolean;
  tagsRemoved: boolean;
  receiptUrl: string;
}) {
  const actionTimer = startLatencyTimer();
  
  // Validate input payload against Zod schema
  const validatedFields = executeDisposalSchema.safeParse(payload);

  if (!validatedFields.success) {
    throw new Error(validatedFields.error.issues[0].message);
  }

  const validData = validatedFields.data;
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin']);

  try {
    const dbTimer = startLatencyTimer();
    
    // 1. Update the Disposal Record with compliance details
    await db
      .update(assetDisposals)
      .set({
        status: 'Completed',
        approvedById: user.id,
        resolvedAt: new Date(),
        disposalMethod: validData.disposalMethod,
        dataWiped: validData.dataWiped,
        tagsRemoved: validData.tagsRemoved,
        disposalReceiptUrl: validData.receiptUrl,
      })
      .where(eq(assetDisposals.id, validData.disposalId));

    // 2. Move the actual Asset to its terminal state
    await db
      .update(assets)
      .set({ status: 'Disposed' })
      .where(eq(assets.id, validData.assetId));

    // 3. Write to System Audit Log (Immutable ledger)
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: validData.assetId,
      actionType: 'Asset Disposed',
      performedById: user.id,
      newValue: { 
        method: validData.disposalMethod, 
        receipt: validData.receiptUrl,
        wiped: validData.dataWiped,
        untagged: validData.tagsRemoved
      },
    });

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.executeAssetDisposal',
      startTime: dbTimer,
    });

    // 4. Revalidate cache to update UI instantly
    revalidatePath('/operations/disposals');
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/assets/software');
    
    return { success: true };
  } catch (error) {
    console.error('Execution failed:', error);
    throw new Error('Failed to execute disposal in the database.');
  } finally {
    logLatency({ scope: 'ACTION', label: 'disposals.executeAssetDisposal', startTime: actionTimer });
  }
}