import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { assets, assetPurchases, maintenanceTickets } from '@/db/schema';
import { calculateCurrentBookValue } from '@/lib/depreciation';

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
 * Reads financial vitals for an already-authorized, resolved asset UUID.
 * Authorization must remain at the action/service boundary.
 */
export async function getAssetFinancialVitalsByResolvedId(
  resolvedAssetId: string
): Promise<AssetFinancialVitals> {
  const [assetResult, repairResult] = await Promise.all([
    db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        usefulLifeMonths: assets.usefulLifeMonths,
        salvageValue: assets.salvageValue,
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
      .limit(1),
    db
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
      ),
  ]);

  if (assetResult.length === 0) {
    throw new Error('Asset not found');
  }

  const asset = assetResult[0];
  const totalRepairCosts = Number.parseFloat(
    repairResult[0]?.totalRepair?.toString() || '0'
  );
  const price = Number.parseFloat(asset.totalCost?.toString() || '0');
  const salvage = Number.parseFloat(asset.salvageValue?.toString() || '0');
  const currentBookValue = calculateCurrentBookValue({
    cost: price,
    salvageValue: salvage,
    usefulLifeMonths: asset.usefulLifeMonths,
    purchaseDate: asset.purchaseDate,
  });

  return {
    assetId: asset.id,
    assetTag: asset.assetTag,
    purchaseDate: asset.purchaseDate,
    basePrice: Number.parseFloat(asset.basePrice?.toString() || '0'),
    tax: Number.parseFloat(asset.tax?.toString() || '0'),
    shippingCost: Number.parseFloat(asset.shippingCost?.toString() || '0'),
    totalCost: price,
    currencyCode: asset.currencyCode || 'LKR',
    warrantyExpiry: asset.warrantyExpiry,
    isUnderWarranty: asset.warrantyExpiry
      ? new Date(asset.warrantyExpiry) > new Date()
      : false,
    usefulLifeMonths: asset.usefulLifeMonths || 60,
    currentBookValue: Math.round(currentBookValue * 100) / 100,
    totalRepairCosts,
    totalTCO: Math.round((price + totalRepairCosts) * 100) / 100,
  };
}
