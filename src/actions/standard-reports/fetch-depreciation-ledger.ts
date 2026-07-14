import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, models, categories, assetPurchases } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

export async function fetchDepreciationLedger(
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
    label: 'standardReports.fetchReportPreview.depreciationLedger',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const cost = Number(row.totalCost || 0);
    const salvage = Number(row.salvageValue || 0);
    const usefulLife = row.usefulLifeMonths || 36;
    const ageMonths = row.purchaseDate
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(row.purchaseDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30.4)
          )
        )
      : Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(row.createdAt).getTime()) /
              (1000 * 60 * 60 * 24 * 30.4)
          )
        );

    const monthlyDep = usefulLife > 0 ? (cost - salvage) / usefulLife : 0;
    const accDep = monthlyDep * Math.min(usefulLife, ageMonths);
    const bookVal = cost - accDep;
    const depPct = cost > 0 ? (accDep / cost) * 100 : 0;

    return {
      id: row.id,
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      Category: row.category,
      'Purchase Cost': String(cost.toFixed(2)),
      'Useful Life (Months)': String(usefulLife),
      'Salvage Value': String(salvage.toFixed(2)),
      'Age (Months)': String(ageMonths),
      'Monthly Depreciation': monthlyDep.toFixed(2),
      'Accumulated Depreciation': accDep.toFixed(2),
      'Current Book Value': bookVal.toFixed(2),
      'Depreciation %': depPct.toFixed(1) + '%',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
