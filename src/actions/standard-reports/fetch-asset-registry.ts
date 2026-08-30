import { eq, and, isNull, inArray, asc, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  categories,
  brands,
  models,
  locations,
  users,
  assetAssignments,
  assetPurchases,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

export async function fetchAssetRegistry(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  // Asset Type filter — map frontend generic names to DB pillars
  if (filters.assetType && filters.assetType !== 'All Assets') {
    let dbPillar = filters.assetType;
    if (dbPillar === 'Hardware') dbPillar = 'Hardware';
    if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
    if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';

    conditions.push(eq(categories.pillar, dbPillar as never));
  }

  // Category filter
  if (
    filters.category &&
    filters.category !== 'All categories' &&
    filters.category !== ''
  ) {
    conditions.push(eq(categories.name, filters.category));
  }

  // Location filter
  if (filters.location && filters.location !== 'All locations') {
    conditions.push(eq(locations.name, filters.location));
  }

  // Status filter
  if (filters.status && filters.status !== 'All statuses') {
    conditions.push(eq(assets.status, filters.status));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      category: categories.name,
      brand: brands.name,
      model: models.name,
      serialNumber: assets.serialNumber,
      status: assets.status,
      location: locations.name,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .where(whereCondition);

  // Get total rows for pagination
  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assets.updatedAt), asc(assets.assetTag))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.query',
    startTime: queryTimer,
  });

  // Resolve assigned users for each asset (same pattern as asset-registry-repo)
  const assetIds = rows.map((row) => row.id);
  const assignedUserByAssetId = new Map<string, string>();
  const purchasedDataByAssetId = new Map<
    string,
    {
      purchaseDate: Date | null;
      cost: number | null;
      warrantyExpiry: Date | null;
    }
  >();

  if (assetIds.length > 0) {
    const activeAssignments = await db
      .select({
        assetId: assetAssignments.assetId,
        assignedTo: users.name,
      })
      .from(assetAssignments)
      .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
      .where(
        and(
          inArray(assetAssignments.assetId, assetIds),
          isNull(assetAssignments.returnedDate)
        )
      )
      .orderBy(desc(assetAssignments.assignedDate));

    for (const assignment of activeAssignments) {
      if (
        !assignedUserByAssetId.has(assignment.assetId) &&
        assignment.assignedTo
      ) {
        assignedUserByAssetId.set(assignment.assetId, assignment.assignedTo);
      }
    }

    // Fetch purchase data separately to avoid duplicate rows in main query
    const purchases = await db
      .select({
        assetId: assetPurchases.assetId,
        purchaseDate: assetPurchases.purchaseDate,
        totalCost: assetPurchases.totalCost,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assetPurchases)
      .where(inArray(assetPurchases.assetId, assetIds))
      .orderBy(desc(assetPurchases.updatedAt));

    for (const purchase of purchases) {
      if (!purchasedDataByAssetId.has(purchase.assetId)) {
        purchasedDataByAssetId.set(purchase.assetId, {
          purchaseDate: purchase.purchaseDate as Date | null,
          cost: purchase.totalCost as number | null,
          warrantyExpiry: purchase.warrantyExpiry as Date | null,
        });
      }
    }
  }

  const data: ReportPreviewRow[] = rows.map((row) => {
    const pData = purchasedDataByAssetId.get(row.id);
    return {
      id: row.id,
      'Asset Tag': row.assetTag,
      'Asset Name': row.name,
      Category: row.category,
      Brand: row.brand || '-',
      Model: row.model || '-',
      'Serial Number': row.serialNumber || '-',
      Status: row.status,
      Location: row.location || '-',
      'Assigned To': assignedUserByAssetId.get(row.id) ?? '-',
      'Purchase Date': pData?.purchaseDate
        ? new Date(pData.purchaseDate).toLocaleDateString()
        : '-',
      'Purchase Cost': pData?.cost ? String(pData.cost) : '-',
      'Warranty Expiry': pData?.warrantyExpiry
        ? new Date(pData.warrantyExpiry).toLocaleDateString()
        : '-',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
