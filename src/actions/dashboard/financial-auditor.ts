'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { getWriteOffsLedger } from '@/actions/financials';
import { requireAccess, isFinancialAuditor } from '@/lib/auth/roles';
import { logError } from '@/lib/latency';
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
 * Strictly locks entry point to GlobalAdmin or FinancialAuditor.
 */
export async function getFinanceDashboardData(): Promise<FinanceDashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  requireAccess(user, isFinancialAuditor);

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    getDashboardTopHighValueAssetsInternal(),
    getWriteOffsLedger({ pageSize: 100 }).then((res) => res.data),
    getDashboardSoftwareOptimizationInternal(),
    getRecentActivitiesInternal(),
  ]);

  const [kpiResult, invResult, deptResult, topAssetResult, writeOffResult, swOptResult, activityResult] = results;

  if (kpiResult.status === 'rejected') {
    logError({ scope: 'DASHBOARD', label: 'kpi_metrics_fetch', error: kpiResult.reason });
    throw kpiResult.reason;
  }

  return {
    kpiMetrics: kpiResult.value,
    inventoryStatus:
      invResult.status === 'fulfilled'
        ? invResult.value
        : { inventoryData: [], utilizationRate: 0 },
    departmentAllocation:
      deptResult.status === 'fulfilled' ? (deptResult.value as DepartmentAllocationItem[]) : [],
    topHighValueAssets:
      topAssetResult.status === 'fulfilled' ? (topAssetResult.value as TopHighValueAssetRow[]) : [],
    writeOffsLedger:
      writeOffResult.status === 'fulfilled' ? (writeOffResult.value as WriteOffLedgerRow[]) : [],
    softwareOptimization:
      swOptResult.status === 'fulfilled' ? (swOptResult.value as SoftwareOptimizationRow[]) : [],
    recentActivities:
      activityResult.status === 'fulfilled' ? (activityResult.value as RecentActivity[]) : [],
  };
}
