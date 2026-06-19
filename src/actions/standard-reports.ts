'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  categories,
  locations,
  vendors,
  customStatuses
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewRow, ReportPreviewFilters } from '@/types/standard-reports';
import { reportPreviewFiltersSchema } from '@/lib/validations/standard-reports';

import { fetchMasterData } from './standard-reports/fetch-master-data';
import { fetchActiveAssignments } from './standard-reports/fetch-active-assignments';
import { fetchReturnHistory } from './standard-reports/fetch-return-history';
import { fetchMaintenanceRecords } from './standard-reports/fetch-maintenance-records';
import { fetchDisposalRecords } from './standard-reports/fetch-disposal-records';
import { fetchPurchaseRecords } from './standard-reports/fetch-purchase-records';
import { fetchDepreciationLedger } from './standard-reports/fetch-depreciation-ledger';
import { fetchTcoOverview } from './standard-reports/fetch-tco-overview';
import { fetchSoftwareLicenses } from './standard-reports/fetch-software-licenses';
import { fetchAuditLogs } from './standard-reports/fetch-audit-logs';
import { fetchAssetRegistry } from './standard-reports/fetch-asset-registry';


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
    // Validate and coerce filter params with Zod
    const parsedFilters = reportPreviewFiltersSchema.safeParse(filters);
    if (!parsedFilters.success) {
      throw new Error(
        parsedFilters.error.issues[0]?.message ?? 'Invalid report filters.'
      );
    }
    const validatedFilters = parsedFilters.data;
    
    const pageSize = validatedFilters.pageSize ?? 50;
    const page = validatedFilters.page ?? 0;
    const offset = page * pageSize;

    switch (validatedFilters.source) {
      case 'Master Data':
        return await fetchMasterData(validatedFilters, pageSize, offset);
      case 'Active Assignments':
        return await fetchActiveAssignments(validatedFilters, pageSize, offset);
      case 'Return History':
        return await fetchReturnHistory(validatedFilters, pageSize, offset);
      case 'Maintenance Records':
        return await fetchMaintenanceRecords(validatedFilters, pageSize, offset);
      case 'Disposal Records':
        return await fetchDisposalRecords(validatedFilters, pageSize, offset);
      case 'Purchase Records':
        return await fetchPurchaseRecords(validatedFilters, pageSize, offset);
      case 'Depreciation Ledger':
        return await fetchDepreciationLedger(validatedFilters, pageSize, offset);
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
