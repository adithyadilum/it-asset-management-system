import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER } from '@/test/fixtures/users';
import type { DisposalFormState } from '@/types/disposals';

// ── Auth mock ────────────────────────────────────────────────────────────────
vi.mock('@/actions/auth', () => ({
  enforceFormAccess: vi.fn(async (_validator: unknown) => ({
    ok: true,
    user: ADMIN_USER,
  })),
}));

// ── DB mock ──────────────────────────────────────────────────────────────────
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
    insert: vi.fn().mockReturnValue(chain([])),
    update: vi.fn().mockReturnValue(chain([])),
    select: vi.fn().mockReturnValue(chain([])),
    transaction: vi.fn(async (cb: (tx: typeof db) => unknown) => {
      try {
        return await cb(db);
      } catch (e) {
        throw e;
      }
    }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  assetDisposals: {
    id: 'assetDisposals.id',
    assetId: 'assetDisposals.assetId',
    status: 'assetDisposals.status',
  },
  assetPurchases: {
    id: 'assetPurchases.id',
    assetId: 'assetPurchases.assetId',
    totalCost: 'assetPurchases.totalCost',
    purchaseDate: 'assetPurchases.purchaseDate',
  },
  assets: {
    id: 'assets.id',
    assetTag: 'assets.assetTag',
    status: 'assets.status',
    isArchived: 'assets.isArchived',
    modelId: 'assets.modelId',
    usefulLifeMonths: 'assets.usefulLifeMonths',
    salvageValue: 'assets.salvageValue',
  },
  users: { id: 'users.id' },
  models: { id: 'models.id', categoryId: 'models.categoryId' },
  categories: {
    id: 'categories.id',
    name: 'categories.name',
    pillar: 'categories.pillar',
  },
  brands: { id: 'brands.id' },
  systemAuditLogs: { id: 'systemAuditLogs.id' },
  maintenanceTickets: { id: 'maintenanceTickets.id' },
  assetDocuments: { id: 'assetDocuments.id' },
  assetAssignments: {
    assetId: 'assetAssignments.assetId',
    returnedDate: 'assetAssignments.returnedDate',
  },
}));

vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/depreciation', () => ({
  calculateCurrentBookValue: vi.fn().mockReturnValue(500),
  DEFAULT_USEFUL_LIFE_MONTHS: 60,
}));

import { executeAssetDisposal } from '@/actions/disposals/execute';

// ── Helpers ──────────────────────────────────────────────────────────────────
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';
const prevState: DisposalFormState = { success: false, message: '' };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set('disposalIds', JSON.stringify([1]));
  fd.set('assetIds', JSON.stringify([VALID_UUID]));
  fd.set('reason', 'End of life');
  fd.set('disposalMethod', 'Donated');
  fd.set('dataWiped', 'true');
  fd.set('tagsRemoved', 'true');
  fd.set('receiptUrls', JSON.stringify([]));
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

/** Configures mockDb.select to first return the category row, then fall back
 *  to returning [] for all subsequent calls (disposal records, assets, etc.).
 *  The action calls db.select multiple times inside the transaction. */
function mockCategoryThenFallback(categoryName: string) {
  mockCategoriesThenFallback([categoryName]);
}

/** As above, but for a batch: the lookup returns one row per asset. */
function mockCategoriesThenFallback(categoryNames: readonly string[]) {
  let callCount = 0;
  mockDb.select.mockImplementation(() => {
    callCount++;
    // First select call = category lookup (outside transaction).
    // Subsequent calls = disposal records, assets, purchases (inside tx).
    const value =
      callCount === 1 ? categoryNames.map((name) => ({ name })) : [];
    return chain(value);
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('executeAssetDisposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: select returns empty arrays (no special category setup)
    mockDb.select.mockReturnValue(chain([]));
  });

  // ── Schema validation ────────────────────────────────────────────────────
  describe('schema validation', () => {
    it('rejects missing tagsRemoved', async () => {
      const fd = buildFormData({ tagsRemoved: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed.');
    });

    it('rejects an unknown disposalMethod', async () => {
      const fd = buildFormData({ disposalMethod: 'Vaporised' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed.');
    });

    it('accepts Recycled as a valid disposalMethod', async () => {
      // Should not fail at the schema level (it may still fail at DB level)
      const fd = buildFormData({
        disposalMethod: 'Recycled',
        dataWiped: 'true',
      });
      const result = await executeAssetDisposal(prevState, fd);
      // Will fail at DB (no records), but NOT with 'Validation failed.'
      expect(result.message).not.toBe('Validation failed.');
    });

    it('accepts Disposed as a valid disposalMethod', async () => {
      const fd = buildFormData({
        disposalMethod: 'Disposed',
        dataWiped: 'true',
      });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe('Validation failed.');
    });
  });

  // ── dataWiped category-aware enforcement ─────────────────────────────────
  describe('dataWiped enforcement', () => {
    const WIPE_REQUIRED =
      'Confirm the data has been wiped before disposing these assets.';

    it('rejects a data-bearing asset when dataWiped=false', async () => {
      mockCategoryThenFallback('Laptop');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('rejects a "Server" category without confirmation', async () => {
      mockCategoryThenFallback('Server');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('allows a chair through without confirmation', async () => {
      mockCategoryThenFallback('Office Chair');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      // Clears the wipe gate; fails later on the empty disposal-record mock.
      expect(result.message).not.toBe(WIPE_REQUIRED);
    });

    it('allows a monitor through without confirmation', async () => {
      mockCategoryThenFallback('Monitor');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe(WIPE_REQUIRED);
    });

    it.each(['Laptops', 'Smartphone', 'Notebook', 'PC', 'Printer'])(
      'requires confirmation for %s, which no keyword list anticipated',
      async (categoryName) => {
        // The rule fails closed, so plurals, renames and categories invented
        // after the fact are covered rather than silently exempt.
        mockCategoryThenFallback(categoryName);
        const fd = buildFormData({ dataWiped: 'false' });
        const result = await executeAssetDisposal(prevState, fd);
        expect(result.success).toBe(false);
        expect(result.message).toBe(WIPE_REQUIRED);
      }
    );

    it('requires confirmation for a bulk batch of data-bearing assets', async () => {
      // Treating "more than one asset" as a mixed batch waived the
      // confirmation for a trolley of laptops. A batch is exempt only when
      // every asset in it is.
      mockCategoriesThenFallback(['Laptop', 'Laptop']);
      const fd = buildFormData({ dataWiped: 'false' });
      fd.set('disposalIds', JSON.stringify([1, 2]));
      fd.set('assetIds', JSON.stringify([VALID_UUID, VALID_UUID_2]));
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('requires confirmation when only part of a batch is data-bearing', async () => {
      mockCategoriesThenFallback(['Office Chair', 'Laptop']);
      const fd = buildFormData({ dataWiped: 'false' });
      fd.set('disposalIds', JSON.stringify([1, 2]));
      fd.set('assetIds', JSON.stringify([VALID_UUID, VALID_UUID_2]));
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('allows a batch through when nothing in it can hold data', async () => {
      mockCategoriesThenFallback(['Office Chair', 'Desk']);
      const fd = buildFormData({ dataWiped: 'false' });
      fd.set('disposalIds', JSON.stringify([1, 2]));
      fd.set('assetIds', JSON.stringify([VALID_UUID, VALID_UUID_2]));
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe(WIPE_REQUIRED);
    });

    it('is not fooled by a duplicated asset ID posing as a batch', async () => {
      // The schema accepts duplicates, so `[id, id]` used to read as bulk and
      // skip the gate, then deduplicate back to the one data-bearing asset
      // inside the transaction. The check runs after normalization now.
      mockCategoryThenFallback('Laptop');
      const fd = buildFormData({ dataWiped: 'false' });
      fd.set('disposalIds', JSON.stringify([1, 1]));
      fd.set('assetIds', JSON.stringify([VALID_UUID, VALID_UUID]));
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('requires confirmation when the category cannot be resolved', async () => {
      // No row came back for the asset, so we cannot say it is harmless.
      mockCategoriesThenFallback([]);
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(WIPE_REQUIRED);
    });

    it('skips the category lookup entirely when dataWiped=true', async () => {
      const fd = buildFormData({ dataWiped: 'true' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe(WIPE_REQUIRED);
      expect(result.message).not.toBe('Validation failed.');
    });
  });
});
