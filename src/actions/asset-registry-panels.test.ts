import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAssetPanelDataAction } from '@/actions/asset-registry-panels';

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  resolveAssetPrimaryId: vi.fn(),
  getDetails: vi.fn(),
  getHistory: vi.fn(),
  getMaintenance: vi.fn(),
  getAllocations: vi.fn(),
  getFinancial: vi.fn(),
}));

vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('@/lib/data/asset-details-repo', () => ({
  resolveAssetPrimaryId: mocks.resolveAssetPrimaryId,
  getAssetDetailsByResolvedId: mocks.getDetails,
  getAssetHistoryByResolvedId: mocks.getHistory,
  getAssetMaintenanceByResolvedId: mocks.getMaintenance,
  getAssetAllocationsByResolvedId: mocks.getAllocations,
}));

vi.mock('@/lib/data/asset-financial-vitals-repo', () => ({
  getAssetFinancialVitalsByResolvedId: mocks.getFinancial,
}));

vi.mock('@/lib/latency', () => ({ logError: vi.fn() }));

describe('getAssetPanelDataAction', () => {
  const resolvedId = 'e5772338-9584-4d2d-be20-1b29ccdfeb7d';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAssetPrimaryId.mockResolvedValue(resolvedId);
    mocks.getDetails.mockResolvedValue({ asset: { id: resolvedId } });
    mocks.getHistory.mockResolvedValue([{ id: 'history-1' }]);
    mocks.getMaintenance.mockResolvedValue([{ id: 1 }]);
    mocks.getAllocations.mockResolvedValue([{ id: 'user-1' }]);
    mocks.getFinancial.mockResolvedValue({ assetId: resolvedId });
  });

  it('authenticates and resolves the asset only once', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'admin-1',
      role: 'GlobalAdmin',
      isActive: true,
    });

    const result = await getAssetPanelDataAction('IDE-001');

    expect(result.success).toBe(true);
    expect(mocks.getAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(mocks.resolveAssetPrimaryId).toHaveBeenCalledOnce();
    expect(mocks.resolveAssetPrimaryId).toHaveBeenCalledWith('IDE-001');
    expect(mocks.getDetails).toHaveBeenCalledWith(resolvedId);
    expect(mocks.getHistory).toHaveBeenCalledWith(resolvedId);
    expect(mocks.getMaintenance).toHaveBeenCalledWith(resolvedId);
    expect(mocks.getAllocations).toHaveBeenCalledWith(resolvedId);
    expect(mocks.getFinancial).toHaveBeenCalledWith(resolvedId);
  });

  it('does not load financial data for non-financial roles', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'operator-1',
      role: 'ITOperator',
      isActive: true,
    });

    const result = await getAssetPanelDataAction(resolvedId);

    expect(result.success).toBe(true);
    expect(result.data?.financial).toBeNull();
    expect(mocks.getFinancial).not.toHaveBeenCalled();
  });

  it('rejects unauthorized users before resolving or querying the asset', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const result = await getAssetPanelDataAction('IDE-001');

    expect(result).toEqual({
      success: false,
      message: 'Forbidden',
      data: null,
    });
    expect(mocks.resolveAssetPrimaryId).not.toHaveBeenCalled();
    expect(mocks.getDetails).not.toHaveBeenCalled();
  });
});
