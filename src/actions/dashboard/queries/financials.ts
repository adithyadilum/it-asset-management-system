import { and, count, eq, isNotNull, isNull, sql, inArray, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetPurchases,
  locations,
  models,
  softwareLicenses,
  softwareAllocations,
} from '@/db/schema';
import { DEFAULT_USEFUL_LIFE_MONTHS } from '@/lib/constants/dashboard';
import type {
  TopHighValueAssetRow,
  SoftwareOptimizationRow,
} from '@/types/dashboard';
import { straightLineNbvSqlFragment } from '@/lib/depreciation';

export async function getDashboardTopHighValueAssetsInternal(): Promise<TopHighValueAssetRow[]> {
  const bookValueSql = sql<number>`
    ${sql.raw(straightLineNbvSqlFragment(
      'asset_purchases.total_cost',
      '1', // no exchange rate needed for the row output (it gets handled per row)
      'assets.salvage_value',
      'assets.useful_life_months',
      'asset_purchases.purchase_date'
    ))}
  `;

  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      locationName: locations.name,
      totalCost: assetPurchases.totalCost,
      currencyCode: assetPurchases.currencyCode,
      bookValue: bookValueSql,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(
      and(
        eq(assets.isArchived, false),
        isNotNull(assetPurchases.totalCost)
      )
    )
    .orderBy(desc(bookValueSql))
    .limit(10);

  return rows.map((r) => {
    const cost = parseFloat(r.totalCost?.toString() || '0');
    const bValue = parseFloat(r.bookValue?.toString() || '0');

    return {
      assetId: r.assetId,
      assetTag: r.assetTag,
      assetName: r.assetName || 'Unknown Asset',
      location: r.locationName || 'Unassigned',
      originalCost: cost > 0 ? cost : null,
      currentBookValue: bValue > 0 ? bValue : null,
      currencyCode: r.currencyCode || 'USD',
    };
  });
}

export async function getDashboardSoftwareOptimizationInternal(): Promise<SoftwareOptimizationRow[]> {
  const licenses = await db
    .select({
      id: softwareLicenses.id,
      totalSeats: softwareLicenses.totalSeats,
      assetId: softwareLicenses.assetId,
      modelName: models.name,
    })
    .from(softwareLicenses)
    .innerJoin(models, eq(softwareLicenses.modelId, models.id))
    .where(eq(softwareLicenses.isActive, true));

  const allocations = await db
    .select({
      licenseId: softwareAllocations.licenseId,
      count: count(),
    })
    .from(softwareAllocations)
    .where(isNull(softwareAllocations.revokedAt))
    .groupBy(softwareAllocations.licenseId);

  const allocMap = new Map(allocations.map((a) => [a.licenseId, a.count]));

  const softwareAssetIds = licenses
    .map((l) => l.assetId)
    .filter(Boolean) as string[];
  let softwarePurchasesMap = new Map<string, number>();

  if (softwareAssetIds.length > 0) {
    const purchases = await db
      .select({
        assetId: assetPurchases.assetId,
        totalCost: assetPurchases.totalCost,
      })
      .from(assetPurchases)
      .where(inArray(assetPurchases.assetId, softwareAssetIds));

    softwarePurchasesMap = new Map(
      purchases.map((p) => [
        p.assetId,
        parseFloat(p.totalCost?.toString() || '0'),
      ])
    );
  }

  return licenses.map((lic) => {
    const assigned = allocMap.get(lic.id) || 0;
    const idle = Math.max(0, lic.totalSeats - assigned);
    const licenseCost = lic.assetId
      ? softwarePurchasesMap.get(lic.assetId) || 0
      : 0;
    const computedCostPerSeat =
      lic.totalSeats > 0 ? licenseCost / lic.totalSeats : 0;
    const costPerSeat =
      computedCostPerSeat > 0 ? computedCostPerSeat : 10;
    const monthlyLeak = idle * costPerSeat;

    return {
      id: lic.id,
      productName: lic.modelName || 'Unknown License',
      totalSeats: lic.totalSeats,
      assignedSeats: assigned,
      idleSeats: idle,
      costPerSeat,
      monthlyLeak,
      currencyCode: 'USD',
    };
  });
}

