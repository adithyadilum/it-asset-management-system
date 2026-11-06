import {
  and,
  count,
  eq,
  isNotNull,
  isNull,
  sql,
  inArray,
  desc,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetPurchases,
  locations,
  models,
  categories,
  softwareLicenses,
  softwareAllocations,
  softwareFinancialTerms,
} from '@/db/schema';
import type {
  TopHighValueAssetRow,
  SoftwareOptimizationRow,
} from '@/types/dashboard';
import { recordedMoneySql } from '@/lib/recorded-money';
import { softwareMonthlySeatCost } from '@/lib/software-monthly-cost';
import { straightLineNbvSqlFragment } from '@/lib/depreciation';

export async function getDashboardTopHighValueAssetsInternal(): Promise<
  TopHighValueAssetRow[]
> {
  const fx =
    "CASE WHEN asset_purchases.currency_code = 'LKR' THEN 1 WHEN asset_purchases.exchange_rate > 0 AND asset_purchases.exchange_rate <> 1 THEN asset_purchases.exchange_rate ELSE NULL END";
  const bookValueSql = sql<number>`
    ${sql.raw(
      straightLineNbvSqlFragment(
        `asset_purchases.total_cost * (${fx})`,
        '1',
        `assets.salvage_value * (${fx})`,
        'assets.useful_life_months',
        'asset_purchases.purchase_date',
        undefined,
        'categories.pillar'
      )
    )}
  `;

  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      locationName: locations.name,
      totalCost: recordedMoneySql(
        assetPurchases.totalCost,
        assetPurchases.currencyCode,
        assetPurchases.exchangeRate
      ),
      currencyCode: assetPurchases.currencyCode,
      bookValue: bookValueSql,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(categories.id, models.categoryId))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(
      and(eq(assets.isArchived, false), isNotNull(assetPurchases.totalCost))
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
      currencyCode: 'LKR',
    };
  });
}

export async function getDashboardSoftwareOptimizationInternal(): Promise<
  SoftwareOptimizationRow[]
> {
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

  const terms = licenses.length
    ? await db
        .select()
        .from(softwareFinancialTerms)
        .where(
          inArray(
            softwareFinancialTerms.licenseId,
            licenses.map((l) => l.id)
          )
        )
    : [];
  const asOf = new Date();

  return licenses.map((lic) => {
    const assigned = allocMap.get(lic.id) || 0;
    const idle = Math.max(0, lic.totalSeats - assigned);
    const costPerSeat = softwareMonthlySeatCost(
      terms.filter((t) => t.licenseId === lic.id),
      asOf
    );
    const monthlyLeak = costPerSeat == null ? null : idle * costPerSeat;

    return {
      id: lic.id,
      productName: lic.modelName || 'Unknown License',
      totalSeats: lic.totalSeats,
      assignedSeats: assigned,
      idleSeats: idle,
      costPerSeat,
      monthlyLeak,
      currencyCode: 'LKR',
    };
  });
}
