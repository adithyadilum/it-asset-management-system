'use server';

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assetAssignments,
  assets,
  categories,
  locations,
  models,
  users,
  brands,
  vendors,
  owners,
  assetPurchases,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewRow } from '@/types/standard-reports';
import { customStatuses } from '@/db/schema';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface ReportPreviewFilters {
  source?: string;
  assetType?: string;
  category?: string;
  location?: string;
  status?: string;
  masterDataType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function getStandardReportsFilterOptions() {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error('Forbidden: You do not have permission to access reports.');
  }

  try {
    const [dbLocations, dbCustomStatuses, dbCategories] = await Promise.all([
      db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.isActive, true)),
      db
        .select({ name: customStatuses.name })
        .from(customStatuses)
        .where(eq(customStatuses.isActive, true)),
      db
        .select({ name: categories.name, pillar: categories.pillar })
        .from(categories)
        .where(eq(categories.isActive, true)),
    ]);

    const defaultStatuses = [
      'Available',
      'Assigned',
      'In Repair',
      'Defective',
      'Lost',
      'Retired',
      'Pending Disposal',
      'Disposed',
    ];

    return {
      assetTypes: [
        'All Assets',
        'Hardware',
        'Software',
        'Electronics',
        'Furniture',
      ],
      categories: dbCategories.map((c) => ({
        name: c.name,
        pillar: c.pillar,
      })),
      locations: [
        'All locations',
        ...Array.from(new Set(dbLocations.map((l) => l.name))).sort(),
      ],
      statuses: [
        'All statuses',
        ...defaultStatuses,
        ...Array.from(new Set(dbCustomStatuses.map((s) => s.name))).sort(),
      ],
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'standardReports.getStandardReportsFilterOptions',
      error,
    });
    throw new Error('Failed to fetch filter options.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'standardReports.getStandardReportsFilterOptions',
      startTime: actionTimer,
    });
  }
}

export async function fetchReportPreview(
  filters: ReportPreviewFilters
): Promise<{ data: ReportPreviewRow[]; pageCount: number; totalRows: number }> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Please log in.');
  }

  // Allow GlobalAdmin, ITOperator, and FinanceAuditor for report viewing
  const allowedRoles = ['GlobalAdmin', 'ITOperator', 'FinanceAuditor'];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to generate reports.'
    );
  }

  try {
    const pageSize = filters.pageSize ?? 16;
    const page = filters.page ?? 0;
    const offset = page * pageSize;

    // -------------------------------------------------------------------------
    // MASTER DATA SOURCE LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Master Data') {
      const queryTimer = startLatencyTimer();
      let data: ReportPreviewRow[] = [];
      let totalRows = 0;
      
      const statusEq = filters.status === 'Active' ? true : filters.status === 'Inactive' ? false : undefined;

      // Filter by Asset Type mapper for Master Data (categories/brands/models)
      let dbPillar: string | undefined = undefined;
      if (filters.assetType && filters.assetType !== 'All Assets') {
        dbPillar = filters.assetType;
        if (dbPillar === 'Hardware') dbPillar = 'IT & Digital';
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
          if (statusEq !== undefined) q = q.where(eq(categories.isActive, statusEq));
          if (dbPillar) q = q.where(eq(categories.pillar, dbPillar as never));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': 'Category', 
            'Name': r.name, 
            'Description': r.categoryCode || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
          }));
          break;
        }
        case 'locations': {
          let q = db.select().from(locations).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(locations.isActive, statusEq));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': r.type || 'Location', 
            'Name': r.name, 
            'Description': r.locationCode || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
          }));
          break;
        }
        case 'brands': {
          let q = db.select().from(brands).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(brands.isActive, statusEq));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': 'Brand', 
            'Name': r.name, 
            'Description': r.brandCode || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
          }));
          break;
        }
        case 'device-models': {
          let q = db.select({ 
            id: models.id, 
            name: models.name, 
            categoryName: categories.name, 
            isActive: models.isActive,
            modelCode: models.modelCode
          }).from(models).leftJoin(categories, eq(models.categoryId, categories.id)).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(models.isActive, statusEq));
          if (dbPillar) q = q.where(eq(categories.pillar, dbPillar as never));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': r.categoryName || 'Model', 
            'Name': r.name, 
            'Description': r.modelCode || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
          }));
          break;
        }
        case 'vendors': {
          let q = db.select().from(vendors).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(vendors.isActive, statusEq));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': 'Vendor', 
            'Name': r.companyName, 
            'Description': r.email || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
          }));
          break;
        }
        case 'owners': {
          let q = db.select().from(owners).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(owners.isActive, statusEq));
          
          totalRows = await getCount(q);
          const rows = await q.limit(pageSize).offset(offset);
          data = rows.map(r => ({ 
            id: String(r.id), 
            'Record ID': String(r.id), 
            'Type': 'Owner', 
            'Name': r.companyName, 
            'Description': r.ownerCode || '-', 
            'Status': r.isActive ? 'Active' : 'Inactive',
            'CreatedAt': '-',
            'UpdatedAt': '-'
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

    // -------------------------------------------------------------------------
    // ASSET REGISTRY LOGIC (Default)
    // -------------------------------------------------------------------------
    const conditions = [];

    // Asset Type filter — map frontend generic names to DB pillars
    if (filters.assetType && filters.assetType !== 'All Assets') {
      let dbPillar = filters.assetType;
      if (dbPillar === 'Hardware') dbPillar = 'IT & Digital';
      if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
      if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';

      conditions.push(eq(categories.pillar, dbPillar as never));
    }

    // Category filter
    if (filters.category && filters.category !== 'All categories' && filters.category !== '') {
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

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const queryTimer = startLatencyTimer();

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
    const totalRowsCount = await db.select({ count: sql<number>`count(*)::int` }).from(assets)
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
    const purchasedDataByAssetId = new Map<string, { purchaseDate: Date | null; cost: number | null; warrantyExpiry: Date | null }>();

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
        'Asset ID': row.assetTag,
        'Asset Name': row.name,
        'Category': row.category,
        'Brand': row.brand || '-',
        'Model': row.model || '-',
        'Serial Number': row.serialNumber || '-',
        'Status': row.status,
        'Location': row.location || '-',
        'Assigned To': assignedUserByAssetId.get(row.id) ?? '-',
        'Purchase Date': pData?.purchaseDate ? new Date(pData.purchaseDate).toLocaleDateString() : '-',
        'Purchase Cost': pData?.cost ? String(pData.cost) : '-',
        'Warranty Expiry': pData?.warrantyExpiry ? new Date(pData.warrantyExpiry).toLocaleDateString() : '-',
      };
    });

    return {
      data,
      totalRows,
      pageCount: Math.ceil(totalRows / pageSize),
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'standardReports.fetchReportPreview',
      error,
    });
    throw new Error('Failed to fetch report preview data.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'standardReports.fetchReportPreview',
      startTime: actionTimer,
    });
  }
}
