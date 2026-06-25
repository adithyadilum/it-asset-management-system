'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  maintenanceTickets,
  assets,
  users,
  assetPurchases,
  models,
  brands,
  categories,
  systemAuditLogs,
  vendors,
  assetAssignments,
} from '@/db/schema';
import { eq, and, ilike, or, desc, sql, isNull } from 'drizzle-orm';
import { getAuthenticatedUser , enforceActionAccess } from '@/actions/auth';
import { calculateCurrentBookValue } from '@/lib/depreciation';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import {
  resolveIssueSchema,
  initiateVendorRepairSchema,
  completeRepairSchema,
  panelRepairSchema,
  getRepairHistoryParamsSchema,
  getAssetMaintenanceHistoryParamsSchema,
} from '@/lib/validations/maintenance';
import type {
  PendingReviewTicket,
  IssueReviewPanelData,
  ActiveRepairTicket,
  RepairHistoryTicket,
  AssetMaintenanceRecord,
} from '@/types/maintenance';

// ============================================================================
// CONSTANTS & SECURITY UTILITIES
// ============================================================================
const MAX_QUERY_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 3;

/**
 * Input sanitization utilities are intentionally removed if unused.
 * Reintroduce a focused sanitizer when needed.
 */

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getPendingMaintenanceTickets(searchTerm = '') {
  // Fix A — FinanceAuditor must not access operational pending tickets
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  try {
    const baseCondition = and(
      eq(maintenanceTickets.status, 'ACTIVE'),
      eq(maintenanceTickets.ticketType, 'INTERNAL')
    );

    const searchCondition = searchTerm.trim()
      ? or(
          ilike(assets.assetTag, `%${searchTerm}%`),
          ilike(assets.name, `%${searchTerm}%`),
          ilike(maintenanceTickets.reportedIssue, `%${searchTerm}%`)
        )
      : undefined;

    const result = await db
      .select({
        ticket: maintenanceTickets,
        asset: assets,
        model: models,
        brand: brands,
        category: categories,
        purchase: assetPurchases,
        reportedBy: users,
      })
      .from(maintenanceTickets)
      .where(
        searchCondition ? and(baseCondition, searchCondition) : baseCondition
      )
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(users, eq(maintenanceTickets.dispatchedById, users.id))
      .limit(MAX_QUERY_LIMIT);

    if (result.length === 0) return { tickets: [], total: 0 };

    const tickets = result.map((row) => ({
      ...row.ticket,
      asset: row.asset,
      model: row.model,
      brand: row.brand,
      category: row.category,
      purchase: row.purchase,
      reportedBy: row.reportedBy,
    })) as unknown as PendingReviewTicket[];

    return { tickets, total: tickets.length };
  } catch (error) {
    console.error('[getPendingMaintenanceTickets]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

export async function getTicketForIssueReview(
  ticketId: number
): Promise<IssueReviewPanelData> {
  // Fix A — FinanceAuditor must not access individual operational ticket details
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  try {
    const result = await db
      .select({
        ticket: maintenanceTickets,
        asset: assets,
        model: models,
        brand: brands,
        category: categories,
        purchase: assetPurchases,
        reportedBy: users,
      })
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.id, ticketId),
          eq(maintenanceTickets.status, 'ACTIVE')
        )
      )
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(users, eq(maintenanceTickets.dispatchedById, users.id))
      .limit(1);

    if (result.length === 0) throw new Error('Ticket not found');

    const row = result[0];
    const purchase = row.purchase;

    const totalCost = purchase?.totalCost
      ? parseFloat(purchase.totalCost.toString())
      : 0;
    const salvage = row.asset.salvageValue
      ? parseFloat(row.asset.salvageValue.toString())
      : 0;
    const bookValue = calculateCurrentBookValue({
      cost: totalCost,
      salvageValue: salvage,
      usefulLifeMonths: row.asset.usefulLifeMonths,
      purchaseDate: purchase?.purchaseDate ?? null,
    });

    // Calculate Total Cost of Ownership (add repair costs)
    const repairResult = await db
      .select({
        totalRepair:
          sql<number>`COALESCE(SUM(${maintenanceTickets.actualCost}), 0)`.as(
            'totalRepair'
          ),
      })
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.assetId, row.asset.id),
          eq(maintenanceTickets.status, 'COMPLETED')
        )
      );

    const totalRepairCosts = parseFloat(
      repairResult[0]?.totalRepair?.toString() || '0'
    );
    const totalTCO = Math.round((totalCost + totalRepairCosts) * 100) / 100;

    // Determine Warranty Status
    let warrantyStatus: 'Active' | 'Expired' = 'Expired';
    if (purchase?.warrantyExpiry) {
      const expiryDate = new Date(purchase.warrantyExpiry);
      warrantyStatus = expiryDate > new Date() ? 'Active' : 'Expired';
    }

    return {
      ticket: {
        ...row.ticket,
        asset: row.asset,
        model: row.model,
        brand: row.brand,
        category: row.category,
        purchase: row.purchase,
        reportedBy: row.reportedBy,
      },
      warrantyStatus,
      bookValue: Math.round(bookValue * 100) / 100,
      originalCost: totalCost,
      totalTCO,
    } as unknown as IssueReviewPanelData;
  } catch (error) {
    if (error instanceof Error && error.message === 'Ticket not found') throw error;
    console.error('[getTicketForIssueReview]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

export async function getVendors() {
  // Fix A — FinanceAuditor must not access vendor operational data
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  try {
    return await db
      .select({
        id: vendors.id,
        companyName: vendors.companyName,
        email: vendors.email,
        phone: vendors.phone,
        website: vendors.website,
        isActive: vendors.isActive,
      })
      .from(vendors)
      .where(eq(vendors.isActive, true))
      .orderBy(vendors.companyName);
  } catch (error) {
    console.error('[getVendors]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

export async function getActiveRepairTickets(searchTerm = '') {
  // Fix A — FinanceAuditor must not access active repair operational data
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  try {
    const baseCondition = and(
      eq(maintenanceTickets.status, 'ACTIVE'),
      eq(maintenanceTickets.ticketType, 'VENDOR')
    );

    const searchCondition = searchTerm.trim()
      ? or(
          ilike(maintenanceTickets.rmaNumber, `%${searchTerm}%`),
          ilike(maintenanceTickets.vendorName, `%${searchTerm}%`)
        )
      : undefined;

    const result = await db
      .select({
        ticket: maintenanceTickets,
        asset: assets,
      })
      .from(maintenanceTickets)
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .where(
        searchCondition ? and(baseCondition, searchCondition) : baseCondition
      )
      .limit(MAX_QUERY_LIMIT);

    const tickets = result.map((row) => ({
      ...row.ticket,
      asset: row.asset,
    })) as unknown as ActiveRepairTicket[];

    return { tickets, total: tickets.length };
  } catch (error) {
    console.error('[getActiveRepairTickets]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

export async function getRepairHistory(
  page = 1,
  pageSize = 10,
  searchTerm = ''
) {
  // FinanceAuditor allowed — history is their permitted view
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  // Fix B — Validate and bound pagination parameters
  const paramsResult = getRepairHistoryParamsSchema.safeParse({ page, pageSize, searchTerm });
  if (!paramsResult.success) {
    throw new Error(paramsResult.error.issues[0]?.message ?? 'Invalid pagination parameters.');
  }
  const safeParams = paramsResult.data;

  try {
    const offset = (safeParams.page - 1) * safeParams.pageSize;
    const baseCondition = eq(maintenanceTickets.status, 'COMPLETED');

    const searchCondition = safeParams.searchTerm.trim()
      ? or(
          ilike(assets.assetTag, `%${safeParams.searchTerm}%`),
          ilike(maintenanceTickets.vendorName, `%${safeParams.searchTerm}%`)
        )
      : undefined;

    const countResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(maintenanceTickets)
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .where(
        searchCondition ? and(baseCondition, searchCondition) : baseCondition
      );

    const total = countResult[0]?.count || 0;

    const result = await db
      .select({
        ticket: {
          id: maintenanceTickets.id,
          assetId: assets.assetTag,
          vendorName: maintenanceTickets.vendorName,
          actualCompletionDate: maintenanceTickets.actualCompletionDate,
          actualCost: maintenanceTickets.actualCost,
          resolutionNotes: maintenanceTickets.resolutionNotes,
          status: maintenanceTickets.status,
          createdAt: maintenanceTickets.createdAt,
          updatedAt: maintenanceTickets.updatedAt,
        },
      })
      .from(maintenanceTickets)
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .where(
        searchCondition ? and(baseCondition, searchCondition) : baseCondition
      )
      .orderBy(desc(maintenanceTickets.actualCompletionDate))
      .limit(safeParams.pageSize)
      .offset(offset);

    const tickets = result.map((row) => row.ticket) as RepairHistoryTicket[];

    return {
      tickets,
      total,
      page: safeParams.page,
      pageSize: safeParams.pageSize,
      totalPages: Math.ceil(total / safeParams.pageSize),
    };
  } catch (error) {
    console.error('[getRepairHistory]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

export async function getAssetMaintenanceHistory(
  assetId: string,
  limit = DEFAULT_HISTORY_LIMIT
) {
  // FinanceAuditor allowed — this is the asset detail panel history view (last 3 records)
  const user = await enforceActionAccess();
  if (
    user.role !== 'GlobalAdmin' &&
    user.role !== 'ITOperator' &&
    user.role !== 'FinancialAuditor'
  )
    throw new Error('Forbidden');

  // Fix B — Validate and bound assetId and limit parameters
  const paramsResult = getAssetMaintenanceHistoryParamsSchema.safeParse({ assetId, limit });
  if (!paramsResult.success) {
    throw new Error(paramsResult.error.issues[0]?.message ?? 'Invalid parameters.');
  }
  const safeParams = paramsResult.data;

  try {
    const assetRecord = await db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.assetTag, safeParams.assetId))
      .limit(1);

    if (assetRecord.length === 0) throw new Error('Asset not found');

    const numericAssetId = assetRecord[0].id;

    const result = await db
      .select({
        id: maintenanceTickets.id,
        assetId: assets.assetTag,
        ticketType: maintenanceTickets.ticketType,
        vendorName: maintenanceTickets.vendorName,
        reportedIssue: maintenanceTickets.reportedIssue,
        resolutionNotes: maintenanceTickets.resolutionNotes,
        actualCost: maintenanceTickets.actualCost,
        actualCompletionDate: maintenanceTickets.actualCompletionDate,
        status: maintenanceTickets.status,
      })
      .from(maintenanceTickets)
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .where(eq(maintenanceTickets.assetId, numericAssetId))
      .orderBy(desc(maintenanceTickets.createdAt))
      .limit(safeParams.limit);

    return result as AssetMaintenanceRecord[];
  } catch (error) {
    if (error instanceof Error && error.message === 'Asset not found') throw error;
    console.error('[getAssetMaintenanceHistory]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to load maintenance data.');
  }
}

// ============================================================================
// MUTATIONS (WRAPPED IN ATOMIC TRANSACTIONS)
// ============================================================================

export async function resolveIssueInternally(
  ticketId: number,
  resolutionNote: string
) {
  // 1. Zero Trust: Auth & Role Validation
  const user = await enforceActionAccess();
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

  // 2. Zod Input Validation
  const parsed = resolveIssueSchema.safeParse({ ticketId, resolutionNote });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }
  const safeResolutionNote = parsed.data.resolutionNote;

  // 3. Atomic Database Transaction
  try {
    const result = await db.transaction(async (tx) => {
      const ticketResult = await tx
        .select()
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.id, ticketId))
        .limit(1);
      if (ticketResult.length === 0)
        throw new Error(`Ticket with ID ${ticketId} not found`);
      const ticket = ticketResult[0];

      const currentAssetResult = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, ticket.assetId))
        .limit(1);
      if (currentAssetResult.length === 0)
        throw new Error(`Asset with ID ${ticket.assetId} not found`);
      const currentAsset = currentAssetResult[0];

      if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
        throw new Error('Asset is disposed or archived');
      }

      const now = new Date();

      const updatedAssets = await tx
        .update(assets)
        .set({ status: 'Available', isArchived: false, updatedAt: now })
        .where(eq(assets.id, ticket.assetId))
        .returning({ id: assets.id });
      if (updatedAssets.length === 0)
        throw new Error('Failed to update asset status');

      // Fix C — Terminate any active assignments since the asset is now Available
      // No row-count check required (0 open assignments is valid), but DB errors must surface
      try {
        await tx
          .update(assetAssignments)
          .set({ returnedDate: now })
          .where(
            and(
              eq(assetAssignments.assetId, ticket.assetId),
              isNull(assetAssignments.returnedDate)
            )
          );
      } catch (assignErr) {
        throw new Error(
          `Failed to close active assignments: ${assignErr instanceof Error ? assignErr.message : 'Unknown error'}`
        );
      }

      const updatedTickets = await tx
        .update(maintenanceTickets)
        .set({
          status: 'COMPLETED',
          resolutionNotes: safeResolutionNote,
          actualCompletionDate: now,
          updatedAt: now,
        })
        .where(eq(maintenanceTickets.id, ticketId))
        .returning({ id: maintenanceTickets.id });
      if (updatedTickets.length === 0)
        throw new Error('Failed to update maintenance ticket');

      // Audit Log complies with strict Enum ('UPDATE')
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: ticket.assetId,
        actionType: 'UPDATE',
        performedById: user.id,
        oldValue: {
          status: currentAsset.status,
          isArchived: currentAsset.isArchived,
        },
        newValue: {
          status: 'Available',
          isArchived: false,
          resolutionNote: safeResolutionNote,
          actionContext: 'MAINTENANCE_RESOLVED_INTERNALLY',
        },
        performedAt: now,
      });

      return {
        success: true,
        message: 'Issue resolved successfully',
        assetId: ticket.assetId,
      };
    });

    // Revalidate cache for assets grids and maintenance tabs (after successful commit)
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/operations/maintenance');

    return result;
  } catch (error) {
    const knownMessages = [
      'Ticket with ID',
      'Asset with ID',
      'Failed to update asset status',
      'Failed to update maintenance ticket',
    ];
    const isKnown =
      error instanceof Error &&
      knownMessages.some((m) => error.message.startsWith(m));
    throw new Error(
      isKnown && error instanceof Error
        ? error.message
        : 'Failed to resolve maintenance ticket.'
    );
  }
}

export async function initiateVendorRepair(
  ticketId: number,
  assetId: string,
  vendorId: string,
  rmaNumber: string,
  estimatedCost?: string,
  expectedReturnDate?: string
) {
  // 1. Zero Trust: Auth & Role Validation
  const user = await enforceActionAccess();
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

  // 2. Zod Input Validation
  const parsed = initiateVendorRepairSchema.safeParse({
    ticketId,
    assetId,
    vendorId,
    rmaNumber: rmaNumber || undefined,
    estimatedCost: estimatedCost || undefined,
    expectedReturnDate: expectedReturnDate || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  // 3. Atomic Database Transaction
  try {
    const result = await db.transaction(async (tx) => {
      const currentAssetResult = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, parsed.data.assetId))
        .limit(1);
      if (currentAssetResult.length === 0)
        throw new Error(`Asset ${parsed.data.assetId} not found`);
      const currentAsset = currentAssetResult[0];

      if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
        throw new Error('Asset is disposed or archived');
      }

      const vendorResult = await tx
        .select()
        .from(vendors)
        .where(eq(vendors.id, parsed.data.vendorId))
        .limit(1);
      if (vendorResult.length === 0)
        throw new Error(`Vendor ${parsed.data.vendorId} not found`);
      const vendor = vendorResult[0];

      const now = new Date();

      const closedTicket = await tx
        .update(maintenanceTickets)
        .set({
          status: 'COMPLETED',
          resolutionNotes: 'Dispatched to vendor repair',
          actualCompletionDate: now,
          updatedAt: now,
        })
        .where(eq(maintenanceTickets.id, ticketId))
        .returning({ id: maintenanceTickets.id });
      if (closedTicket.length === 0)
        throw new Error('Failed to close initial triage ticket');

      const updatedAsset = await tx
        .update(assets)
        .set({ status: 'In Repair', updatedAt: now })
        .where(eq(assets.id, parsed.data.assetId))
        .returning({ id: assets.id });
      if (updatedAsset.length === 0)
        throw new Error('Failed to update asset status');

      const newTicketValues = {
        assetId: parsed.data.assetId,
        ticketType: 'VENDOR' as const,
        vendorName: vendor.companyName,
        rmaNumber: parsed.data.rmaNumber ?? null,
        reportedIssue: `Vendor repair dispatch - ${vendor.companyName}`,
        estimatedCost:
          parsed.data.estimatedCost != null
            ? parsed.data.estimatedCost.toString()
            : null,
        estimatedReturnDate: parsed.data.expectedReturnDate ?? null,
        status: 'ACTIVE' as const,
        dispatchedById: user.id,
        createdAt: now,
        updatedAt: now,
      };

      const newTickets = await tx
        .insert(maintenanceTickets)
        .values(newTicketValues)
        .returning();
      if (!newTickets[0])
        throw new Error('Failed to create vendor repair ticket');

      // Audit Log complies with strict Enum ('UPDATE')
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: parsed.data.assetId,
        actionType: 'UPDATE',
        performedById: user.id,
        oldValue: { status: currentAsset.status },
        newValue: {
          status: 'In Repair',
          vendor: vendor.companyName,
          rmaNumber: parsed.data.rmaNumber ?? null,
          estimatedReturnDate: parsed.data.expectedReturnDate ?? null,
          actionContext: 'MAINTENANCE_VENDOR_REPAIR_INITIATED',
        },
        performedAt: now,
      });

      void dispatchWebhookEvent('maintenance.created', {
        ticketId: newTickets[0].id,
        assetId: parsed.data.assetId,
        ticketType: newTicketValues.ticketType,
        reportedIssue: newTicketValues.reportedIssue,
      });

      return {
        success: true,
        message: 'Asset dispatched successfully',
        ticketId: newTickets[0].id,
        assetId: parsed.data.assetId,
      };
    });

    // Revalidate cache for assets grids and maintenance tabs (after successful commit)
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/operations/maintenance');

    return result;
  } catch (error) {
    const knownMessages = [
      'Asset ',
      'Vendor ',
      'Failed to close',
      'Failed to update asset status',
      'Failed to create vendor repair ticket',
    ];
    const isKnown =
      error instanceof Error &&
      knownMessages.some((m) => error.message.startsWith(m));
    throw new Error(
      isKnown && error instanceof Error
        ? error.message
        : 'Failed to initiate vendor repair.'
    );
  }
}

export async function completeRepairTicket(
  ticketId: number,
  actualCost: string,
  resolutionNotes: string,
  updateStatusTo: 'Available' | 'Disposed'
) {
  // 1. Zero Trust: Auth & Role Validation
  const user = await enforceActionAccess();
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

  // 2. Zod Input Validation
  const parsed = completeRepairSchema.safeParse({
    ticketId,
    actualCost,
    resolutionNotes,
    updateStatusTo,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  // 3. Atomic Database Transaction
  try {
    const result = await db.transaction(async (tx) => {
      const ticketResult = await tx
        .select()
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.id, parsed.data.ticketId))
        .limit(1);
      if (ticketResult.length === 0)
        throw new Error(`Ticket ${parsed.data.ticketId} not found`);
      const ticket = ticketResult[0];
      const assetId = ticket.assetId;

      const currentAssetResult = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);
      if (currentAssetResult.length === 0)
        throw new Error(`Asset ${assetId} not found`);
      const currentAsset = currentAssetResult[0];

      if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
        throw new Error('Asset is disposed or archived');
      }

      const now = new Date();

      const updatedTickets = await tx
        .update(maintenanceTickets)
        .set({
          status: 'COMPLETED',
          actualCost: parsed.data.actualCost.toString(),
          actualCompletionDate: now,
          resolutionNotes: parsed.data.resolutionNotes,
          updatedAt: now,
        })
        .where(eq(maintenanceTickets.id, parsed.data.ticketId))
        .returning({ id: maintenanceTickets.id });
      if (updatedTickets.length === 0)
        throw new Error('Failed to update maintenance ticket');

      const isArchived = parsed.data.updateStatusTo === 'Disposed';

      const updatedAssets = await tx
        .update(assets)
        .set({ status: parsed.data.updateStatusTo, isArchived, updatedAt: now })
        .where(eq(assets.id, assetId))
        .returning({ id: assets.id });
      if (updatedAssets.length === 0) throw new Error('Failed to update asset');

      // Fix C — Terminate any active assignments since the asset is now Available or Disposed
      // No row-count check required (0 open assignments is valid), but DB errors must surface
      try {
        await tx
          .update(assetAssignments)
          .set({ returnedDate: now })
          .where(
            and(
              eq(assetAssignments.assetId, assetId),
              isNull(assetAssignments.returnedDate)
            )
          );
      } catch (assignErr) {
        throw new Error(
          `Failed to close active assignments: ${assignErr instanceof Error ? assignErr.message : 'Unknown error'}`
        );
      }

      // Audit Log complies with strict Enum ('UPDATE')
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: assetId,
        actionType: 'UPDATE',
        performedById: user.id,
        oldValue: {
          status: currentAsset.status,
          isArchived: currentAsset.isArchived,
          ticketStatus: 'ACTIVE',
        },
        newValue: {
          status: parsed.data.updateStatusTo,
          isArchived,
          ticketStatus: 'COMPLETED',
          actualCost: parsed.data.actualCost,
          resolutionNotes: parsed.data.resolutionNotes,
          actionContext: 'MAINTENANCE_REPAIR_COMPLETED',
        },
        performedAt: now,
      });

      void dispatchWebhookEvent('maintenance.completed', {
        ticketId: parsed.data.ticketId,
        assetId,
        resolutionNotes: parsed.data.resolutionNotes,
        actualCost: parsed.data.actualCost,
      });

      return {
        success: true,
        message: 'Repair completed successfully',
        ticketId: parsed.data.ticketId,
        assetId,
      };
    });

    // Revalidate cache for assets grids and maintenance tabs (after successful commit)
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/operations/maintenance');

    return result;
  } catch (error) {
    const knownMessages = [
      'Ticket ',
      'Asset ',
      'Failed to update maintenance ticket',
      'Failed to update asset',
    ];
    const isKnown =
      error instanceof Error &&
      knownMessages.some((m) => error.message.startsWith(m));
    throw new Error(
      isKnown && error instanceof Error
        ? error.message
        : 'Failed to complete repair ticket.'
    );
  }
}

/**
 * Dispatches an asset for vendor repair directly from the asset detail panel.
 * Unlike `initiateVendorRepair`, this does not require an existing internal
 * triage ticket — it creates a VENDOR maintenance ticket from scratch.
 */
export async function reportDefectiveFromPanel(
  assetId: string,
  vendorId: string,
  rmaNumber: string,
  estimatedCost?: string,
  expectedReturnDate?: string
): Promise<{ success: boolean; message: string; ticketId?: number }> {
  // 1. Auth & Role Validation
  const user = await enforceActionAccess();
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

  // 2. Input Validation
  const parsed = panelRepairSchema.safeParse({
    assetId,
    vendorId,
    rmaNumber: rmaNumber || undefined,
    estimatedCost: estimatedCost || undefined,
    expectedReturnDate: expectedReturnDate || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Verify asset exists
      const currentAssetResult = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, parsed.data.assetId))
        .limit(1);
      if (currentAssetResult.length === 0)
        throw new Error(`Asset ${parsed.data.assetId} not found`);
      const currentAsset = currentAssetResult[0];

      if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
        throw new Error('Asset is disposed or archived');
      }

      // Verify vendor exists
      const vendorResult = await tx
        .select()
        .from(vendors)
        .where(eq(vendors.id, parsed.data.vendorId))
        .limit(1);
      if (vendorResult.length === 0)
        throw new Error(`Vendor ${parsed.data.vendorId} not found`);
      const vendor = vendorResult[0];

      const now = new Date();

      // Update asset status to 'In Repair'
      const updatedAsset = await tx
        .update(assets)
        .set({ status: 'In Repair', updatedAt: now })
        .where(eq(assets.id, parsed.data.assetId))
        .returning({ id: assets.id });
      if (updatedAsset.length === 0)
        throw new Error('Failed to update asset status');

      // Fix C — Terminate any active assignments
      // No row-count check required (0 open assignments is valid), but DB errors must surface
      try {
        await tx
          .update(assetAssignments)
          .set({ returnedDate: now })
          .where(
            and(
              eq(assetAssignments.assetId, parsed.data.assetId),
              isNull(assetAssignments.returnedDate)
            )
          );
      } catch (assignErr) {
        throw new Error(
          `Failed to close active assignments: ${assignErr instanceof Error ? assignErr.message : 'Unknown error'}`
        );
      }

      // Create vendor repair ticket
      const newTicketValues = {
        assetId: parsed.data.assetId,
        ticketType: 'VENDOR' as const,
        vendorName: vendor.companyName,
        rmaNumber: parsed.data.rmaNumber ?? null,
        reportedIssue: `Vendor repair dispatch — ${vendor.companyName}`,
        estimatedCost:
          parsed.data.estimatedCost != null
            ? parsed.data.estimatedCost.toString()
            : null,
        estimatedReturnDate: parsed.data.expectedReturnDate ?? null,
        status: 'ACTIVE' as const,
        dispatchedById: user.id,
        createdAt: now,
        updatedAt: now,
      };

      const newTickets = await tx
        .insert(maintenanceTickets)
        .values(newTicketValues)
        .returning();
      if (!newTickets[0])
        throw new Error('Failed to create vendor repair ticket');

      // Audit Log
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: parsed.data.assetId,
        actionType: 'UPDATE',
        performedById: user.id,
        oldValue: { status: currentAsset.status },
        newValue: {
          status: 'In Repair',
          vendor: vendor.companyName,
          rmaNumber: parsed.data.rmaNumber ?? null,
          estimatedReturnDate: parsed.data.expectedReturnDate ?? null,
          actionContext: 'MAINTENANCE_VENDOR_REPAIR_FROM_PANEL',
        },
        performedAt: now,
      });

      void dispatchWebhookEvent('maintenance.created', {
        ticketId: newTickets[0].id,
        assetId: parsed.data.assetId,
        ticketType: newTicketValues.ticketType,
        reportedIssue: newTicketValues.reportedIssue,
      });

      return {
        success: true as const,
        message: 'Asset dispatched for repair successfully.',
        ticketId: newTickets[0].id,
      };
    });

    // Revalidate relevant paths
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');
    revalidatePath('/operations/maintenance');

    return result;
  } catch (error) {
    const knownMessages = [
      'Asset ',
      'Vendor ',
      'Failed to update asset status',
      'Failed to create vendor repair ticket',
    ];
    const isKnown =
      error instanceof Error &&
      knownMessages.some((m) => error.message.startsWith(m));
    return {
      success: false,
      message:
        isKnown && error instanceof Error
          ? error.message
          : 'Failed to dispatch asset for repair.',
    };
  }
}
