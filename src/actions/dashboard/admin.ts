'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { getWriteOffsLedger } from '@/actions/financials';
import { assertAdmin } from '@/lib/auth/roles';
import { getCachedDashboardKpiMetrics } from './queries/kpis';
import {
  getCachedInventoryStatus,
  getCachedDepartmentAllocation,
  getOverdueReturnsInternal,
  getPendingDisposalsInternal,
  getHighMaintenanceAssetsInternal,
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
  OverdueReturnRow,
  PendingDisposalRow,
  HighMaintenanceRow,
  RecentActivity,
  TopHighValueAssetRow,
  SoftwareOptimizationRow,
  WriteOffLedgerRow,
} from '@/types/dashboard';

export interface AdminDashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  pendingDisposals: PendingDisposalRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
  recentActivities: RecentActivity[];
  topHighValueAssets: TopHighValueAssetRow[];
  writeOffsLedger: WriteOffLedgerRow[];
  softwareOptimization: SoftwareOptimizationRow[];
}

/**
 * Fetches all dashboard data in a single call, performing auth once
 * and running all queries in parallel.
 *
 * Strictly locks entry point to GlobalAdmin.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdmin(user);

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    getOverdueReturnsInternal(),
    getPendingDisposalsInternal(),
    getHighMaintenanceAssetsInternal(),
    getRecentActivitiesInternal(),
    getDashboardTopHighValueAssetsInternal(),
    getWriteOffsLedger({ pageSize: 100 }).then((res) => res.data),
    getDashboardSoftwareOptimizationInternal(),
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
    overdueReturns:
      results[3].status === 'fulfilled' ? (results[3].value as OverdueReturnRow[]) : [],
    pendingDisposals:
      results[4].status === 'fulfilled' ? (results[4].value as PendingDisposalRow[]) : [],
    highMaintenanceAssets:
      results[5].status === 'fulfilled' ? (results[5].value as HighMaintenanceRow[]) : [],
    recentActivities:
      results[6].status === 'fulfilled' ? (results[6].value as RecentActivity[]) : [],
    topHighValueAssets:
      results[7].status === 'fulfilled' ? (results[7].value as TopHighValueAssetRow[]) : [],
    writeOffsLedger:
      results[8].status === 'fulfilled' ? (results[8].value as WriteOffLedgerRow[]) : [],
    softwareOptimization:
      results[9].status === 'fulfilled' ? (results[9].value as SoftwareOptimizationRow[]) : [],
  };
}
