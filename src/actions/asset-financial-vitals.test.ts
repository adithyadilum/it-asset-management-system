import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAssetFinancialVitals } from '@/actions/asset-financial-vitals';
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

const mockResolveAssetPrimaryId = vi.fn();
vi.mock('@/lib/data/asset-details-repo', () => ({
  resolveAssetPrimaryId: (id: string) => mockResolveAssetPrimaryId(id),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    [
      'values',
      'set',
      'where',
      'returning',
      'limit',
      'offset',
      'innerJoin',
      'leftJoin',
      'orderBy',
      'from',
      'groupBy',
    ].forEach((m) => (c[m] = vi.fn().mockReturnThis()));
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
    const proxy = new Proxy(c, {
      get(t, p) {
        if (p === 'then') return (r: (v: unknown) => void) => r(resolvedValue);
        return t[p as string];
      },
    });
    return proxy;
  };

  const db = {
    select: vi.fn().mockReturnValue(chain([])),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  assets: {
    id: 'assets.id',
    assetTag: 'assets.assetTag',
    usefulLifeMonths: 'assets.usefulLifeMonths',
    modelId: 'assets.modelId',
  },
  // Joined so the vitals query can read the pillar, which decides whether the
  // asset depreciates at all.
  models: { id: 'models.id', categoryId: 'models.categoryId' },
  categories: { id: 'categories.id', pillar: 'categories.pillar' },
  assetPurchases: {
    assetId: 'assetPurchases.assetId',
    purchaseDate: 'assetPurchases.purchaseDate',
    basePrice: 'assetPurchases.basePrice',
    tax: 'assetPurchases.tax',
    shippingCost: 'assetPurchases.shippingCost',
    totalCost: 'assetPurchases.totalCost',
    currencyCode: 'assetPurchases.currencyCode',
    warrantyExpiry: 'assetPurchases.warrantyExpiry',
  },
  maintenanceTickets: {
    assetId: 'maintenanceTickets.assetId',
    status: 'maintenanceTickets.status',
    actualCost: 'maintenanceTickets.actualCost',
  },
}));

describe('getAssetFinancialVitals', () => {
  const MOCK_ASSET_ID = 'e5772338-9584-4d2d-be20-1b29ccdfeb7d';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restricts access to FinancialAuditor and GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getAssetFinancialVitals(MOCK_ASSET_ID)).rejects.toThrow(
      'Forbidden'
    );

    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(getAssetFinancialVitals(MOCK_ASSET_ID)).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws error if asset not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockResolveAssetPrimaryId.mockResolvedValue(null);

    await expect(getAssetFinancialVitals(MOCK_ASSET_ID)).rejects.toThrow(
      'Failed to load financial vitals.'
    );
  });

  it('aggregates purchase details and repair costs correctly', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockResolveAssetPrimaryId.mockResolvedValue(MOCK_ASSET_ID);

    mockDb.select
      .mockReturnValueOnce(
        chain([
          {
            id: MOCK_ASSET_ID,
            assetTag: 'TAG-123',
            usefulLifeMonths: 60,
            purchaseDate: new Date().toISOString(),
            basePrice: '1000',
            tax: '100',
            shippingCost: '50',
            totalCost: '1150',
            currencyCode: 'USD',
            warrantyExpiry: null,
          },
        ])
      )
      .mockReturnValueOnce(chain([{ totalRepair: '350' }])); // repair costs

    const result = await getAssetFinancialVitals(MOCK_ASSET_ID);

    expect(result.totalCost).toBe(1150);
    expect(result.totalRepairCosts).toBe(350);
    expect(result.totalTCO).toBe(1500);
    expect(result.isUnderWarranty).toBe(false);
  });

  it('correctly flags isUnderWarranty when future date is present', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockResolveAssetPrimaryId.mockResolvedValue(MOCK_ASSET_ID);

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockDb.select
      .mockReturnValueOnce(
        chain([
          {
            id: MOCK_ASSET_ID,
            assetTag: 'TAG-123',
            usefulLifeMonths: 60,
            purchaseDate: new Date().toISOString(),
            basePrice: '1000',
            tax: '0',
            shippingCost: '0',
            totalCost: '1000',
            currencyCode: 'USD',
            warrantyExpiry: futureDate.toISOString(),
          },
        ])
      )
      .mockReturnValueOnce(chain([{ totalRepair: '0' }]));

    const result = await getAssetFinancialVitals(MOCK_ASSET_ID);
    expect(result.isUnderWarranty).toBe(true);
  });
});
