import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGlobalAdminDashboardData } from './global-admin';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user)) throw new Error('Forbidden');
  }),
}));

const mockGetWriteOffsLedger = vi.fn();
vi.mock('@/actions/financials', () => ({
  getWriteOffsLedger: () => mockGetWriteOffsLedger(),
}));

const mockGetCachedDashboardKpiMetrics = vi.fn();
const mockGetCachedInventoryStatus = vi.fn();
const mockGetCachedDepartmentAllocation = vi.fn();
const mockGetOverdueReturnsInternal = vi.fn();
const mockGetPendingDisposalsInternal = vi.fn();
const mockGetHighMaintenanceAssetsInternal = vi.fn();
const mockGetRecentActivitiesInternal = vi.fn();
const mockGetDashboardTopHighValueAssetsInternal = vi.fn();
const mockGetDashboardSoftwareOptimizationInternal = vi.fn();

vi.mock('./queries/kpis', () => ({
  getCachedDashboardKpiMetrics: () => mockGetCachedDashboardKpiMetrics(),
}));

vi.mock('./queries/inventory', () => ({
  getCachedInventoryStatus: () => mockGetCachedInventoryStatus(),
  getCachedDepartmentAllocation: () => mockGetCachedDepartmentAllocation(),
  getOverdueReturnsInternal: () => mockGetOverdueReturnsInternal(),
  getPendingDisposalsInternal: () => mockGetPendingDisposalsInternal(),
  getHighMaintenanceAssetsInternal: () => mockGetHighMaintenanceAssetsInternal(),
}));

vi.mock('./queries/activities', () => ({
  getRecentActivitiesInternal: () => mockGetRecentActivitiesInternal(),
}));

vi.mock('./queries/financials', () => ({
  getDashboardTopHighValueAssetsInternal: () => mockGetDashboardTopHighValueAssetsInternal(),
  getDashboardSoftwareOptimizationInternal: () => mockGetDashboardSoftwareOptimizationInternal(),
}));

describe('getGlobalAdminDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getGlobalAdminDashboardData()).rejects.toThrow('Unauthorized');
  });

  it('throws forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getGlobalAdminDashboardData()).rejects.toThrow('Forbidden');
  });

  it('throws forbidden for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(getGlobalAdminDashboardData()).rejects.toThrow('Forbidden');
  });

  it('returns aggregated data for GlobalAdmin when all queries succeed', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockGetCachedDashboardKpiMetrics.mockResolvedValue({ totalActiveAssets: 100 });
    mockGetCachedInventoryStatus.mockResolvedValue({ inventoryData: [] });
    mockGetCachedDepartmentAllocation.mockResolvedValue([{ dept: 'Admin', count: 5 }]);
    mockGetOverdueReturnsInternal.mockResolvedValue([{ id: 1 }]);
    mockGetPendingDisposalsInternal.mockResolvedValue([{ id: 2 }]);
    mockGetHighMaintenanceAssetsInternal.mockResolvedValue([{ id: 3 }]);
    mockGetRecentActivitiesInternal.mockResolvedValue([{ id: 4 }]);
    mockGetDashboardTopHighValueAssetsInternal.mockResolvedValue([{ id: 5 }]);
    mockGetWriteOffsLedger.mockResolvedValue({ data: [{ id: 6 }] });
    mockGetDashboardSoftwareOptimizationInternal.mockResolvedValue([{ id: 7 }]);

    const result = await getGlobalAdminDashboardData();
    expect(result.dataErrors.length).toBe(0);
    expect(result.kpiMetrics.totalActiveAssets).toBe(100);
    expect(result.writeOffsLedger.length).toBe(1);
    expect(result.recentActivities.length).toBe(1);
  });

  it('returns default fallbacks and dataErrors when queries reject', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockGetCachedDashboardKpiMetrics.mockRejectedValue(new Error('Kpi Error'));
    mockGetCachedInventoryStatus.mockRejectedValue(new Error('Inv Error'));
    mockGetCachedDepartmentAllocation.mockRejectedValue(new Error('Dept Error'));
    mockGetOverdueReturnsInternal.mockRejectedValue(new Error('Over Error'));
    mockGetPendingDisposalsInternal.mockRejectedValue(new Error('Pend Error'));
    mockGetHighMaintenanceAssetsInternal.mockRejectedValue(new Error('Maint Error'));
    mockGetRecentActivitiesInternal.mockRejectedValue(new Error('Act Error'));
    mockGetDashboardTopHighValueAssetsInternal.mockRejectedValue(new Error('Top Error'));
    mockGetWriteOffsLedger.mockRejectedValue(new Error('Write Error'));
    mockGetDashboardSoftwareOptimizationInternal.mockRejectedValue(new Error('Soft Error'));

    const result = await getGlobalAdminDashboardData();
    expect(result.dataErrors.length).toBe(10);
    expect(result.kpiMetrics.totalActiveAssets).toBe(0);
    expect(result.writeOffsLedger).toEqual([]);
    expect(result.softwareOptimization).toEqual([]);
  });
});
