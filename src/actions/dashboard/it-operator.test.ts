import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getITDashboardData } from './it-operator';
import {
  ADMIN_USER,
  EMPLOYEE_USER,
  IT_OPERATOR_USER,
} from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user.role)) throw new Error('Forbidden');
    return user;
  }),
}));

// Mock queries
const mockGetCachedDashboardKpiMetrics = vi.fn();
const mockGetCachedInventoryStatus = vi.fn();
const mockGetCachedDepartmentAllocation = vi.fn();
const mockGetOverdueReturnsInternal = vi.fn();
const mockGetHighMaintenanceAssetsInternal = vi.fn();
const mockGetPendingMaintenanceRequestsInternal = vi.fn();

vi.mock('./queries/kpis', () => ({
  getCachedDashboardKpiMetrics: () => mockGetCachedDashboardKpiMetrics(),
}));

vi.mock('./queries/inventory', () => ({
  getCachedInventoryStatus: () => mockGetCachedInventoryStatus(),
  getCachedDepartmentAllocation: () => mockGetCachedDepartmentAllocation(),
  getOverdueReturnsInternal: () => mockGetOverdueReturnsInternal(),
  getHighMaintenanceAssetsInternal: () =>
    mockGetHighMaintenanceAssetsInternal(),
  getPendingMaintenanceRequestsInternal: () =>
    mockGetPendingMaintenanceRequestsInternal(),
}));

describe('getITDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getITDashboardData()).rejects.toThrow('Unauthorized');
  });

  it('throws forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getITDashboardData()).rejects.toThrow('Forbidden');
  });

  it('returns aggregated data for ITOperator when all queries succeed', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockGetCachedDashboardKpiMetrics.mockResolvedValue({
      totalActiveAssets: 100,
    });
    mockGetCachedInventoryStatus.mockResolvedValue({ inventoryData: [] });
    mockGetCachedDepartmentAllocation.mockResolvedValue([
      { name: 'IT', value: 5 },
    ]);
    mockGetOverdueReturnsInternal.mockResolvedValue([{ id: 1 }]);
    mockGetHighMaintenanceAssetsInternal.mockResolvedValue([{ id: 2 }]);

    const result = await getITDashboardData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(100);
    expect(result.departmentAllocation[0].name).toBe('IT');
    expect(result.overdueReturns.length).toBe(1);
    expect(result.highMaintenanceAssets.length).toBe(1);
  });

  it('returns default fallbacks when queries reject (Promise.allSettled)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockGetCachedDashboardKpiMetrics.mockRejectedValue(new Error('DB Error'));
    mockGetCachedInventoryStatus.mockRejectedValue(new Error('DB Error'));
    mockGetCachedDepartmentAllocation.mockRejectedValue(new Error('DB Error'));
    mockGetOverdueReturnsInternal.mockRejectedValue(new Error('DB Error'));
    mockGetHighMaintenanceAssetsInternal.mockRejectedValue(
      new Error('DB Error')
    );

    const result = await getITDashboardData();
    expect(result.kpiMetrics.totalActiveAssets).toBe(0);
    expect(result.departmentAllocation).toEqual([]);
    expect(result.overdueReturns).toEqual([]);
    expect(result.highMaintenanceAssets).toEqual([]);
  });
});
