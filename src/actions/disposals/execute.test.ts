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
  categories: { id: 'categories.id', name: 'categories.name', pillar: 'categories.pillar' },
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
  let callCount = 0;
  mockDb.select.mockImplementation(() => {
    callCount++;
    // First select call = category lookup (outside transaction).
    // Subsequent calls = disposal records, assets, purchases (inside tx).
    const value =
      callCount === 1
        ? [{ name: categoryName }]
        : [];
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
      const fd = buildFormData({ disposalMethod: 'Recycled', dataWiped: 'true' });
      const result = await executeAssetDisposal(prevState, fd);
      // Will fail at DB (no records), but NOT with 'Validation failed.'
      expect(result.message).not.toBe('Validation failed.');
    });

    it('accepts Disposed as a valid disposalMethod', async () => {
      const fd = buildFormData({ disposalMethod: 'Disposed', dataWiped: 'true' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe('Validation failed.');
    });
  });

  // ── dataWiped category-aware enforcement ─────────────────────────────────
  describe('dataWiped enforcement', () => {
    it('rejects single data-bearing asset when dataWiped=false', async () => {
      mockCategoryThenFallback('Laptop');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Data wipe confirmation is required for this device type.'
      );
    });

    it('rejects "server" category without dataWiped confirmation', async () => {
      mockCategoryThenFallback('Server');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Data wipe confirmation is required for this device type.'
      );
    });

    it('allows single non-data-bearing asset (e.g. Chair) with dataWiped=false', async () => {
      mockCategoryThenFallback('Office Chair');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      // Should pass the dataWiped gate and fail later at DB (no disposal records)
      expect(result.message).not.toBe(
        'Data wipe confirmation is required for this device type.'
      );
    });

    it('allows single printer asset with dataWiped=false', async () => {
      mockCategoryThenFallback('Printer');
      const fd = buildFormData({ dataWiped: 'false' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe(
        'Data wipe confirmation is required for this device type.'
      );
    });

    it('skips dataWiped check for bulk disposals even with data-bearing names', async () => {
      // Bulk = 2+ assets; the category check should be bypassed entirely
      const fd = buildFormData({ dataWiped: 'false' });
      fd.set('disposalIds', JSON.stringify([1, 2]));
      fd.set('assetIds', JSON.stringify([VALID_UUID, VALID_UUID_2]));
      const result = await executeAssetDisposal(prevState, fd);
      // db.select should NOT have been called for a category lookup
      // Result will fail at DB level, but not at dataWiped gate
      expect(result.message).not.toBe(
        'Data wipe confirmation is required for this device type.'
      );
    });

    it('allows data-bearing device when dataWiped=true (no category check needed)', async () => {
      // When dataWiped is true the guard short-circuits and the category DB
      // query is never issued. The submission should proceed past both the
      // schema layer and the dataWiped gate (and ultimately fail at the DB
      // level since no disposal records exist in the mock).
      const fd = buildFormData({ dataWiped: 'true' });
      const result = await executeAssetDisposal(prevState, fd);
      expect(result.message).not.toBe(
        'Data wipe confirmation is required for this device type.'
      );
      expect(result.message).not.toBe('Validation failed.');
    });
  });
});
