'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { getWriteOffsLedger } from '@/actions/financials';
import { assertAdminOrAuditor } from './queries/auth';
import { getCachedDashboardKpiMetrics } from './queries/kpis';
import {
  getCachedInventoryStatus,
  getCachedDepartmentAllocation,
} from './queries/inventory';
import { getRecentActivitiesInternal } from './queries/activities';
import {
  getDashboardTopHighValueAssetsInternal,
  getDashboardSoftwareOptimizationInternal,
} from './queries/financials';
import type {
  DashboardKpiMetrics,
  InventoryStatusResponse,
  DepartmentAllocationItem,
  TopHighValueAssetRow,
  SoftwareOptimizationRow,
  RecentActivity,
  WriteOffLedgerRow,
} from '@/types/dashboard';

export interface FinanceDashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  topHighValueAssets: TopHighValueAssetRow[];
  writeOffsLedger: WriteOffLedgerRow[];
  softwareOptimization: SoftwareOptimizationRow[];
  recentActivities: RecentActivity[];
}

/**
 * Fetches all financial-related dashboard data in a single call, performing auth once
 * and running all queries in parallel.
 *
 * Strictly locks entry point to GlobalAdmin or FinanceAuditor.
 */
export async function getFinanceDashboardData(): Promise<FinanceDashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrAuditor(user);

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    getDashboardTopHighValueAssetsInternal(),
    getWriteOffsLedger({ pageSize: 100 }).then((res) => res.data),
    getDashboardSoftwareOptimizationInternal(),
    getRecentActivitiesInternal(),
  ]);

  return {
    kpiMetrics:
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
          },
    inventoryStatus:
      results[1].status === 'fulfilled'
        ? results[1].value
        : { inventoryData: [], utilizationRate: 0 },
    departmentAllocation:
      results[2].status === 'fulfilled' ? (results[2].value as DepartmentAllocationItem[]) : [],
    topHighValueAssets:
      results[3].status === 'fulfilled' ? (results[3].value as TopHighValueAssetRow[]) : [],
    writeOffsLedger:
      results[4].status === 'fulfilled' ? (results[4].value as WriteOffLedgerRow[]) : [],
    softwareOptimization:
      results[5].status === 'fulfilled' ? (results[5].value as SoftwareOptimizationRow[]) : [],
    recentActivities:
      results[6].status === 'fulfilled' ? (results[6].value as RecentActivity[]) : [],
  };
}
