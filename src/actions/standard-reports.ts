'use server';

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

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
): Promise<ReportPreviewRow[]> {
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
      
      const statusEq = filters.status === 'Active' ? true : filters.status === 'Inactive' ? false : undefined;

      // Filter by Asset Type mapper for Master Data (categories/brands/models)
      let dbPillar: string | undefined = undefined;
      if (filters.assetType && filters.assetType !== 'All Assets') {
        dbPillar = filters.assetType;
        if (dbPillar === 'Hardware') dbPillar = 'IT & Digital';
        if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
        if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';
      }

      switch (filters.masterDataType) {
        case 'asset-categories': {
          let q = db.select().from(categories).$dynamic();
          if (statusEq !== undefined) q = q.where(eq(categories.isActive, statusEq));
          if (dbPillar) q = q.where(eq(categories.pillar, dbPillar as never));
          
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

      return data;
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

    const rows = await db
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
        purchaseDate: assetPurchases.purchaseDate,
        purchaseCost: assetPurchases.totalCost,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(brands, eq(models.brandId, brands.id))
      .leftJoin(locations, eq(assets.locationId, locations.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(whereCondition)
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
    }

    const data: ReportPreviewRow[] = rows.map((row) => ({
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
      'Purchase Date': row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString() : '-',
      'Purchase Cost': row.purchaseCost ? String(row.purchaseCost) : '-',
      'Warranty Expiry': row.warrantyExpiry ? new Date(row.warrantyExpiry).toLocaleDateString() : '-',
    }));

    return data;
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
