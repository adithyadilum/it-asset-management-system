import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

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

const mockGetAssetsByPillarRepo = vi
  .fn()
  .mockResolvedValue({ items: [], total: 0 });
const mockGetAllAssetsUnifiedRepo = vi
  .fn()
  .mockResolvedValue({ items: [], total: 0 });
const mockGetCategoriesByPillarRepo = vi.fn().mockResolvedValue([]);
const mockBulkUpdateAssetsRepo = vi
  .fn()
  .mockResolvedValue({ updatedCount: 1, failedCount: 0 });

vi.mock('@/lib/data/asset-registry-repo', () => ({
  getAssetsByPillar: (...args: unknown[]) => mockGetAssetsByPillarRepo(...args),
  getAllAssetsUnified: (...args: unknown[]) =>
    mockGetAllAssetsUnifiedRepo(...args),
  getCategoriesByPillar: (...args: unknown[]) =>
    mockGetCategoriesByPillarRepo(...args),
  bulkUpdateAssets: (...args: unknown[]) => mockBulkUpdateAssetsRepo(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  getAssetsByPillar,
  getAllAssetsUnified,
  getCategoriesByPillar,
  bulkUpdateAssets,
} from '@/actions/asset-registry';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getAssetsByPillar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getAssetsByPillar({ pillar: 'Hardware' })).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('throws unauthorized for employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getAssetsByPillar({ pillar: 'Hardware' })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws error for invalid pillar', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(
      getAssetsByPillar({ pillar: 'InvalidPillar' })
    ).rejects.toThrow('Invalid pillar');
  });

  it('successfully calls getAssetsByPillarRepo with normalized inputs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await getAssetsByPillar({
      pillar: 'Hardware',
      status: 'Available',
      page: '2',
      pageSize: '50',
    });

    expect(mockGetAssetsByPillarRepo).toHaveBeenCalledWith({
      pillar: 'Hardware', // Hardware is normalized to Hardware
      query: undefined,
      categoryId: undefined,
      status: 'Available',
      page: 2,
      pageSize: 50,
    });
  });
});

describe('getAllAssetsUnified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getAllAssetsUnified({ pillar: 'Hardware' })).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('successfully calls getAllAssetsUnifiedRepo with normalized inputs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await getAllAssetsUnified({
      pillar: 'Hardware',
      query: '  test  ',
      page: 3,
      pageSize: 15,
    });

    expect(mockGetAllAssetsUnifiedRepo).toHaveBeenCalledWith({
      pillar: 'Hardware',
      query: 'test',
      status: undefined,
      page: 3,
      pageSize: 15,
    });
  });
});

describe('getCategoriesByPillar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getCategoriesByPillar('Hardware')).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('delegates to repo for valid pillar', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await getCategoriesByPillar('Software');
    expect(mockGetCategoriesByPillarRepo).toHaveBeenCalledWith('Software');
  });
});

describe('bulkUpdateAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for employee user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(
      bulkUpdateAssets({
        assetIds: ['00000000-0000-4000-a000-000000000000'],
        updates: { status: 'Available' },
      })
    ).rejects.toThrow('Forbidden');
  });

  it('returns error if assetIds array is empty', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkUpdateAssets({
      assetIds: [],
      updates: { status: 'Available' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Select at least one valid asset');
  });

  it('returns error if assetIds array contains no valid UUIDs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkUpdateAssets({
      assetIds: ['invalid-id'],
      updates: { status: 'Available' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Select at least one valid asset');
  });

  it('returns error if updates payload is empty', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkUpdateAssets({
      assetIds: ['00000000-0000-4000-a000-000000000000'],
      updates: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Provide at least one valid update field');
  });

  it('successfully delegates to bulkUpdateAssetsRepo', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkUpdateAssets({
      assetIds: ['00000000-0000-4000-a000-000000000000'],
      updates: { status: 'Assigned', condition: 'Excellent' },
    });

    expect(result.success).toBe(true);
    expect(mockBulkUpdateAssetsRepo).toHaveBeenCalledWith({
      assetIds: ['00000000-0000-4000-a000-000000000000'],
      updates: { status: 'Assigned', condition: 'Excellent' },
      performedById: ADMIN_USER.id,
      actionType: 'BULK_UPDATE',
    });

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
  });
});
