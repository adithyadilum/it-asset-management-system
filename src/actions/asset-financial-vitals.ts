// web/src/actions/asset-financial-vitals.ts
'use server';

import { db } from '@/db';
import { assets, assetPurchases, maintenanceTickets } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import { calculateStraightLineDepreciation } from '@/lib/financial-math';
import { resolveAssetPrimaryId } from '@/lib/data/asset-details-repo';

/**
 * Reusable RBAC guard for financial data.
 * Financial vitals are sensitive and restricted to Admins and Finance auditors.
 */
async function enforceFinanceAccess() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor') {
    throw new Error(
      'Forbidden: Insufficient permissions to view financial data.'
    );
  }
  return user;
}

// Removed redundant isValidUuid - using import from lib instead

export interface AssetFinancialVitals {
  assetId: string;
  assetTag: string;
  purchaseDate: string | null;
  basePrice: number;
  tax: number;
  shippingCost: number;
  totalCost: number;
  currencyCode: string;
  warrantyExpiry: string | null;
  isUnderWarranty: boolean;
  usefulLifeMonths: number;
  currentBookValue: number;
  totalRepairCosts: number;
  totalTCO: number;
}

/**
 * Fetches comprehensive financial vitals for a single asset.
 * This action integrates data from purchases and maintenance to provide a unified financial view.
 */
export async function getAssetFinancialVitals(
  assetId: string
): Promise<AssetFinancialVitals> {
  try {
    await enforceFinanceAccess();

    // 0. Resolve Asset ID (could be tag or UUID)
    const resolvedAssetId = await resolveAssetPrimaryId(assetId);
    if (!resolvedAssetId) {
      throw new Error('Asset not found or invalid ID format');
    }

    // 1. Fetch Asset and Purchase details
    const assetResult = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        usefulLifeMonths: assets.usefulLifeMonths,
        purchaseDate: assetPurchases.purchaseDate,
        basePrice: assetPurchases.basePrice,
        tax: assetPurchases.tax,
        shippingCost: assetPurchases.shippingCost,
        totalCost: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assets)
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(eq(assets.id, resolvedAssetId))
      .limit(1);

    if (assetResult.length === 0) {
      throw new Error('Asset not found');
    }

    const asset = assetResult[0];

    // 2. Fetch Total Repair Costs (Completed Maintenance Tickets)
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
          eq(maintenanceTickets.assetId, resolvedAssetId),
          eq(maintenanceTickets.status, 'COMPLETED')
        )
      );

    const totalRepairCosts = parseFloat(
      repairResult[0]?.totalRepair?.toString() || '0'
    );

    // 3. Calculate Depreciation & Book Value using shared math helper
    const price = parseFloat(asset.totalCost?.toString() || '0');
    const lifeMonths = asset.usefulLifeMonths || 60; // Default to 5 years if not set
    const currentBookValue = calculateStraightLineDepreciation(
      price,
      lifeMonths,
      asset.purchaseDate
    );

    // 4. Determine Warranty Status
    const isUnderWarranty = asset.warrantyExpiry
      ? new Date(asset.warrantyExpiry) > new Date()
      : false;

    // 5. Final Assembly
    return {
      assetId: asset.id,
      assetTag: asset.assetTag,
      purchaseDate: asset.purchaseDate,
      basePrice: parseFloat(asset.basePrice?.toString() || '0'),
      tax: parseFloat(asset.tax?.toString() || '0'),
      shippingCost: parseFloat(asset.shippingCost?.toString() || '0'),
      totalCost: price,
      currencyCode: asset.currencyCode || 'USD',
      warrantyExpiry: asset.warrantyExpiry,
      isUnderWarranty,
      usefulLifeMonths: lifeMonths,
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      totalRepairCosts,
      totalTCO: Math.round((price + totalRepairCosts) * 100) / 100,
    };
  } catch (error) {
    // Log authorization failures at debug level, not as errors
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('Unauthorized') ||
        error.message.includes('Forbidden'));
    if (isAuthError) {
      console.debug(
        `[getAssetFinancialVitals] Authorization denied for asset ${assetId}`
      );
    } else {
      console.error(
        `[getAssetFinancialVitals] Error for asset ${assetId}:`,
        error
      );
    }
    throw error;
  }
}
