import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import { assetPurchases, assets, models, categories, vendors } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewFilters, ReportPreviewRow } from '@/types/standard-reports';

export async function fetchPurchaseRecords(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (
    filters.location &&
    filters.location !== 'All locations' &&
    filters.location !== 'All Vendors'
  ) {
    conditions.push(eq(vendors.companyName, filters.location));
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${assetPurchases.purchaseDate} >= ${filters.dateFrom}`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${assetPurchases.purchaseDate} <= ${filters.dateTo}`
    );
  }
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

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: assetPurchases.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      vendor: vendors.companyName,
      purchaseDate: assetPurchases.purchaseDate,
      basePrice: assetPurchases.basePrice,
      tax: assetPurchases.tax,
      shippingCost: assetPurchases.shippingCost,
      totalCost: assetPurchases.totalCost,
      currency: assetPurchases.currencyCode,
      warrantyExpiry: assetPurchases.warrantyExpiry,
    })
    .from(assetPurchases)
    .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(vendors, eq(assetPurchases.vendorId, vendors.id))
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assetPurchases)
    .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(vendors, eq(assetPurchases.vendorId, vendors.id))
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assetPurchases.purchaseDate))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.purchaseRecords',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const wRemaining = row.warrantyExpiry
      ? Math.floor(
          (new Date(row.warrantyExpiry).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : -1;
    return {
      id: String(row.id),
      'Purchase ID': String(row.id),
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      Vendor: row.vendor || '-',
      'Purchase Date': row.purchaseDate
        ? new Date(row.purchaseDate).toLocaleDateString()
        : '-',
      'Base Price': row.basePrice ? String(row.basePrice) : '-',
      Tax: row.tax ? String(row.tax) : '-',
      'Shipping Cost': row.shippingCost ? String(row.shippingCost) : '-',
      'Total Cost': row.totalCost ? String(row.totalCost) : '-',
      Currency: row.currency || 'LKR',
      'Warranty Expiry': row.warrantyExpiry
        ? new Date(row.warrantyExpiry).toLocaleDateString()
        : '-',
      'Warranty Remaining (Days)':
        wRemaining >= 0 ? String(wRemaining) : 'Expired/Unknown',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
