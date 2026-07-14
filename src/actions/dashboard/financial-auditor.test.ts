import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFinanceDashboardData } from './financial-auditor';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: async (predicate?: (role: string) => boolean) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('UNAUTHENTICATED');
    if (predicate && !predicate(user.role)) throw new Error('FORBIDDEN: Forbidden');
    return user;
  },
}));

const mockGetWriteOffsLedger = vi.fn();
vi.mock('@/actions/financials', () => ({
  getWriteOffsLedger: () => mockGetWriteOffsLedger(),
}));

const mockLogError = vi.fn();
vi.mock('@/lib/latency', () => ({
  logError: () => mockLogError(),
}));

const mockGetCachedDashboardKpiMetrics = vi.fn();
const mockGetCachedInventoryStatus = vi.fn();
const mockGetCachedDepartmentAllocation = vi.fn();
const mockGetRecentActivitiesInternal = vi.fn();
const mockGetDashboardTopHighValueAssetsInternal = vi.fn();
const mockGetDashboardSoftwareOptimizationInternal = vi.fn();

vi.mock('./queries/kpis', () => ({
  getCachedDashboardKpiMetrics: () => mockGetCachedDashboardKpiMetrics(),
}));

vi.mock('./queries/inventory', () => ({
  getCachedInventoryStatus: () => mockGetCachedInventoryStatus(),
  getCachedDepartmentAllocation: () => mockGetCachedDepartmentAllocation(),
}));

vi.mock('./queries/activities', () => ({
  getRecentActivitiesInternal: () => mockGetRecentActivitiesInternal(),
}));

vi.mock('./queries/financials', () => ({
  getDashboardTopHighValueAssetsInternal: () => mockGetDashboardTopHighValueAssetsInternal(),
  getDashboardSoftwareOptimizationInternal: () => mockGetDashboardSoftwareOptimizationInternal(),
}));

describe('getFinanceDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getFinanceDashboardData()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getFinanceDashboardData()).rejects.toThrow('Forbidden');
  });

  it('throws forbidden for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(getFinanceDashboardData()).rejects.toThrow('Forbidden');
  });

  it('returns aggregated data for FinancialAuditor when all queries succeed', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: 'finance1',
      role: 'FinancialAuditor',
    });
    mockGetCachedDashboardKpiMetrics.mockResolvedValue({ totalActiveAssets: 100 });
    mockGetCachedInventoryStatus.mockResolvedValue({ inventoryData: [] });
    mockGetCachedDepartmentAllocation.mockResolvedValue([{ name: 'Finance', value: 5 }]);
    mockGetDashboardTopHighValueAssetsInternal.mockResolvedValue([{ id: 1 }]);
    mockGetWriteOffsLedger.mockResolvedValue({ data: [{ id: 2 }] });
    mockGetDashboardSoftwareOptimizationInternal.mockResolvedValue([{ id: 3 }]);
    mockGetRecentActivitiesInternal.mockResolvedValue([{ id: 4 }]);

    const result = await getFinanceDashboardData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(100);
    expect(result.writeOffsLedger.length).toBe(1);
    expect(result.recentActivities.length).toBe(1);
    expect(result.departmentAllocation[0].name).toBe('Finance');
  });

  it('throws error if kpi metrics reject', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockGetCachedDashboardKpiMetrics.mockRejectedValue(new Error('KPI Error'));
    
    // Others resolve fine
    mockGetCachedInventoryStatus.mockResolvedValue({ inventoryData: [] });
    mockGetCachedDepartmentAllocation.mockResolvedValue([]);
    mockGetDashboardTopHighValueAssetsInternal.mockResolvedValue([]);
    mockGetWriteOffsLedger.mockResolvedValue({ data: [] });
    mockGetDashboardSoftwareOptimizationInternal.mockResolvedValue([]);
    mockGetRecentActivitiesInternal.mockResolvedValue([]);

    await expect(getFinanceDashboardData()).rejects.toThrow('KPI Error');
  });

  it('returns default fallbacks when non-critical queries reject', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockGetCachedDashboardKpiMetrics.mockResolvedValue({ totalActiveAssets: 100 });
    
    // Everything else rejects
    mockGetCachedInventoryStatus.mockRejectedValue(new Error('Inv Error'));
    mockGetCachedDepartmentAllocation.mockRejectedValue(new Error('Dept Error'));
    mockGetDashboardTopHighValueAssetsInternal.mockRejectedValue(new Error('Top Error'));
    mockGetWriteOffsLedger.mockRejectedValue(new Error('Write Error'));
    mockGetDashboardSoftwareOptimizationInternal.mockRejectedValue(new Error('Soft Error'));
    mockGetRecentActivitiesInternal.mockRejectedValue(new Error('Act Error'));

    const result = await getFinanceDashboardData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(100);
    expect(result.writeOffsLedger).toEqual([]);
    expect(result.softwareOptimization).toEqual([]);
    expect(result.recentActivities).toEqual([]);
  });
});
