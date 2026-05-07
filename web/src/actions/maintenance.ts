'use server';

import { db } from '@/db';
import { maintenanceTickets, assets, users, assetPurchases, models, brands, categories, systemAuditLogs, vendors } from '@/db/schema';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import { getAssetFinancialVitals } from '@/actions/asset-financial-vitals';
import type { PendingReviewTicket, IssueReviewPanelData, ActiveRepairTicket, RepairHistoryTicket, AssetMaintenanceRecord } from '@/types/maintenance';

// ============================================================================
// CONSTANTS & SECURITY UTILITIES
// ============================================================================
const DEPRECIATION_MONTHS = 36;
const MAX_QUERY_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 3;

/**
 * Strips HTML tags and enforces a maximum length to prevent XSS and buffer overflow.
 * Enforces input sanitization before saving to the database or audit logs.
 */
function sanitizeText(input: string | null | undefined, maxLength: number): string {
  if (!input) return '';
  const stripped = input.replace(/<[^>]*>?/gm, '');
  return stripped.trim().substring(0, maxLength);
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getPendingMaintenanceTickets(searchTerm = '') {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

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
    .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition)
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
}

export async function getTicketForIssueReview(ticketId: number): Promise<IssueReviewPanelData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

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

  // Fetch real-time vitals (Depreciation, TCO, Warranty)
  let bookValue = 0;
  let totalTCO = 0;
  let warrantyStatus: 'Active' | 'Expired' = 'Expired';
  let originalCost = purchase?.totalCost ? parseFloat(purchase.totalCost.toString()) : 0;

  try {
    const vitals = await getAssetFinancialVitals(row.asset.id);
    bookValue = vitals.currentBookValue;
    totalTCO = vitals.totalTCO;
    warrantyStatus = vitals.isUnderWarranty ? 'Active' : 'Expired';
    originalCost = vitals.totalCost;
  } catch (e) {
    console.warn(`[getTicketForIssueReview] Could not fetch financial vitals for asset ${row.asset.id}:`, e);
    // Fallback if financial vitals fetch fails
    if (purchase?.warrantyExpiry) {
      const expiryDate = new Date(purchase.warrantyExpiry);
      warrantyStatus = expiryDate > new Date() ? 'Active' : 'Expired';
    }
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
    originalCost,
    totalTCO,
  } as unknown as IssueReviewPanelData;
}

export async function getVendors() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

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
}

export async function getActiveRepairTickets(searchTerm = '') {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

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
    .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition)
    .limit(MAX_QUERY_LIMIT);

  const tickets = result.map((row) => ({
    ...row.ticket,
    asset: row.asset,
  })) as unknown as ActiveRepairTicket[];

  return { tickets, total: tickets.length };
}

export async function getRepairHistory(page = 1, pageSize = 10, searchTerm = '') {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

  const offset = (page - 1) * pageSize;
  const baseCondition = eq(maintenanceTickets.status, 'COMPLETED');

  const searchCondition = searchTerm.trim()
    ? or(
        ilike(assets.assetTag, `%${searchTerm}%`),
        ilike(maintenanceTickets.vendorName, `%${searchTerm}%`)
      )
    : undefined;

  const countResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(maintenanceTickets)
    .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
    .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition);

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
    .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition)
    .orderBy(desc(maintenanceTickets.actualCompletionDate))
    .limit(pageSize)
    .offset(offset);

  const tickets = result.map((row) => row.ticket) as RepairHistoryTicket[];

  return { tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAssetMaintenanceHistory(assetId: string, limit = DEFAULT_HISTORY_LIMIT) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

  const assetRecord = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.assetTag, assetId))
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
    .limit(limit);

  return result as AssetMaintenanceRecord[];
}

// ============================================================================
// MUTATIONS (WRAPPED IN ATOMIC TRANSACTIONS)
// ============================================================================

export async function resolveIssueInternally(ticketId: number, resolutionNote: string) {
  // 1. Zero Trust: Auth & Role Validation
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');
  
  // 2. Input Sanitization
  const safeResolutionNote = sanitizeText(resolutionNote, 1000);
  if (!safeResolutionNote) throw new Error('Resolution note is required');

  // 3. Atomic Database Transaction
  return await db.transaction(async (tx) => {
    const ticketResult = await tx.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, ticketId)).limit(1);
    if (ticketResult.length === 0) throw new Error(`Ticket with ID ${ticketId} not found`);
    const ticket = ticketResult[0];

    const currentAssetResult = await tx.select().from(assets).where(eq(assets.id, ticket.assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error(`Asset with ID ${ticket.assetId} not found`);
    const currentAsset = currentAssetResult[0];

    const now = new Date();

    const updatedAssets = await tx
      .update(assets)
      .set({ status: 'Available', updatedAt: now })
      .where(eq(assets.id, ticket.assetId))
      .returning({ id: assets.id });
    if (updatedAssets.length === 0) throw new Error('Failed to update asset status');

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
    if (updatedTickets.length === 0) throw new Error('Failed to update maintenance ticket');

    // Audit Log complies with strict Enum ('UPDATE')
    await tx.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: ticket.assetId,
      actionType: 'UPDATE', 
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: { 
        status: 'Available', 
        resolutionNote: safeResolutionNote,
        actionContext: 'MAINTENANCE_RESOLVED_INTERNALLY'
      },
      performedAt: now,
    });

    return { success: true, message: 'Issue resolved successfully', assetId: ticket.assetId };
  });
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
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

  // 2. Input Sanitization
  const safeRmaNumber = sanitizeText(rmaNumber, 100);

  // 3. Atomic Database Transaction
  return await db.transaction(async (tx) => {
    const currentAssetResult = await tx.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error(`Asset ${assetId} not found`);
    const currentAsset = currentAssetResult[0];

    const vendorResult = await tx.select().from(vendors).where(eq(vendors.id, parseInt(vendorId))).limit(1);
    if (vendorResult.length === 0) throw new Error(`Vendor ${vendorId} not found`);
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
    if (closedTicket.length === 0) throw new Error('Failed to close initial triage ticket');

    const updatedAsset = await tx
      .update(assets)
      .set({ status: 'In Repair', updatedAt: now })
      .where(eq(assets.id, assetId))
      .returning({ id: assets.id });
    if (updatedAsset.length === 0) throw new Error('Failed to update asset status');

    const newTicketValues = {
      assetId: assetId,
      ticketType: 'VENDOR' as const,
      vendorName: vendor.companyName,
      rmaNumber: safeRmaNumber,
      reportedIssue: `Vendor repair dispatch - ${vendor.companyName}`,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost).toString() : null,
      estimatedReturnDate: expectedReturnDate ? expectedReturnDate : null,
      status: 'ACTIVE' as const,
      dispatchedById: user.id,
      createdAt: now,
      updatedAt: now,
    };

    const newTickets = await tx
      .insert(maintenanceTickets)
      .values(newTicketValues)
      .returning();
    if (!newTickets[0]) throw new Error('Failed to create vendor repair ticket');

    // Audit Log complies with strict Enum ('UPDATE')
    await tx.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'UPDATE',
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: {
        status: 'In Repair',
        vendor: vendor.companyName,
        rmaNumber: safeRmaNumber,
        estimatedReturnDate: expectedReturnDate || null,
        actionContext: 'MAINTENANCE_VENDOR_REPAIR_INITIATED'
      },
      performedAt: now,
    });

    return { success: true, message: 'Asset dispatched successfully', ticketId: newTickets[0].id, assetId };
  });
}

export async function completeRepairTicket(
  ticketId: number,
  actualCost: string,
  resolutionNotes: string,
  updateStatusTo: 'Available' | 'Disposed'
) {
  // 1. Zero Trust: Auth & Role Validation
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

  // 2. Input Validation & Sanitization
  if (!Number.isInteger(ticketId) || ticketId <= 0) throw new Error('Invalid ticket ID');
  const safeResolutionNotes = sanitizeText(resolutionNotes, 1000);
  if (safeResolutionNotes.length === 0) throw new Error('Resolution notes are required');
  const actualCostNum = Number.parseFloat(actualCost);
  if (!Number.isFinite(actualCostNum) || actualCostNum < 0) throw new Error('Actual cost must be a finite number greater than or equal to 0');

  // 3. Atomic Database Transaction
  return await db.transaction(async (tx) => {
    const ticketResult = await tx.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, ticketId)).limit(1);
    if (ticketResult.length === 0) throw new Error(`Ticket ${ticketId} not found`);
    const ticket = ticketResult[0];
    const assetId = ticket.assetId;

    const currentAssetResult = await tx.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error(`Asset ${assetId} not found`);
    const currentAsset = currentAssetResult[0];

    const now = new Date();

    const updatedTickets = await tx
      .update(maintenanceTickets)
      .set({
        status: 'COMPLETED',
        actualCost: actualCostNum.toString(),
        actualCompletionDate: now,
        resolutionNotes: safeResolutionNotes,
        updatedAt: now,
      })
      .where(eq(maintenanceTickets.id, ticketId))
      .returning({ id: maintenanceTickets.id });
    if (updatedTickets.length === 0) throw new Error('Failed to update maintenance ticket');

    const updatedAssets = await tx
      .update(assets)
      .set({ status: updateStatusTo, updatedAt: now })
      .where(eq(assets.id, assetId))
      .returning({ id: assets.id });
    if (updatedAssets.length === 0) throw new Error('Failed to update asset');

    // Audit Log complies with strict Enum ('UPDATE')
    await tx.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'UPDATE',
      performedById: user.id,
      oldValue: { status: currentAsset.status, ticketStatus: 'ACTIVE' },
      newValue: {
        status: updateStatusTo,
        ticketStatus: 'COMPLETED',
        actualCost: actualCostNum,
        resolutionNotes: safeResolutionNotes,
        actionContext: 'MAINTENANCE_REPAIR_COMPLETED'
      },
      performedAt: now,
    });

    return { success: true, message: 'Repair completed successfully', ticketId, assetId };
  });
}