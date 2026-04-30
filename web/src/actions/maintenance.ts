'use server';

import { db } from '@/db';
import { maintenanceTickets, assets, users, assetPurchases, models, brands, categories, systemAuditLogs, vendors } from '@/db/schema';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import type { PendingReviewTicket, IssueReviewPanelData, ActiveRepairTicket, RepairHistoryTicket, AssetMaintenanceRecord } from '@/types/maintenance';

// ============================================================================
// SECURITY UTILITIES
// ============================================================================
/**
 * Strips HTML tags and enforces a maximum length to prevent XSS and buffer overflow.
 */
function sanitizeText(input: string | null | undefined, maxLength: number): string {
  if (!input) return '';
  // Strip out anything that looks like an HTML tag (e.g., <script>, <img>)
  const stripped = input.replace(/<[^>]*>?/gm, '');
  // Trim whitespace and enforce the database limit
  return stripped.trim().substring(0, maxLength);
}
// ============================================================================

export async function getPendingMaintenanceTickets(searchTerm = '') {
  try {
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
      .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition) // <-- Added Search
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
    console.error('[getTicketForIssueReview] Error:', error);
    throw error;
  }
}

export async function resolveIssueInternally(ticketId: number, resolutionNote: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');
    
    // SANITIZE INPUT
    const safeResolutionNote = sanitizeText(resolutionNote, 1000);
    if (!safeResolutionNote) throw new Error('Resolution note is required');

    console.log('[resolveIssueInternally] Starting with ticketId:', ticketId);

    // 1. Get the ticket
    const ticketResult = await db
      .select()
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.id, ticketId))
      .limit(1);

    if (ticketResult.length === 0) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const ticket = ticketResult[0];
    const assetId = ticket.assetId;
    console.log('[resolveIssueInternally] Found ticket, assetId:', assetId);

    // 2. Get the current asset
    const currentAssetResult = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (currentAssetResult.length === 0) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }

    const currentAsset = currentAssetResult[0];
    const now = new Date();

    // 3. Update asset status to Available
    console.log('[resolveIssueInternally] Updating asset status to Available');
    const updatedAssets = await db
      .update(assets)
      .set({ status: 'Available', updatedAt: now })
      .where(eq(assets.id, assetId))
      .returning({ id: assets.id });

    if (updatedAssets.length === 0) {
      throw new Error('Failed to update asset status');
    }

    // 4. Update ticket status to COMPLETED
    console.log('[resolveIssueInternally] Updating ticket status to COMPLETED');
    const updatedTickets = await db
      .update(maintenanceTickets)
      .set({
        status: 'COMPLETED',
        resolutionNotes: safeResolutionNote, // USING SANITIZED INPUT
        actualCompletionDate: now,
        updatedAt: now,
      })
      .where(eq(maintenanceTickets.id, ticketId))
      .returning({ id: maintenanceTickets.id });

    if (updatedTickets.length === 0) {
      throw new Error('Failed to update maintenance ticket');
    }

    // 5. Create audit log
    console.log('[resolveIssueInternally] Creating audit log entry');
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_RESOLVED_INTERNALLY',
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: { status: 'Available', resolutionNote: safeResolutionNote }, // USING SANITIZED INPUT
      performedAt: now,
    });

    console.log('[resolveIssueInternally] Success!');
    return { success: true, message: 'Issue resolved successfully', assetId };
  } catch (error) {
    console.error('[resolveIssueInternally] Error:', error);
    throw new Error(`Failed to resolve issue internally: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getVendors() {
  try {
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
  } catch (error) {
    console.error('[getVendors] Error:', error);
    throw error;
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
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

    // SANITIZE INPUT
    const safeRmaNumber = sanitizeText(rmaNumber, 100);

    console.log('[initiateVendorRepair] Starting with ticketId:', ticketId, 'assetId:', assetId);

    // Get the current asset
    const currentAssetResult = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
    if (currentAssetResult.length === 0) throw new Error(`Asset ${assetId} not found`);
    const currentAsset = currentAssetResult[0];

    // Get the vendor
    const vendorResult = await db.select().from(vendors).where(eq(vendors.id, parseInt(vendorId))).limit(1);
    if (vendorResult.length === 0) throw new Error(`Vendor ${vendorId} not found`);
    const vendor = vendorResult[0];

    const now = new Date();

    // 1. Close the triage ticket (INTERNAL ticket from Pending Review)
    console.log('[initiateVendorRepair] Closing triage ticket:', ticketId);
    await db
      .update(maintenanceTickets)
      .set({
        status: 'COMPLETED',
        resolutionNotes: 'Dispatched to vendor repair',
        actualCompletionDate: now,
        updatedAt: now,
      })
      .where(eq(maintenanceTickets.id, ticketId));

    // 2. Update asset to In Repair
    console.log('[initiateVendorRepair] Updating asset status to In Repair');
    await db
      .update(assets)
      .set({ status: 'In Repair', updatedAt: now })
      .where(eq(assets.id, assetId));

    // 3. Create the vendor repair ticket (ACTIVE, VENDOR type)
    console.log('[initiateVendorRepair] Creating vendor repair ticket');
    const newTicketValues = {
      assetId: assetId,
      ticketType: 'VENDOR' as const,
      vendorName: vendor.companyName,
      rmaNumber: safeRmaNumber, // USING SANITIZED INPUT
      reportedIssue: `Vendor repair dispatch - ${vendor.companyName}`,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost).toString() : null,
      estimatedReturnDate: expectedReturnDate ? expectedReturnDate : null,
      status: 'ACTIVE' as const,
      dispatchedById: user.id,
      createdAt: now,
      updatedAt: now,
    };

    console.log('[initiateVendorRepair] New ticket values:', newTicketValues);

    const newTickets = await db
      .insert(maintenanceTickets)
      .values(newTicketValues as typeof maintenanceTickets.$inferInsert)
      .returning();

    if (!newTickets[0]) {
      throw new Error('Failed to create vendor repair ticket');
    }

    // 4. Create audit log
    console.log('[initiateVendorRepair] Creating audit log entry');
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_VENDOR_REPAIR_INITIATED',
      performedById: user.id,
      oldValue: { status: currentAsset.status },
      newValue: {
        status: 'In Repair',
        vendor: vendor.companyName,
        rmaNumber: safeRmaNumber, // USING SANITIZED INPUT
        estimatedReturnDate: expectedReturnDate || null,
      },
      performedAt: now,
    });

    console.log('[initiateVendorRepair] Success!');
    return { success: true, message: 'Asset dispatched successfully', ticketId: newTickets[0].id, assetId };
  } catch (error) {
    console.error('[initiateVendorRepair] Error:', error);
    throw new Error(`Failed to initiate vendor repair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getActiveRepairTickets(searchTerm = '') {
  try {
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
      .where(searchCondition ? and(baseCondition, searchCondition) : baseCondition) // <-- Added Search
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

export async function completeRepairTicket(
  ticketId: number,
  actualCost: string,
  resolutionNotes: string,
  updateStatusTo: 'Available' | 'Disposed'
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') throw new Error('Forbidden');

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      throw new Error('Invalid ticket ID');
    }

    // SANITIZE INPUT
    const safeResolutionNotes = sanitizeText(resolutionNotes, 1000);
    if (safeResolutionNotes.length === 0) {
      throw new Error('Resolution notes are required');
    }

    const actualCostNum = Number.parseFloat(actualCost);
    if (!Number.isFinite(actualCostNum) || actualCostNum < 0) {
      throw new Error('Actual cost must be a finite number greater than or equal to 0');
    }

    console.log('[completeRepairTicket] Starting with ticketId:', ticketId);

    const now = new Date();

    // 1. Get the ticket
    const ticketResult = await db
      .select()
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.id, ticketId))
      .limit(1);

    if (ticketResult.length === 0) throw new Error(`Ticket ${ticketId} not found`);
    const ticket = ticketResult[0];
    const assetId = ticket.assetId;

    // 2. Get current asset
    const currentAssetResult = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (currentAssetResult.length === 0) throw new Error(`Asset ${assetId} not found`);
    const currentAsset = currentAssetResult[0];

    // 3. Update ticket status to COMPLETED
    console.log('[completeRepairTicket] Updating ticket to COMPLETED');
    const updatedTickets = await db
      .update(maintenanceTickets)
      .set({
        status: 'COMPLETED',
        actualCost: actualCostNum.toString(),
        actualCompletionDate: now,
        resolutionNotes: safeResolutionNotes, // USING SANITIZED INPUT
        updatedAt: now,
      })
      .where(eq(maintenanceTickets.id, ticketId))
      .returning({ id: maintenanceTickets.id });

    if (updatedTickets.length === 0) {
      throw new Error('Failed to update maintenance ticket');
    }

    // 4. Update asset status
    console.log('[completeRepairTicket] Updating asset status to:', updateStatusTo);
    const updatedAssets = await db
      .update(assets)
      .set({ status: updateStatusTo, updatedAt: now })
      .where(eq(assets.id, assetId))
      .returning({ id: assets.id });

    if (updatedAssets.length === 0) {
      throw new Error('Failed to update asset');
    }

    // 5. Create audit log
    console.log('[completeRepairTicket] Creating audit log entry');
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_REPAIR_COMPLETED',
      performedById: user.id,
      oldValue: { status: currentAsset.status, ticketStatus: 'ACTIVE' },
      newValue: {
        status: updateStatusTo,
        ticketStatus: 'COMPLETED',
        actualCost: actualCostNum,
        resolutionNotes: safeResolutionNotes, // USING SANITIZED INPUT
      },
      performedAt: now,
    });

    console.log('[completeRepairTicket] Success!');
    return { success: true, message: 'Repair completed successfully', ticketId, assetId };
  } catch (error) {
    console.error('[completeRepairTicket] Error:', error);
    throw new Error(`Failed to complete repair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRepairHistory(page = 1, pageSize = 10, searchTerm = '') {
  try {
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

export async function getAssetMaintenanceHistory(assetId: string, limit = 3) {
  try {
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
  } catch (error) {
    console.error('[getAssetMaintenanceHistory] Error:', error);
    throw error;
  }
}