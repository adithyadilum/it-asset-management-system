'use server';

import {  enforceActionAccess } from '@/actions/auth';
import {  isITOperator } from '@/lib/auth/roles';
import { getCachedDashboardKpiMetrics } from './queries/kpis';
import {
  getCachedInventoryStatus,
  getCachedDepartmentAllocation,
  getOverdueReturnsInternal,
  getHighMaintenanceAssetsInternal,
} from './queries/inventory';
import type {
  DashboardKpiMetrics,
  InventoryStatusResponse,
  DepartmentAllocationItem,
  OverdueReturnRow,
  HighMaintenanceRow,
} from '@/types/dashboard';

export interface ITDashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
}

/** Fetches all IT-related dashboard data in parallel. Restricted to ITOperator / GlobalAdmin. */
export async function getITDashboardData(): Promise<ITDashboardBatchData> {
  await enforceActionAccess(isITOperator);

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    getOverdueReturnsInternal(),
    getHighMaintenanceAssetsInternal(),
  ]);


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