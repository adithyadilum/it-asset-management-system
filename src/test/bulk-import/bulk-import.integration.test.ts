import { parseAndValidateImport, executeBulkImport } from '@/actions/bulk-import';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  canManageAssets: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      categories: {
        findFirst: vi.fn(),
      },
      brands: { findMany: vi.fn(() => []) },
      models: { findMany: vi.fn(() => []) },
      locations: { findMany: vi.fn(() => []) },
      vendors: { findMany: vi.fn(() => []) },
      owners: { findMany: vi.fn(() => []) },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ value: 10 }])),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: function (resolve: any) {
          resolve([]);
        },
      })),
    })),
    execute: vi.fn(() => Promise.resolve({ rows: [{ pg_try_advisory_lock: true }] })),
    transaction: vi.fn(async (cb) => {
      // Create a mock transaction object
      const tx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => [{ id: 1, assetTag: 'HRW-LAP-011' }]),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            then: function (resolve: any) { resolve([{ id: 1 }]); },
          })),
        })),
      };
      await cb(tx);
    }),
  },
}));

describe('Bulk Import Integration', () => {
  it('rejects unauthenticated users', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
    const formData = new FormData();
    const result = await parseAndValidateImport(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/sign in/i);
  });

  it('rejects users without proper permissions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({ id: 'user-1', role: 'Employee' } as any);
    vi.mocked(canManageAssets).mockReturnValueOnce(false);
    
    const formData = new FormData();
    const result = await parseAndValidateImport(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Forbidden/i);
  });

  it('executes bulk import successfully when lock is acquired', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: 'admin', role: 'GlobalAdmin' } as any);
    vi.mocked(canManageAssets).mockReturnValue(true);

    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({
      id: 1,
      name: 'Laptops',
      pillar: 'Hardware',
      prefix: 'LAP',
      isActive: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedRows: any[] = [
      {
        rowNumber: 2,
        name: 'MacBook Pro',
        serialNumber: 'ABC-123',
        modelId: 1,
        brandId: 1,
        vendorId: 1,
        purchaseDate: '2023-01-01',
        basePrice: 2000,
        tax: 200,
        shippingCost: 50,
        currencyCode: 'USD',
      }
    ];

    const result = await executeBulkImport(1, resolvedRows, 'import.csv');
    expect(result.success).toBe(true);
    expect(result.summary?.successCount).toBe(1);
    expect(result.summary?.failedCount).toBe(0);
    expect(result.summary?.importedAssetTags).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith('/assets', 'layout');
  });

  it('fails execute if lock is not granted', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: 'admin', role: 'GlobalAdmin' } as any);
    vi.mocked(canManageAssets).mockReturnValue(true);

    // Mock lock failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ pg_try_advisory_lock: false }] } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await executeBulkImport(1, [{}] as any, 'import.csv');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/currently in progress/i);
  });
});
