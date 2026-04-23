'use server';

import { db } from '@/db';
import { maintenanceTickets, assets, users, assetPurchases, models, brands, categories, systemAuditLogs } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import type { PendingReviewTicket, IssueReviewPanelData, AssetStatus } from '@/types/maintenance';

/**
 * Fetch pending maintenance tickets for the Pending Review tab
 * Filters by:
 * - Asset status: "Defective" or "In Repair"
 * - Maintenance ticket status: ACTIVE
 * Includes related asset, model, brand, purchase, and user data
 */
export async function getPendingMaintenanceTickets() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch tickets with all relations
    // Filter by: asset status is Defective or In Repair AND ticket status is ACTIVE
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

    if (result.length === 0) {
      return { tickets: [], total: 0 };
    }

    // Transform to match PendingReviewTicket type
    const tickets = result.map((row) => ({
      ...row.ticket,
      asset: row.asset,
      model: row.model,
      brand: row.brand,
      category: row.category,
      purchase: row.purchase,
      reportedBy: row.reportedBy,
    })) as unknown as PendingReviewTicket[];

    return {
      tickets,
      total: tickets.length,
    };
  } catch (error) {
    console.error('[getPendingMaintenanceTickets]', error);
    throw error;
  }
}

/**
 * Fetch a specific maintenance ticket with all details for the Issue Review panel
 * Validates that:
 * - Ticket status is ACTIVE
 * - Asset status is "Defective" or "In Repair"
 * Calculates warranty status based on warranty expiry date
 * Calculates book value using 3-year linear depreciation
 */
export async function getTicketForIssueReview(ticketId: number): Promise<IssueReviewPanelData> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

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

    if (result.length === 0) {
      throw new Error('Ticket not found or asset is not in Defective/In Repair status');
    }

    const row = result[0];
    const purchase = row.purchase;

    // Calculate warranty status
    let warrantyStatus: 'Active' | 'Expired' = 'Expired';
    if (purchase?.warrantyExpiry) {
      const expiryDate = new Date(purchase.warrantyExpiry);
      warrantyStatus = expiryDate > new Date() ? 'Active' : 'Expired';
    }

    // Calculate book value (simplified: original cost - depreciation)
    // Formula: Original Cost - (Original Cost * Months Old / 36)
    // 36 months = 3-year depreciation period
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

/**
 * Fetch all maintenance tickets filtered by status and asset status
 * Used for Active Repairs and Repair History tabs
 * 
 * Filters by:
 * - Maintenance ticket status (ACTIVE or COMPLETED)
 * - Asset status (Defective or In Repair by default, configurable)
 */
export async function getMaintenanceTicketsByStatus(
  status: 'ACTIVE' | 'COMPLETED',
  assetStatuses: AssetStatus[] = ['Defective', 'In Repair'],
  limit = 50
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const ticketsData = await db
      .select({
        ticket: maintenanceTickets,
        asset: assets,
      })
      .from(maintenanceTickets)
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .where(
        and(
          eq(maintenanceTickets.status, status),
          inArray(assets.status, assetStatuses)
        )
      )
      .limit(limit);

    return ticketsData.map((row) => ({
      ...row.ticket,
      asset: row.asset,
    }));
  } catch (error) {
    console.error('[getMaintenanceTicketsByStatus]', error);
    throw error;
  }
}

/**
 * Resolve a maintenance issue internally
 * Updates asset status to "Available"
 * Creates maintenance record with resolution_type: 'Internal'
 * Writes audit log entry
 */
export async function resolveIssueInternally(
  ticketId: number,
  resolutionNote: string
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    if (!resolutionNote.trim()) {
      throw new Error('Resolution note is required');
    }

    // Get the ticket to find the asset
    const ticketResult = await db
      .select()
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.id, ticketId))
      .limit(1);

    if (ticketResult.length === 0) {
      throw new Error('Ticket not found');
    }

    const ticket = ticketResult[0];
    const assetId = ticket.assetId;

    // Get current asset data for audit log
    const currentAssetResult = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (currentAssetResult.length === 0) {
      throw new Error('Asset not found');
    }

    const currentAsset = currentAssetResult[0];

    // Update asset status to "Available"
    await db
      .update(assets)
      .set({
        status: 'Available',
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));

    // Update maintenance ticket to mark as resolved
    await db
      .update(maintenanceTickets)
      .set({
        status: 'COMPLETED',
        resolutionNotes: resolutionNote,
        actualCompletionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceTickets.id, ticketId));

    // Write audit log entry
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'MAINTENANCE_RESOLVED_INTERNALLY',
      performedById: user.id,
      oldValue: {
        status: currentAsset.status,
      },
      newValue: {
        status: 'Available',
        resolutionNote: resolutionNote,
      },
      performedAt: new Date(),
    });

    return {
      success: true,
      message: 'Issue resolved successfully',
      assetId,
    };
  } catch (error) {
    console.error('[resolveIssueInternally]', error);
    throw error;
  }
}