//web/src/actions/maintenance.ts
'use server';

import { db } from '@/db';
import { maintenanceTickets, assets, users, assetPurchases, models, brands, categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import type { PendingReviewTicket, IssueReviewPanelData } from '@/types/maintenance';

/**
 * Fetch pending maintenance tickets for the Pending Review tab
 * Filters by ACTIVE status and VENDOR/INTERNAL types
 * Includes related asset, model, brand, purchase, and user data
 */
export async function getPendingMaintenanceTickets() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch tickets with all relations
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
      .where(eq(maintenanceTickets.status, 'ACTIVE'))
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
 * Calculates warranty status based on warranty expiry date
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
      .where(eq(maintenanceTickets.id, ticketId))
      .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(users, eq(maintenanceTickets.dispatchedById, users.id))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Ticket not found');
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
    const originalCost = purchase?.totalCost ? parseFloat(purchase.totalCost) : 0;
    const purchaseDate = purchase?.purchaseDate ? new Date(purchase.purchaseDate) : new Date();
    const monthsOld = Math.max(0, (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const depreciation = (originalCost * monthsOld) / 36; // 3-year depreciation
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
 * Fetch all maintenance tickets filtered by status and type
 * Used for Active Repairs and Repair History tabs
 */
export async function getMaintenanceTicketsByStatus(status: 'ACTIVE' | 'COMPLETED', limit = 50) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const ticketsData = await db
      .select()
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, status))
      .limit(limit);

    return ticketsData;
  } catch (error) {
    console.error('[getMaintenanceTicketsByStatus]', error);
    throw error;
  }
}