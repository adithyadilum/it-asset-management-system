import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories, locations, brands, models, vendors, owners } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewFilters, ReportPreviewRow } from '@/types/standard-reports';

export async function fetchMasterData(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  let data: ReportPreviewRow[] = [];
  let totalRows = 0;

  const statusEq =
    filters.status === 'Active'
      ? true
      : filters.status === 'Inactive'
        ? false
        : undefined;

  let dbPillar: string | undefined = undefined;
  if (filters.assetType && filters.assetType !== 'All Assets') {
    dbPillar = filters.assetType;
    if (dbPillar === 'Hardware') dbPillar = 'Hardware';
    if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
    if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCount = async (q: any) => {
    const rows = await q.execute();
    return rows.length;
  };

  switch (filters.masterDataType) {
    case 'asset-categories': {
      let q = db.select().from(categories).$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(categories.isActive, statusEq));
      if (dbPillar) q = q.where(eq(categories.pillar, dbPillar as never));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.categoryCode || '-',
        Type: 'Category',
        Name: r.name,
        Description: r.categoryCode || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
    case 'locations': {
      let q = db.select().from(locations).$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(locations.isActive, statusEq));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.locationCode || '-',
        Type: r.type || 'Location',
        Name: r.name,
        Description: r.locationCode || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
    case 'brands': {
      let q = db.select().from(brands).$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(brands.isActive, statusEq));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.brandCode || '-',
        Type: 'Brand',
        Name: r.name,
        Description: r.brandCode || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
    case 'device-models': {
      let q = db
        .select({
          id: models.id,
          name: models.name,
          categoryName: categories.name,
          isActive: models.isActive,
          modelCode: models.modelCode,
        })
        .from(models)
        .leftJoin(categories, eq(models.categoryId, categories.id))
        .$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(models.isActive, statusEq));
      if (dbPillar) q = q.where(eq(categories.pillar, dbPillar as never));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.modelCode || '-',
        Type: r.categoryName || 'Model',
        Name: r.name,
        Description: r.modelCode || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
    case 'vendors': {
      let q = db.select().from(vendors).$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(vendors.isActive, statusEq));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.vendorCode || '-',
        Type: 'Vendor',
        Name: r.companyName,
        Description: r.email || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
    case 'owners': {
      let q = db.select().from(owners).$dynamic();
      if (statusEq !== undefined)
        q = q.where(eq(owners.isActive, statusEq));

      totalRows = await getCount(q);
      const rows = await q.limit(pageSize).offset(offset);
      data = rows.map((r) => ({
        id: String(r.id),
        'Record Code': r.ownerCode || '-',
        Type: 'Owner',
        Name: r.companyName,
        Description: r.ownerCode || '-',
        Status: r.isActive ? 'Active' : 'Inactive',
        CreatedAt: '-',
        UpdatedAt: '-',
      }));
      break;
    }
  }

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.masterData',
    startTime: queryTimer,
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
