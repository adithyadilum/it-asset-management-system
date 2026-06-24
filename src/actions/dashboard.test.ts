import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardBatchData } from '@/actions/dashboard';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const mockGetGlobalAdminDashboardData = vi.fn();
vi.mock('@/actions/dashboard/global-admin', () => ({
  getGlobalAdminDashboardData: () => mockGetGlobalAdminDashboardData(),
}));

const mockGetITDashboardData = vi.fn();
vi.mock('@/actions/dashboard/it-operator', () => ({
  getITDashboardData: () => mockGetITDashboardData(),
}));

const mockGetFinanceDashboardData = vi.fn();
vi.mock('@/actions/dashboard/financial-auditor', () => ({
  getFinanceDashboardData: () => mockGetFinanceDashboardData(),
}));

describe('Dashboard Action: getDashboardBatchData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getDashboardBatchData()).rejects.toThrow('Unauthorized');
  });

  it('returns restricted view / throws forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    // The implementation throws 'Forbidden' for Employee
    await expect(getDashboardBatchData()).rejects.toThrow('Forbidden');
  });

  it('returns full metrics for GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockGetGlobalAdminDashboardData.mockResolvedValue({
      kpiMetrics: { totalActiveAssets: 100 },
      inventoryStatus: { inventoryData: [] },
    });

    const result = await getDashboardBatchData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(100);
    expect(mockGetGlobalAdminDashboardData).toHaveBeenCalledTimes(1);
  });

  it('returns IT-specific metrics for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockGetITDashboardData.mockResolvedValue({
      kpiMetrics: { totalActiveAssets: 50 },
      inventoryStatus: { inventoryData: [] },
      departmentAllocation: [],
      overdueReturns: [],
      highMaintenanceAssets: [],
    });

    const result = await getDashboardBatchData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(50);
    // Ensure finance partitions are zeroed out
    expect(result.writeOffsLedger).toEqual([]);
    expect(result.depreciationLedger).toEqual([]);
  });

  it('returns Finance-specific metrics for FinancialAuditor', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: 'finance1',
      role: 'FinancialAuditor',
    });
    mockGetFinanceDashboardData.mockResolvedValue({
      kpiMetrics: { totalActiveAssets: 150 },
      inventoryStatus: { inventoryData: [] },
      departmentAllocation: [],
      topHighValueAssets: [],
      writeOffsLedger: [],
      softwareOptimization: [],
      recentActivities: [],
    });

    const result = await getDashboardBatchData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(150);
    // Ensure IT partitions are zeroed out
    expect(result.overdueReturns).toEqual([]);
    expect(result.pendingDisposals).toEqual([]);
    expect(result.highMaintenanceAssets).toEqual([]);
  });
});
