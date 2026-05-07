// web/src/actions/asset-financial-vitals.ts
'use server';

import { db } from '@/db';
import { 
  assets, 
  assetPurchases, 
  maintenanceTickets,
} from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';

/**
 * Reusable RBAC guard for financial data.
 * Financial vitals are sensitive and restricted to Admins and Finance auditors.
 */
async function enforceFinanceAccess() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor') {
    throw new Error('Forbidden: Insufficient permissions to view financial data.');
  }
  return user;
}

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
export async function getAssetFinancialVitals(assetId: string): Promise<AssetFinancialVitals> {
  try {
    await enforceFinanceAccess();

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
      .where(eq(assets.id, assetId))
      .limit(1);

    if (assetResult.length === 0) {
      throw new Error('Asset not found');
    }

    const asset = assetResult[0];

    // 2. Fetch Total Repair Costs (Completed Maintenance Tickets)
    const repairResult = await db
      .select({
        totalRepair: sql<number>`COALESCE(SUM(${maintenanceTickets.actualCost}), 0)`.as('totalRepair'),
      })
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.assetId, assetId),
          eq(maintenanceTickets.status, 'COMPLETED')
        )
      );

    const totalRepairCosts = parseFloat(repairResult[0]?.totalRepair?.toString() || '0');

    // 3. Calculate Depreciation & Book Value
    const price = parseFloat(asset.totalCost?.toString() || '0');
    const lifeMonths = asset.usefulLifeMonths || 60; // Default to 5 years if not set
    let currentBookValue = price;

    if (asset.purchaseDate && price > 0) {
      const pDate = new Date(asset.purchaseDate);
      const now = new Date();
      
      // Calculate months elapsed
      const monthsElapsed = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());

      if (monthsElapsed > 0) {
        const depreciationPerMonth = price / lifeMonths;
        const totalDepreciation = depreciationPerMonth * monthsElapsed;
        currentBookValue = Math.max(0, price - totalDepreciation);
      }
    }

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
    console.error(`[getAssetFinancialVitals] Error for asset ${assetId}:`, error);
    throw error;
  }
}
