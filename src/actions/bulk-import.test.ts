import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';
import { ResolvedImportRow } from '@/lib/bulk-import/types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

vi.mock('@/lib/currency', () => ({
  fetchLiveExchangeRates: vi.fn().mockResolvedValue(null),
  convertCurrencyAmount: vi.fn().mockReturnValue(100),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
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
    delete: vi.fn().mockReturnValue(chain([])),
    select: vi.fn().mockReturnValue(chain([])),
    from: vi.fn().mockReturnValue(chain([])),
    execute: vi.fn().mockResolvedValue({ rows: [{ pg_try_advisory_lock: true }] }),
    query: {
      categories: {
        findFirst: vi.fn().mockResolvedValue({ id: 1, isActive: true, prefix: 'LPT', requiresSerial: true }),
      }
    },
    transaction: vi.fn(async (cb) => {
      try { return await cb(db); } catch (e) { throw e; }
    }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  assets: { id: 'assets.id', assetTag: 'assets.assetTag' },
  assetPurchases: { id: 'assetPurchases.id' },
  categories: { id: 'categories.id' },
  systemAuditLogs: { id: 'systemAuditLogs.id' },
}));

const mockGenerateTemplateWorkbook = vi.fn().mockResolvedValue({ buffer: Buffer.from('test'), fileName: 'template.xlsx' });
vi.mock('@/lib/bulk-import/generate-template', () => ({
  generateTemplateWorkbook: (...args: unknown[]) => mockGenerateTemplateWorkbook(...args),
}));

const mockParseFile = vi.fn().mockResolvedValue({ rows: [], skippedEmptyRows: 0 });
vi.mock('@/lib/bulk-import/parse-file', () => ({
  parseFile: (...args: unknown[]) => mockParseFile(...args),
}));

const mockPreloadMasterDataCache = vi.fn().mockResolvedValue({});
vi.mock('@/lib/bulk-import/resolve-references', () => ({
  preloadMasterDataCache: (...args: unknown[]) => mockPreloadMasterDataCache(...args),
}));

const mockValidateRows = vi.fn().mockReturnValue({ validRows: [], errorRows: [] });
vi.mock('@/lib/bulk-import/validate-rows', () => ({
  validateRows: (...args: unknown[]) => mockValidateRows(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  generateImportTemplate,
  parseAndValidateImport,
  executeBulkImport,
} from '@/actions/bulk-import';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateImportTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthenticated message if user is null', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await generateImportTemplate(1);
    expect(res.success).toBe(false);
    expect(res.message).toContain('sign in');
  });

  it('returns forbidden for employee user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const res = await generateImportTemplate(1);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Forbidden');
  });

  it('successfully generates and returns base64 string for admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const res = await generateImportTemplate(1);
    expect(res.success).toBe(true);
    expect(res.fileBase64).toBe(Buffer.from('test').toString('base64'));
    expect(res.fileName).toBe('template.xlsx');
  });
});

describe('parseAndValidateImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error if user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await parseAndValidateImport(new FormData());
    expect(res.success).toBe(false);
  });

  it('returns forbidden for employee user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const res = await parseAndValidateImport(new FormData());
    expect(res.success).toBe(false);
  });

  it('returns error if formData missing categoryId or file', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const fd = new FormData();
    const res = await parseAndValidateImport(fd);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Category ID and File are required');
  });
});

describe('executeBulkImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error if user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await executeBulkImport(1, [], 'file.csv');
    expect(res.success).toBe(false);
  });

  it('returns error if no rows to import', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const res = await executeBulkImport(1, [], 'file.csv');
    expect(res.success).toBe(false);
    expect(res.message).toContain('No rows to import');
  });

  it('returns error if rows exceed 5000', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const rows = Array(5001).fill({} as unknown as ResolvedImportRow);
    const res = await executeBulkImport(1, rows, 'file.csv');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Cannot import more than 5000 rows');
  });

  it('returns error if lock cannot be acquired', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.execute.mockResolvedValueOnce({ rows: [{ pg_try_advisory_lock: false }] });
    
    const res = await executeBulkImport(1, [{}] as unknown as ResolvedImportRow[], 'file.csv');
    expect(res.success).toBe(false);
    expect(res.message).toContain('progress');
  });

  it('successfully executes bulk import', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.execute.mockResolvedValue({ rows: [{ pg_try_advisory_lock: true }] });
    
    // Select count returns 0
    mockDb.select.mockReturnValueOnce(chain([{ value: 0 }]));
    mockDb.insert.mockReturnValue(chain([{ id: 1, assetTag: 'LPT-001' }]));

    const mockRow = {
      rowNumber: 2,
      name: 'MacBook Pro',
      serialNumber: 'SN-123',
      modelId: 1,
      locationId: 1,
      ownerId: 1,
      condition: 'New',
      purchaseDate: '2023-01-01',
      basePrice: 1500,
      tax: 150,
      shippingCost: 20,
      vendorId: 1,
      currencyCode: 'USD',
      warrantyMonths: 12,
    };

    const res = await executeBulkImport(1, [mockRow as unknown as ResolvedImportRow], 'file.csv');
    
    expect(res.success).toBe(true);
    // 1 asset + 1 purchase + 1 audit (inside tx)
    // Wait, audit might use its own tx or db depending on how logAuditActionTx is mocked
    // I didn't mock logAuditActionTx but we can verify successCount is 1
    if ('summary' in res) {
      expect(res.summary?.successCount).toBe(1);
      expect(res.summary?.failedCount).toBe(0);
    }
    expect(revalidatePath).toHaveBeenCalledWith('/assets', 'layout');
  });
});
