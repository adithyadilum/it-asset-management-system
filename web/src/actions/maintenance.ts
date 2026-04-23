// web/src/actions/maintenance.ts
'use server';

import { db } from '@/db';
import { maintenanceTickets, assets, users, assetPurchases, models, brands, categories, systemAuditLogs, vendors } from '@/db/schema';
import { eq, and, inArray, ilike, or, desc, sql } from 'drizzle-orm'; 
import { getAuthenticatedUser } from '@/actions/auth';
import type { PendingReviewTicket, IssueReviewPanelData, AssetStatus, ActiveRepairTicket, RepairHistoryTicket, AssetMaintenanceRecord } from '@/types/maintenance';

export async function getPendingMaintenanceTickets() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

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
          eq(maintenanceTickets.status, 'ACTIVE'),
          inArray(assets.status, ['Defective', 'In Repair'])
        )
      )
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(users, eq(maintenanceTickets.dispatchedById, users.id))
      .limit(100);

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
    console.error('[getPendingMaintenanceTickets] Error:', error);
    throw error;
  }
}

export async function getTicketForIssueReview(ticketId: number): Promise<IssueReviewPanelData> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

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
          eq(maintenanceTickets.status, 'ACTIVE'),
          inArray(assets.status, ['Defective', 'In Repair'])
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

    let warrantyStatus: 'Active' | 'Expired' = 'Expired';
    if (purchase?.warrantyExpiry) {
      const expiryDate = new Date(purchase.warrantyExpiry);
      warrantyStatus = expiryDate > new Date() ? 'Active' : 'Expired';
    }

    const originalCost = purchase?.totalCost ? parseFloat(purchase.totalCost.toString()) : 0;
    const purchaseDate = purchase?.purchaseDate ? new Date(purchase.purchaseDate) : new Date();
    const monthsOld = Math.max(0, (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const depreciation = (originalCost * monthsOld) / 36;
    const bookValue = Math.max(0, originalCost - depreciation);

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
    } as unknown as IssueReviewPanelData;
  } catch (error) {
    console.error('[getTicketForIssueReview]', error);
    throw error;
  }
}

export async function resolveIssueInternally(ticketId: number, resolutionNote: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (!resolutionNote.trim()) throw new Error('Resolution note is required');

    const ticketResult = await db.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, ticketId)).limit(1);
    if (ticketResult.length === 0) throw new Error('Ticket not found');
    const ticket = ticketResult[0];
    const assetId = ticket.assetId;

    const currentAssetResult = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error('Asset not found');
    const currentAsset = currentAssetResult[0];

    await db.update(assets).set({ status: 'Available', updatedAt: new Date() }).where(eq(assets.id, assetId));
    await db.update(maintenanceTickets).set({ status: 'COMPLETED', resolutionNotes: resolutionNote, actualCompletionDate: new Date(), updatedAt: new Date() }).where(eq(maintenanceTickets.id, ticketId));

    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_RESOLVED_INTERNALLY',
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: { status: 'Available', resolutionNote: resolutionNote },
      performedAt: new Date(),
    });

    return { success: true, message: 'Issue resolved successfully', assetId };
  } catch (error) {
    console.error('[resolveIssueInternally] Error:', error);
    throw error;
  }
}

export async function getVendors() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    return await db.select({
      id: vendors.id,
      companyName: vendors.companyName,
      email: vendors.email,
      phone: vendors.phone,
      website: vendors.website,
      isActive: vendors.isActive,
    }).from(vendors).where(eq(vendors.isActive, true)).orderBy(vendors.companyName);
  } catch (error) {
    console.error('[getVendors] Error:', error);
    throw error;
  }
}

export async function initiateVendorRepair(assetId: string, vendorId: string, rmaNumber: string, estimatedCost?: string, expectedReturnDate?: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const currentAssetResult = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error('Asset not found');
    const currentAsset = currentAssetResult[0];

    const vendorResult = await db.select().from(vendors).where(eq(vendors.id, parseInt(vendorId))).limit(1);
    if (vendorResult.length === 0) throw new Error('Vendor not found');
    const vendor = vendorResult[0];

    await db.update(assets).set({ status: 'In Repair', updatedAt: new Date() }).where(eq(assets.id, assetId));

    const ticketResult = await db.insert(maintenanceTickets).values({
      assetId,
      ticketType: 'VENDOR',
      vendorName: vendor.companyName,
      rmaNumber: rmaNumber.trim(),
      reportedIssue: `Vendor repair dispatch - ${vendor.companyName}`,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost).toString() : null,
      estimatedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : null,
      status: 'ACTIVE',
      dispatchedById: user.id,
    }).returning();

    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_VENDOR_REPAIR_INITIATED',
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: { status: 'In Repair', vendor: vendor.companyName, rmaNumber: rmaNumber.trim(), estimatedReturnDate: expectedReturnDate || null },
      performedAt: new Date(),
    });

    return { success: true, message: 'Asset dispatched successfully', ticketId: ticketResult[0].id, assetId };
  } catch (error) {
    console.error('[initiateVendorRepair] Error:', error);
    throw error;
  }
}

export async function getActiveRepairTickets() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const result = await db
      .select({ ticket: maintenanceTickets, asset: assets })
      .from(maintenanceTickets)
      .where(and(eq(maintenanceTickets.status, 'ACTIVE'), eq(maintenanceTickets.ticketType, 'VENDOR'), inArray(assets.status, ['In Repair'])))
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .limit(100);

    const tickets = result.map((row) => ({
      ...row.ticket,
      asset: row.asset,
    })) as unknown as ActiveRepairTicket[];

    return { tickets, total: tickets.length };
  } catch (error) {
    console.error('[getActiveRepairTickets] Error:', error);
    throw error;
  }
}

export async function completeRepairTicket(ticketId: number, actualCost: string, resolutionNotes: string, updateStatusTo: 'Available' | 'Disposed') {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const ticketResult = await db.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, ticketId)).limit(1);
    if (ticketResult.length === 0) throw new Error('Ticket not found');
    const ticket = ticketResult[0];
    const assetId = ticket.assetId;

    const currentAssetResult = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error('Asset not found');
    const currentAsset = currentAssetResult[0];

    const actualCostNum = parseFloat(actualCost);
    await db.update(maintenanceTickets).set({ status: 'COMPLETED', actualCost: actualCostNum.toString(), actualCompletionDate: new Date(), resolutionNotes: resolutionNotes.trim(), updatedAt: new Date() }).where(eq(maintenanceTickets.id, ticketId));
    await db.update(assets).set({ status: updateStatusTo, updatedAt: new Date() }).where(eq(assets.id, assetId));

    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_REPAIR_COMPLETED',
      performedById: user.id,
      oldValue: { status: currentAsset.status, ticketStatus: 'ACTIVE' },
      newValue: { status: updateStatusTo, ticketStatus: 'COMPLETED', actualCost: actualCostNum, resolutionNotes: resolutionNotes.trim() },
      performedAt: new Date(),
    });

    return { success: true, message: 'Repair completed successfully', ticketId, assetId };
  } catch (error) {
    console.error('[completeRepairTicket] Error:', error);
    throw error;
  }
}

/**
 * Fetch completed repair tickets for the Repair History tab
 */
export async function getRepairHistory(page = 1, pageSize = 10, searchTerm = '') {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const offset = (page - 1) * pageSize;
    // Define base condition
    const baseCondition = eq(maintenanceTickets.status, 'COMPLETED');
    
    // Define search condition (returns undefined if no search term)
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
      .where(and(baseCondition, searchCondition))
      .limit(1);

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
      .where(and(baseCondition, searchCondition))
      .orderBy(desc(maintenanceTickets.actualCompletionDate))
      .limit(pageSize)
      .offset(offset);

    const tickets = result.map((row) => row.ticket) as RepairHistoryTicket[];

    return {
      tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('[getRepairHistory] Error:', error);
    throw error;
  }
}

/**
 * Fetch maintenance history for a specific asset (Epic 8)
 */
export async function getAssetMaintenanceHistory(assetId: string, limit = 3) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    const assetRecord = await db.select({ id: assets.id }).from(assets).where(eq(assets.assetTag, assetId)).limit(1);
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
  } catch (error) {
    console.error('[getAssetMaintenanceHistory] Error:', error);
    throw error;
  }
}