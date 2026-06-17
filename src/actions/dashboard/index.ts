export * from '@/types/dashboard';
export { requireAccess } from '@/lib/auth/roles';
export * from './queries/inventory';
export * from './queries/financials';
export * from './queries/kpis';
export * from './queries/activities';
export * from './admin';
export * from './it-operator';
export * from './finance';

import { getAuthenticatedUser } from '@/actions/auth';
import { getAdminDashboardData } from './admin';
import { getITDashboardData } from './it-operator';
import { getFinanceDashboardData } from './finance';
import type { DashboardBatchData } from '@/types/dashboard';

/**
 * Backward-compatible batch fetcher that delegates to role-specific
 * operations and safely zeroes out data in unauthorized partitions.
 */
export async function getDashboardBatchData(): Promise<DashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'GlobalAdmin') {
    return getAdminDashboardData();
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

  if (user.role === 'FinanceAuditor') {
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

  throw new Error('Forbidden');
}
