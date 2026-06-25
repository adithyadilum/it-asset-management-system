export * from '@/types/dashboard';
export { requireAccess } from '@/lib/auth/roles';
export * from './queries/inventory';
export * from './queries/financials';
export * from './queries/kpis';
export * from './queries/activities';
export * from './global-admin';
export * from './it-operator';
export * from './financial-auditor';

import {  enforceActionAccess } from '@/actions/auth';
import { getGlobalAdminDashboardData } from './global-admin';
import { getITDashboardData } from './it-operator';
import { getFinanceDashboardData } from './financial-auditor';
import type { DashboardBatchData } from '@/types/dashboard';

/** Delegates to the role-specific dashboard fetcher, zeroing out unauthorized partitions. */
export async function getDashboardBatchData(): Promise<DashboardBatchData> {
  const user = await enforceActionAccess();

  if (user.role === 'GlobalAdmin') {
    return getGlobalAdminDashboardData();
  }

  if (user.role === 'ITOperator') {
    const data = await getITDashboardData();
    return {
      kpiMetrics: data.kpiMetrics,
      inventoryStatus: data.inventoryStatus,
      departmentAllocation: data.departmentAllocation,
      overdueReturns: data.overdueReturns,
      highMaintenanceAssets: data.highMaintenanceAssets,
      pendingDisposals: [],
      recentActivities: [],
      topHighValueAssets: [],
      depreciationLedger: [],
      writeOffsLedger: [],
      softwareOptimization: [],
    };
  }

  if (user.role === 'FinancialAuditor') {
    const data = await getFinanceDashboardData();
    return {
      kpiMetrics: data.kpiMetrics,
      inventoryStatus: data.inventoryStatus,
      departmentAllocation: data.departmentAllocation,
      topHighValueAssets: data.topHighValueAssets,
      writeOffsLedger: data.writeOffsLedger,
      softwareOptimization: data.softwareOptimization,
      recentActivities: data.recentActivities,
      overdueReturns: [],
      pendingDisposals: [],
      highMaintenanceAssets: [],
    };
  }

  if (user.role === 'Employee') {
    throw new Error('FORBIDDEN: Employee role has no dashboard batch data.');
  }

  throw new Error('FORBIDDEN: Unexpected role.');
}