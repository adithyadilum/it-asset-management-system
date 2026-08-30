import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  models,
  categories,
  assetPurchases,
  maintenanceTickets,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import {
  DEFAULT_USEFUL_LIFE_MONTHS,
  calculateCurrentBookValue,
} from '@/lib/depreciation';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

export async function fetchTcoOverview(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (
    filters.category &&
    filters.category !== 'All categories' &&
    filters.category !== ''
  ) {
    conditions.push(eq(categories.name, filters.category));
  }
  if (filters.assetType && filters.assetType !== 'All Assets') {
    let dbPillar = filters.assetType;
    if (dbPillar === 'Hardware') dbPillar = 'Hardware';
    if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
    if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';
    conditions.push(eq(categories.pillar, dbPillar as never));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      category: categories.name,
      usefulLifeMonths: assets.usefulLifeMonths,
      salvageValue: assets.salvageValue,
      createdAt: assets.createdAt,
      totalCost: assetPurchases.totalCost,
      purchaseDate: assetPurchases.purchaseDate,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assets.createdAt))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.tcoOverview',
    startTime: queryTimer,
  });

  const assetIds = rows.map((r) => r.id);
  const maintenanceStats = new Map<
    string,
    { totalCost: number; count: number }
  >();
  if (assetIds.length > 0) {
    const mt = await db
      .select({
        assetId: maintenanceTickets.assetId,
        actualCost: maintenanceTickets.actualCost,
      })
      .from(maintenanceTickets)
      .where(inArray(maintenanceTickets.assetId, assetIds));

    for (const ticket of mt) {
      const stats = maintenanceStats.get(ticket.assetId) || {
        totalCost: 0,
        count: 0,
      };
      stats.count += 1;
      stats.totalCost += Number(ticket.actualCost || 0);
      maintenanceStats.set(ticket.assetId, stats);
    }
  }

  const data: ReportPreviewRow[] = rows.map((row) => {
    const cost = Number(row.totalCost || 0);
    const salvage = Number(row.salvageValue || 0);
    // Was 36 months and 30.4-day steps here, 60 months and calendar months in
    // lib/depreciation.ts — the same asset reported two different book values
    // depending on which screen you opened.
    const usefulLife = row.usefulLifeMonths || DEFAULT_USEFUL_LIFE_MONTHS;
    const depreciationBasis = row.purchaseDate ?? row.createdAt;
    const bookVal = calculateCurrentBookValue({
      cost,
      salvageValue: salvage,
      usefulLifeMonths: usefulLife,
      purchaseDate: depreciationBasis,
    });
    const accDep = cost - bookVal;

    const stats = maintenanceStats.get(row.id) || {
      totalCost: 0,
      count: 0,
    };
    const tco = cost + stats.totalCost;

    return {
      id: row.id,
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      Category: row.category,
      'Purchase Cost': String(cost.toFixed(2)),
      'Total Maintenance Cost': String(stats.totalCost.toFixed(2)),
      'Maintenance Count': String(stats.count),
      'Accumulated Depreciation': accDep.toFixed(2),
      'Current Book Value': bookVal.toFixed(2),
      TCO: String(tco.toFixed(2)),
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
