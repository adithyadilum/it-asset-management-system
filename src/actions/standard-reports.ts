'use server';

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  isNotNull,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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
  maintenanceTickets,
  assetDisposals,
  softwareLicenses,
  softwareAllocations,
  systemAuditLogs,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewRow } from '@/types/standard-reports';
import {
  resolveTargetEntityLabels,
  resolveAuditValueLabels,
} from '@/actions/audit-log';
import { extractLabelFromValues } from '@/lib/audit';
import { customStatuses } from '@/db/schema';
import { reportPreviewFiltersSchema } from '@/lib/validations/standard-reports';

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
    const [dbLocations, dbCustomStatuses, dbCategories, dbVendors] =
      await Promise.all([
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
        db
          .select({ name: vendors.companyName })
          .from(vendors)
          .where(eq(vendors.isActive, true)),
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
      assignmentStates: [
        'All States',
        'pending approval',
        'assigned',
        'overdue',
        'requested',
        'returned',
      ],
      returnConditions: [
        'All Conditions',
        'New',
        'Excellent',
        'Fair',
        'Poor',
        'Damaged',
      ],
      maintenanceStatuses: ['All Statuses', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      ticketTypes: ['All Types', 'VENDOR', 'INTERNAL'],
      disposalStatuses: [
        'All Statuses',
        'Pending Approval',
        'Approved',
        'Rejected',
        'Completed',
      ],
      licenseTypes: [
        'All Types',
        'Perpetual',
        'Subscription',
        'Open Source / Free',
      ],
      auditActionTypes: ['All Actions', 'CREATE', 'UPDATE', 'DELETE'],
      vendors: [
        'All Vendors',
        ...Array.from(new Set(dbVendors.map((v) => v.name))).sort(),
      ],
      masterDataTypes: [
        { value: '', label: 'All Record Types' },
        { value: 'asset-categories', label: 'Asset Categories' },
        { value: 'locations', label: 'Locations' },
        { value: 'brands', label: 'Brands' },
        { value: 'device-models', label: 'Device Models' },
        { value: 'vendors', label: 'Vendors' },
        { value: 'owners', label: 'Owners' },
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

function humanizeFieldName(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\bId\b/gi, 'ID')
    .replace(/\bMac\b/gi, 'MAC')
    .replace(/\bIp\b/gi, 'IP')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) =>
      word.toUpperCase() === 'ID' ||
      word.toUpperCase() === 'IP' ||
      word.toUpperCase() === 'MAC'
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function buildEventDetailsSentence(
  action: string,
  entityType: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  const act = action.trim().toUpperCase();

  if (act === 'LOGIN') return 'User logged in';
  if (act === 'LOGOUT') return 'User logged out';

  if (!oldValue || !newValue) {
    if (act === 'CREATE')
      return `Created ${humanizeFieldName(entityType).toLowerCase()}`;
    if (act === 'DELETE')
      return `Deleted ${humanizeFieldName(entityType).toLowerCase()}`;
    return 'Updated record';
  }

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  for (const key of keys) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      const oldDisplay = formatAuditValue(key, oldValue[key]);
      const newDisplay = formatAuditValue(key, newValue[key]);
      const label = humanizeFieldName(key);

      if (act === 'CREATE') {
        return `Created ${label} as [${newDisplay}]`;
      }
      if (act === 'DELETE') {
        return `Deleted ${label} [${oldDisplay}]`;
      }
      return `Changed ${label} from [${oldDisplay}] → [${newDisplay}]`;
    }
  }

  return 'Updated record';
}

export async function fetchReportPreview(
  filters: ReportPreviewFilters
): Promise<{ data: ReportPreviewRow[]; pageCount: number; totalRows: number }> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Please log in.');
  }

  // Allow GlobalAdmin, ITOperator, and FinancialAuditor for report viewing
  const allowedRoles = ['GlobalAdmin', 'ITOperator', 'FinancialAuditor'];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to generate reports.'
    );
  }

  try {
    // Validate and coerce filter params with Zod
    const parsedFilters = reportPreviewFiltersSchema.safeParse(filters);
    if (!parsedFilters.success) {
      throw new Error(
        parsedFilters.error.issues[0]?.message ?? 'Invalid report filters.'
      );
    }
    const validatedFilters = parsedFilters.data;
    // Shadow the parameter so all downstream references use the validated data
    filters = validatedFilters;

    const pageSize = validatedFilters.pageSize;
    const page = validatedFilters.page;
    const offset = page * pageSize;

    // -------------------------------------------------------------------------
    // MASTER DATA SOURCE LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Master Data') {
      const queryTimer = startLatencyTimer();
      let data: ReportPreviewRow[] = [];
      let totalRows = 0;

      const statusEq =
        filters.status === 'Active'
          ? true
          : filters.status === 'Inactive'
            ? false
            : undefined;

      // Filter by Asset Type mapper for Master Data (categories/brands/models)
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

    // -------------------------------------------------------------------------
    // ACTIVE ASSIGNMENTS LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Active Assignments') {
      const queryTimer = startLatencyTimer();
      const conditions = [isNull(assetAssignments.returnedDate)];

      if (
        filters.status &&
        filters.status !== 'All statuses' &&
        filters.status !== 'All States'
      ) {
        conditions.push(eq(assetAssignments.state, filters.status as never));
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${assetAssignments.assignedDate} >= ${filters.dateFrom}::timestamp`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${assetAssignments.assignedDate} <= ${filters.dateTo}::timestamp`
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
      const assignedToUser = alias(users, 'assignedToUser');
      const assignedByUser = alias(users, 'assignedByUser');

      const baseQuery = db
        .select({
          id: assetAssignments.id,
          assetTag: assets.assetTag,
          assetName: assets.name,
          assignedTo: assignedToUser.name,
          assignedBy: assignedByUser.name,
          assignedDate: assetAssignments.assignedDate,
          expectedReturnDate: assetAssignments.expectedReturnDate,
          state: assetAssignments.state,
          acceptanceStatus: assetAssignments.acceptanceStatus,
          notes: assetAssignments.notes,
        })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          assignedToUser,
          eq(assetAssignments.assignedToUserId, assignedToUser.id)
        )
        .leftJoin(
          assignedByUser,
          eq(assetAssignments.assignedById, assignedByUser.id)
        )
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          assignedToUser,
          eq(assetAssignments.assignedToUserId, assignedToUser.id)
        )
        .leftJoin(
          assignedByUser,
          eq(assetAssignments.assignedById, assignedByUser.id)
        )
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(assetAssignments.assignedDate))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.activeAssignments',
        startTime: queryTimer,
      });

      const data: ReportPreviewRow[] = rows.map((row) => {
        const daysSinceAssigned = Math.floor(
          (Date.now() - new Date(row.assignedDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return {
          id: String(row.id),
          'Assignment ID': String(row.id),
          'Asset Tag': row.assetTag,
          'Asset Name': row.assetName || '-',
          'Assigned To': row.assignedTo || '-',
          'Assigned By': row.assignedBy || '-',
          'Assigned Date': row.assignedDate
            ? new Date(row.assignedDate).toLocaleDateString()
            : '-',
          'Expected Return Date': row.expectedReturnDate
            ? new Date(row.expectedReturnDate).toLocaleDateString()
            : '-',
          State: row.state,
          'Acceptance Status': row.acceptanceStatus || 'Pending',
          'Days Since Assigned':
            daysSinceAssigned >= 0 ? String(daysSinceAssigned) : '0',
          Notes: row.notes || '-',
        };
      });

      return {
        data,
        totalRows,
        pageCount: Math.ceil(totalRows / pageSize),
      };
    }

    // -------------------------------------------------------------------------
    // RETURN HISTORY LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Return History') {
      const queryTimer = startLatencyTimer();
      const conditions = [isNotNull(assetAssignments.returnedDate)];

      if (
        filters.status &&
        filters.status !== 'All statuses' &&
        filters.status !== 'All Conditions'
      ) {
        conditions.push(
          eq(assetAssignments.returnCondition, filters.status as never)
        );
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${assetAssignments.returnedDate} >= ${filters.dateFrom}::timestamp`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${assetAssignments.returnedDate} <= ${filters.dateTo}::timestamp`
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
      const assignedToUser = alias(users, 'assignedToUser');

      const baseQuery = db
        .select({
          id: assetAssignments.id,
          assetTag: assets.assetTag,
          assetName: assets.name,
          assignedTo: assignedToUser.name,
          assignedDate: assetAssignments.assignedDate,
          returnedDate: assetAssignments.returnedDate,
          returnCondition: assetAssignments.returnCondition,
          state: assetAssignments.state,
          notes: assetAssignments.notes,
        })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          assignedToUser,
          eq(assetAssignments.assignedToUserId, assignedToUser.id)
        )
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          assignedToUser,
          eq(assetAssignments.assignedToUserId, assignedToUser.id)
        )
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(assetAssignments.returnedDate))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.returnHistory',
        startTime: queryTimer,
      });

      const data: ReportPreviewRow[] = rows.map((row) => {
        const duration =
          row.returnedDate && row.assignedDate
            ? Math.floor(
                (new Date(row.returnedDate).getTime() -
                  new Date(row.assignedDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;
        return {
          id: String(row.id),
          'Return ID': String(row.id),
          'Asset Tag': row.assetTag,
          'Asset Name': row.assetName || '-',
          'Assigned To': row.assignedTo || '-',
          'Returned By': row.assignedTo || '-',
          'Assigned Date': row.assignedDate
            ? new Date(row.assignedDate).toLocaleDateString()
            : '-',
          'Returned Date': row.returnedDate
            ? new Date(row.returnedDate).toLocaleDateString()
            : '-',
          'Duration (Days)': String(duration >= 0 ? duration : 0),
          'Return Condition': row.returnCondition || '-',
          State: row.state,
          Notes: row.notes || '-',
        };
      });

      return {
        data,
        totalRows,
        pageCount: Math.ceil(totalRows / pageSize),
      };
    }

    // -------------------------------------------------------------------------
    // MAINTENANCE RECORDS LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Maintenance Records') {
      const queryTimer = startLatencyTimer();
      const conditions = [];

      if (filters.status && filters.status !== 'All statuses') {
        conditions.push(eq(maintenanceTickets.status, filters.status as never));
      }
      if (
        filters.assetType &&
        filters.assetType !== 'All Assets' &&
        filters.assetType !== 'All Types'
      ) {
        conditions.push(
          eq(maintenanceTickets.ticketType, filters.assetType as never)
        );
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${maintenanceTickets.createdAt} >= ${filters.dateFrom}::timestamp`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${maintenanceTickets.createdAt} <= ${filters.dateTo}::timestamp`
        );
      }
      if (
        filters.category &&
        filters.category !== 'All categories' &&
        filters.category !== ''
      ) {
        conditions.push(eq(categories.name, filters.category));
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;
      const dispatchedByUser = alias(users, 'dispatchedByUser');

      const baseQuery = db
        .select({
          id: maintenanceTickets.id,
          assetTag: assets.assetTag,
          assetName: assets.name,
          ticketType: maintenanceTickets.ticketType,
          vendorName: maintenanceTickets.vendorName,
          rmaNumber: maintenanceTickets.rmaNumber,
          reportedIssue: maintenanceTickets.reportedIssue,
          resolutionNotes: maintenanceTickets.resolutionNotes,
          estimatedCost: maintenanceTickets.estimatedCost,
          actualCost: maintenanceTickets.actualCost,
          estimatedReturnDate: maintenanceTickets.estimatedReturnDate,
          actualCompletionDate: maintenanceTickets.actualCompletionDate,
          status: maintenanceTickets.status,
          dispatchedBy: dispatchedByUser.name,
          createdAt: maintenanceTickets.createdAt,
        })
        .from(maintenanceTickets)
        .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          dispatchedByUser,
          eq(maintenanceTickets.dispatchedById, dispatchedByUser.id)
        )
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(maintenanceTickets)
        .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          dispatchedByUser,
          eq(maintenanceTickets.dispatchedById, dispatchedByUser.id)
        )
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(maintenanceTickets.createdAt))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.maintenanceRecords',
        startTime: queryTimer,
      });

      const data: ReportPreviewRow[] = rows.map((row) => {
        const costVariance =
          Number(row.actualCost || 0) - Number(row.estimatedCost || 0);
        const duration =
          row.actualCompletionDate && row.createdAt
            ? Math.floor(
                (new Date(row.actualCompletionDate).getTime() -
                  new Date(row.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : '-';
        return {
          id: String(row.id),
          'Ticket ID': String(row.id),
          'Asset Tag': row.assetTag,
          'Asset Name': row.assetName || '-',
          'Ticket Type': row.ticketType,
          'Vendor Name': row.vendorName || '-',
          'RMA Number': row.rmaNumber || '-',
          'Reported Issue': row.reportedIssue || '-',
          'Resolution Notes': row.resolutionNotes || '-',
          'Estimated Cost': row.estimatedCost ? String(row.estimatedCost) : '-',
          'Actual Cost': row.actualCost ? String(row.actualCost) : '-',
          'Cost Variance': String(costVariance.toFixed(2)),
          'Estimated Return Date': row.estimatedReturnDate
            ? new Date(row.estimatedReturnDate).toLocaleDateString()
            : '-',
          'Completion Date': row.actualCompletionDate
            ? new Date(row.actualCompletionDate).toLocaleDateString()
            : '-',
          'Duration (Days)': String(duration),
          Status: row.status,
          'Dispatched By': row.dispatchedBy || '-',
          'Created At': row.createdAt
            ? new Date(row.createdAt).toLocaleDateString()
            : '-',
        };
      });

      return {
        data,
        totalRows,
        pageCount: Math.ceil(totalRows / pageSize),
      };
    }

    // -------------------------------------------------------------------------
    // DISPOSAL RECORDS LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Disposal Records') {
      const queryTimer = startLatencyTimer();
      const conditions = [];

      if (filters.status && filters.status !== 'All statuses') {
        conditions.push(eq(assetDisposals.status, filters.status as never));
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${assetDisposals.requestedAt} >= ${filters.dateFrom}::timestamp`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${assetDisposals.requestedAt} <= ${filters.dateTo}::timestamp`
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
      const requestedByUser = alias(users, 'requestedByUser');
      const approvedByUser = alias(users, 'approvedByUser');

      const baseQuery = db
        .select({
          id: assetDisposals.id,
          assetTag: assets.assetTag,
          assetName: assets.name,
          requestedBy: requestedByUser.name,
          approvedBy: approvedByUser.name,
          status: assetDisposals.status,
          reason: assetDisposals.reason,
          justification: assetDisposals.justification,
          disposalMethod: assetDisposals.disposalMethod,
          dataWiped: assetDisposals.dataWiped,
          tagsRemoved: assetDisposals.tagsRemoved,
          salvageValue: assetDisposals.actualSalvageValue,
          bookValue: assetDisposals.bookValueAtDisposal,
          requestedAt: assetDisposals.requestedAt,
          resolvedAt: assetDisposals.resolvedAt,
        })
        .from(assetDisposals)
        .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          requestedByUser,
          eq(assetDisposals.requestedById, requestedByUser.id)
        )
        .leftJoin(
          approvedByUser,
          eq(assetDisposals.approvedById, approvedByUser.id)
        )
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assetDisposals)
        .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(
          requestedByUser,
          eq(assetDisposals.requestedById, requestedByUser.id)
        )
        .leftJoin(
          approvedByUser,
          eq(assetDisposals.approvedById, approvedByUser.id)
        )
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(assetDisposals.requestedAt))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.disposalRecords',
        startTime: queryTimer,
      });

      const data: ReportPreviewRow[] = rows.map((row) => {
        const gainLoss =
          Number(row.salvageValue || 0) - Number(row.bookValue || 0);
        const procTime =
          row.resolvedAt && row.requestedAt
            ? Math.floor(
                (new Date(row.resolvedAt).getTime() -
                  new Date(row.requestedAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : '-';
        return {
          id: String(row.id),
          'Disposal ID': String(row.id),
          'Asset Tag': row.assetTag,
          'Asset Name': row.assetName || '-',
          'Requested By': row.requestedBy || '-',
          'Approved By': row.approvedBy || '-',
          Status: row.status,
          Reason: row.reason,
          Justification: row.justification || '-',
          'Disposal Method': row.disposalMethod || '-',
          'Data Wiped': row.dataWiped ? 'Yes' : 'No',
          'Tags Removed': row.tagsRemoved ? 'Yes' : 'No',
          'Salvage Value': row.salvageValue ? String(row.salvageValue) : '0',
          'Book Value': row.bookValue ? String(row.bookValue) : '0',
          'Gain/Loss': String(gainLoss.toFixed(2)),
          'Requested At': row.requestedAt
            ? new Date(row.requestedAt).toLocaleDateString()
            : '-',
          'Resolved At': row.resolvedAt
            ? new Date(row.resolvedAt).toLocaleDateString()
            : '-',
          'Processing Time (Days)': String(procTime),
        };
      });

      return {
        data,
        totalRows,
        pageCount: Math.ceil(totalRows / pageSize),
      };
    }

    // -------------------------------------------------------------------------
    // PURCHASE RECORDS LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Purchase Records') {
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

    // -------------------------------------------------------------------------
    // DEPRECIATION LEDGER LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Depreciation Ledger') {
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

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

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

    // -------------------------------------------------------------------------
    // TCO OVERVIEW LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'TCO Overview') {
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

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

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

    // -------------------------------------------------------------------------
    // SOFTWARE LICENSES LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Software Licenses') {
      const queryTimer = startLatencyTimer();
      const conditions = [];

      if (
        filters.status &&
        filters.status !== 'All statuses' &&
        filters.status !== 'All Types'
      ) {
        conditions.push(
          eq(softwareLicenses.licenseType, filters.status as never)
        );
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${softwareLicenses.expiryDate} >= ${filters.dateFrom}`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${softwareLicenses.expiryDate} <= ${filters.dateTo}`
        );
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const baseQuery = db
        .select({
          id: softwareLicenses.id,
          softwareName: models.name,
          publisher: brands.name,
          licenseKey: softwareLicenses.licenseKey,
          licenseType: softwareLicenses.licenseType,
          totalSeats: softwareLicenses.totalSeats,
          startDate: softwareLicenses.startDate,
          expiryDate: softwareLicenses.expiryDate,
          isActive: softwareLicenses.isActive,
        })
        .from(softwareLicenses)
        .innerJoin(models, eq(softwareLicenses.modelId, models.id))
        .leftJoin(brands, eq(models.brandId, brands.id))
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(softwareLicenses)
        .innerJoin(models, eq(softwareLicenses.modelId, models.id))
        .leftJoin(brands, eq(models.brandId, brands.id))
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(softwareLicenses.createdAt))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.softwareLicenses',
        startTime: queryTimer,
      });

      const licenseIds = rows.map((r) => r.id);
      const usedSeatsMap = new Map<string, number>();
      if (licenseIds.length > 0) {
        const allocations = await db
          .select({
            licenseId: softwareAllocations.licenseId,
            count: sql<number>`count(*)::int`,
          })
          .from(softwareAllocations)
          .where(
            and(
              inArray(softwareAllocations.licenseId, licenseIds),
              isNull(softwareAllocations.revokedAt)
            )
          )
          .groupBy(softwareAllocations.licenseId);

        for (const alloc of allocations) {
          usedSeatsMap.set(alloc.licenseId, alloc.count);
        }
      }

      const data: ReportPreviewRow[] = rows.map((row) => {
        const used = usedSeatsMap.get(row.id) || 0;
        const total = row.totalSeats;
        const available = Math.max(0, total - used);
        const utilization = total > 0 ? (used / total) * 100 : 0;
        const daysUntilExpiry = row.expiryDate
          ? Math.floor(
              (new Date(row.expiryDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : -1;

        return {
          id: row.id,
          'License ID': 'LIC-' + row.id.substring(0, 8).toUpperCase(),
          'Software Name': row.softwareName || '-',
          Publisher: row.publisher || '-',
          'License Key': row.licenseKey || '-',
          'License Type': row.licenseType,
          'Total Seats': String(total),
          'Used Seats': String(used),
          'Available Seats': String(available),
          'Utilization %': utilization.toFixed(1) + '%',
          'Start Date': row.startDate
            ? new Date(row.startDate).toLocaleDateString()
            : '-',
          'Expiry Date': row.expiryDate
            ? new Date(row.expiryDate).toLocaleDateString()
            : '-',
          'Days Until Expiry':
            daysUntilExpiry >= 0 ? String(daysUntilExpiry) : 'Expired/Unknown',
          Status: row.isActive ? 'Active' : 'Inactive',
        };
      });

      return {
        data,
        totalRows,
        pageCount: Math.ceil(totalRows / pageSize),
      };
    }

    // -------------------------------------------------------------------------
    // AUDIT LOGS LOGIC
    // -------------------------------------------------------------------------
    if (filters.source === 'Audit Logs') {
      const queryTimer = startLatencyTimer();
      const conditions = [];

      if (
        filters.status &&
        filters.status !== 'All statuses' &&
        filters.status !== 'All Actions'
      ) {
        conditions.push(eq(systemAuditLogs.actionType, filters.status));
      }
      if (filters.dateFrom) {
        conditions.push(
          sql`${systemAuditLogs.performedAt} >= ${filters.dateFrom}::timestamp`
        );
      }
      if (filters.dateTo) {
        conditions.push(
          sql`${systemAuditLogs.performedAt} <= ${filters.dateTo}::timestamp`
        );
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const baseQuery = db
        .select({
          id: systemAuditLogs.id,
          performedAt: systemAuditLogs.performedAt,
          user: users.name,
          actionType: systemAuditLogs.actionType,
          entityType: systemAuditLogs.entityType,
          entityId: systemAuditLogs.entityId,
          oldValue: systemAuditLogs.oldValue,
          newValue: systemAuditLogs.newValue,
          ipAddress: systemAuditLogs.ipAddress,
        })
        .from(systemAuditLogs)
        .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
        .where(whereCondition);

      const totalRowsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(systemAuditLogs)
        .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
        .where(whereCondition);

      const totalRows = Number(totalRowsCount[0]?.count || 0);

      const rows = await baseQuery
        .orderBy(desc(systemAuditLogs.performedAt))
        .limit(pageSize)
        .offset(offset);

      logLatency({
        scope: 'DB ACTION',
        label: 'standardReports.fetchReportPreview.auditLogs',
        startTime: queryTimer,
      });

      // Resolve entity labels in bulk
      const targetEntityLabels = await resolveTargetEntityLabels(rows);
      const { labels: valueLabels, idMappings } =
        await resolveAuditValueLabels(rows);

      const data: ReportPreviewRow[] = rows.map((row) => {
        const oldVal = row.oldValue as Record<string, unknown> | null;
        const newVal = row.newValue as Record<string, unknown> | null;

        const humanize = (obj: Record<string, unknown> | null) => {
          if (!obj) return null;
          const newObj = { ...obj };
          for (const [key, val] of Object.entries(newObj)) {
            const entityType = idMappings[key];
            if (entityType && val) {
              const label = valueLabels.get(`${entityType}::${val}`);
              if (label) newObj[key] = label;
            }
          }
          return newObj;
        };

        const humanizedOld = humanize(oldVal);
        const humanizedNew = humanize(newVal);

        const resolvedLabel =
          targetEntityLabels.get(`${row.entityType}::${row.entityId}`) ||
          extractLabelFromValues(oldVal, newVal);

        const details = buildEventDetailsSentence(
          row.actionType,
          row.entityType,
          humanizedOld,
          humanizedNew
        );

        return {
          id: String(row.id),
          'Log ID': String(row.id),
          Timestamp: row.performedAt
            ? new Date(row.performedAt).toLocaleString()
            : '-',
          User: row.user || 'System',
          Action: row.actionType,
          'Entity Type': row.entityType,
          'Entity ID': resolvedLabel || row.entityId,
          'IP Address': row.ipAddress || 'Unknown IP',
          Details: details,
        };
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
