'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import {
  assertAdminOrOperator,
  getCachedDashboardKpiMetrics,
  getCachedInventoryStatus,
  getCachedDepartmentAllocation,
  getOverdueReturnsInternal,
  getHighMaintenanceAssetsInternal,
  type DashboardKpiMetrics,
  type InventoryStatusResponse,
  type DepartmentAllocationItem,
  type OverdueReturnRow,
  type HighMaintenanceRow,
} from './shared';

export interface ITDashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
}

/**
 * Fetches all IT-related dashboard data in a single call, performing auth once
 * and running all queries in parallel.
 *
 * Strictly locks entry point to GlobalAdmin or ITOperator.
 */
export async function getITDashboardData(): Promise<ITDashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrOperator(user);

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    getOverdueReturnsInternal(),
    getHighMaintenanceAssetsInternal(),
  ]);

  // Handle promise resolution with fallbacks if queries fail
  const kpiMetrics: DashboardKpiMetrics =
    results[0].status === 'fulfilled'
      ? results[0].value
      : {
          totalActiveAssets: 0,
          totalActiveAssetsChange: 0,
          fleetHealthScore: 0,
          fleetHealthLabel: 'Unknown',
          inactiveSoftwareSeats: 0,
          warrantyExpiries30Days: 0,
          softwareRenewals30Days: 0,
          impactedSoftwareEmployees: 0,
        };

  // Strictly filter out any financial values to keep Operator view isolated from price/financial details
  const filteredKpiMetrics: DashboardKpiMetrics = {
    totalActiveAssets: kpiMetrics.totalActiveAssets,
    totalActiveAssetsChange: kpiMetrics.totalActiveAssetsChange,
    fleetHealthScore: kpiMetrics.fleetHealthScore,
    fleetHealthLabel: kpiMetrics.fleetHealthLabel,
    inactiveSoftwareSeats: kpiMetrics.inactiveSoftwareSeats,
    warrantyExpiries30Days: kpiMetrics.warrantyExpiries30Days,
    softwareRenewals30Days: kpiMetrics.softwareRenewals30Days,
    impactedSoftwareEmployees: kpiMetrics.impactedSoftwareEmployees,
  };

  return {
    kpiMetrics: filteredKpiMetrics,
    inventoryStatus:
      results[1].status === 'fulfilled'
        ? results[1].value
        : { inventoryData: [], utilizationRate: 0 },
    departmentAllocation:
      results[2].status === 'fulfilled' ? (results[2].value as DepartmentAllocationItem[]) : [],
    overdueReturns:
      results[3].status === 'fulfilled' ? (results[3].value as OverdueReturnRow[]) : [],
    highMaintenanceAssets:
      results[4].status === 'fulfilled' ? (results[4].value as HighMaintenanceRow[]) : [],
  };
}
