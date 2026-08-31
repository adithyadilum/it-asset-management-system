'use server';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser, enforceActionAccess } from '@/actions/auth';
import { db } from '@/db';
import { categories, locations, vendors, customStatuses } from '@/db/schema';
import { canViewAssetRegistry } from '@/lib/auth/roles';
import { logAuditAction } from '@/lib/audit';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { reportPreviewFiltersSchema } from '@/lib/validations/standard-reports';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

import { fetchActiveAssignments } from './standard-reports/fetch-active-assignments';
import { fetchAssetRegistry } from './standard-reports/fetch-asset-registry';
import { fetchAuditLogs } from './standard-reports/fetch-audit-logs';
import { fetchDepreciationLedger } from './standard-reports/fetch-depreciation-ledger';
import { fetchDisposalRecords } from './standard-reports/fetch-disposal-records';
import { fetchMaintenanceRecords } from './standard-reports/fetch-maintenance-records';
import { fetchMasterData } from './standard-reports/fetch-master-data';
import { fetchPurchaseRecords } from './standard-reports/fetch-purchase-records';
import { fetchReturnHistory } from './standard-reports/fetch-return-history';
import { fetchSoftwareLicenses } from './standard-reports/fetch-software-licenses';
import { fetchTcoOverview } from './standard-reports/fetch-tco-overview';

export async function getStandardReportsFilterOptions() {
  const actionTimer = startLatencyTimer();

  await enforceActionAccess(canViewAssetRegistry);

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

export async function fetchReportPreview(
  filters: ReportPreviewFilters
): Promise<{ data: ReportPreviewRow[]; pageCount: number; totalRows: number }> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Please log in.');
  }

  // Was a hardcoded role list identical to `canViewAssetRegistry`. Keeping a
  // second copy is what let the page-load guards drift to a stricter rule than
  // the one that actually generates the report.
  if (!canViewAssetRegistry(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to generate reports.'
    );
  }

  try {
    const parsedFilters = reportPreviewFiltersSchema.safeParse(filters);
    if (!parsedFilters.success) {
      throw new Error(
        parsedFilters.error.issues[0]?.message ?? 'Invalid report filters.'
      );
    }
    const validatedFilters = parsedFilters.data;

    const pageSize = validatedFilters.pageSize;
    const page = validatedFilters.page;
    const offset = page * pageSize;

    switch (validatedFilters.source) {
      case 'Master Data':
        return await fetchMasterData(validatedFilters, pageSize, offset);
      case 'Active Assignments':
        return await fetchActiveAssignments(validatedFilters, pageSize, offset);
      case 'Return History':
        return await fetchReturnHistory(validatedFilters, pageSize, offset);
      case 'Maintenance Records':
        return await fetchMaintenanceRecords(
          validatedFilters,
          pageSize,
          offset
        );
      case 'Disposal Records':
        return await fetchDisposalRecords(validatedFilters, pageSize, offset);
      case 'Purchase Records':
        return await fetchPurchaseRecords(validatedFilters, pageSize, offset);
      case 'Depreciation Ledger':
        return await fetchDepreciationLedger(
          validatedFilters,
          pageSize,
          offset
        );
      case 'TCO Overview':
        return await fetchTcoOverview(validatedFilters, pageSize, offset);
      case 'Software Licenses':
        return await fetchSoftwareLicenses(validatedFilters, pageSize, offset);
      case 'Audit Logs':
        return await fetchAuditLogs(validatedFilters, pageSize, offset);
      default:
        return await fetchAssetRegistry(validatedFilters, pageSize, offset);
    }
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

/**
 * Records that a report left the system.
 *
 * Both exports run entirely in the browser from data already on the client, so
 * nothing on the server ever observed them -- a CSV or PDF of the full asset
 * register could be taken with no trace. This is the deliberate round trip that
 * makes the export visible in the audit log.
 */
export async function logReportExportAction(input: {
  source: string;
  format: 'CSV' | 'PDF';
  rowCount: number;
  templateName?: string;
}): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) return;

  await logAuditAction({
    entityType: 'Report',
    entityId: input.templateName || input.source || 'ad-hoc',
    actionType: 'REPORT_EXPORTED',
    performedById: user.id,
    newData: {
      source: input.source,
      format: input.format,
      rowCount: input.rowCount,
      ...(input.templateName ? { template: input.templateName } : {}),
    },
  });
}
