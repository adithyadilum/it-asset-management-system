/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { GET as getUsers } from '@/app/api/v1/external/users/route';
import { GET as getMaintenance } from '@/app/api/v1/external/maintenance/route';
import { GET as getDisposals } from '@/app/api/v1/external/disposals/route';
import { GET as getFinancials } from '@/app/api/v1/external/financials/route';
import { POST as postAssets } from '@/app/api/v1/external/assets/route';
import { applyRateLimit } from '@/lib/api/rate-limiter';
import { createHash } from 'node:crypto';

// Mock DB queries
vi.mock('@/db', () => ({
  db: {
    query: {
      apiKeys: {
        findFirst: vi.fn(),
      },
      models: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          catch: vi.fn(),
        })),
      })),
    })),
    transaction: vi.fn((cb) => cb(db)),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-uuid', assetTag: 'HRW-001' }]),
      })),
    })),
  },
}));

vi.mock('@/lib/api/rate-limiter', () => ({
  applyRateLimit: vi.fn(),
  injectRateLimitHeaders: vi.fn((resp) => resp),
}));

vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: vi.fn(),
}));

vi.mock('@/lib/currency', () => ({
  fetchLiveExchangeRates: vi.fn(() => Promise.resolve({ USD: 0.003 })),
  convertCurrencyAmount: vi.fn(() => 300),
}));

// Generates a mock select chain that works with await regardless of the last method called (thenable)
function createSelectChain(result: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    then: <T>(resolve: (value: T) => void) => resolve(result as T),
  };
  return chain;
}

function createRequest(url: string, method = 'GET', authHeader?: string, body?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return {
    method,
    nextUrl: new URL(url),
    headers,
    text: vi.fn().mockResolvedValue(body || '{}'),
  } as unknown as NextRequest;
}

describe('External API Endpoints Scoping', () => {
  const validToken = 'test-token-123';
  const hashedToken = createHash('sha256').update(validToken).digest('hex');
  const authHeader = `Bearer ${validToken}`;

  const mockApiKeyRecord = {
    id: 'key-test-id',
    name: 'Test Key',
    keyHash: hashedToken,
    isRevoked: false,
    expiresAt: null,
    scopes: [] as string[],
    createdById: 'user-id',
    createdAt: new Date(),
    keyPrefix: 'eitams_',
    keySuffix: 'abcd',
    lastUsedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(applyRateLimit).mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 1234 });
  });

  describe('GET /api/v1/external/users', () => {
    it('returns 403 when read:users scope is missing', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:assets'], // Missing read:users
      });

      const req = createRequest('http://localhost/api/v1/external/users', 'GET', authHeader);
      const res = await getUsers(req, {});
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 list of users when read:users scope is present', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:users'],
      });

      const mockUsers = [{ id: 'u1', name: 'Albin', email: 'albin@tiqri.com' }];
      const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;
      dbSelectMock
        .mockImplementationOnce(() => createSelectChain([{ count: 1 }])) // First call: count
        .mockImplementationOnce(() => createSelectChain(mockUsers));      // Second call: users list

      const req = createRequest('http://localhost/api/v1/external/users', 'GET', authHeader);
      const res = await getUsers(req, {});
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/external/maintenance', () => {
    it('returns 403 when read:maintenance scope is missing', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:users'], // Missing read:maintenance
      });

      const req = createRequest('http://localhost/api/v1/external/maintenance', 'GET', authHeader);
      const res = await getMaintenance(req, {});
      expect(res.status).toBe(403);
    });

    it('returns 200 list of tickets when read:maintenance is present', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:maintenance'],
      });

      const mockTickets = [{ id: 1, status: 'ACTIVE', reportedIssue: 'Broken Screen' }];
      const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;
      dbSelectMock
        .mockImplementationOnce(() => createSelectChain([{ count: 1 }]))
        .mockImplementationOnce(() => createSelectChain(mockTickets));

      const req = createRequest('http://localhost/api/v1/external/maintenance', 'GET', authHeader);
      const res = await getMaintenance(req, {});
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/external/disposals', () => {
    it('returns 403 when read:disposals scope is missing', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:users'],
      });

      const req = createRequest('http://localhost/api/v1/external/disposals', 'GET', authHeader);
      const res = await getDisposals(req, {});
      expect(res.status).toBe(403);
    });

    it('returns 200 list of disposals when read:disposals is present', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:disposals'],
      });

      const mockDisposals = [{ id: 1, status: 'Pending Approval', reason: 'Old age' }];
      const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;
      dbSelectMock
        .mockImplementationOnce(() => createSelectChain([{ count: 1 }]))
        .mockImplementationOnce(() => createSelectChain(mockDisposals));

      const req = createRequest('http://localhost/api/v1/external/disposals', 'GET', authHeader);
      const res = await getDisposals(req, {});
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/external/financials', () => {
    it('returns 403 when read:financials scope is missing', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:users'],
      });

      const req = createRequest('http://localhost/api/v1/external/financials', 'GET', authHeader);
      const res = await getFinancials(req, {});
      expect(res.status).toBe(403);
    });

    it('returns 200 list of financial summaries when read:financials is present', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:financials'],
      });

      const mockFinancials = [
        {
          id: 'asset-id-1',
          assetTag: 'HRW-001',
          name: 'ThinkPad Laptop',
          categoryName: 'IT',
          purchaseDate: new Date('2024-01-01'),
          basePrice: '1000',
          tax: '50',
          shippingCost: '20',
          totalCost: '1070',
          currencyCode: 'USD',
          usefulLifeMonths: 60,
          salvageValue: '100',
        },
      ];
      const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;
      dbSelectMock
        .mockImplementationOnce(() => createSelectChain([{ count: 1 }]))
        .mockImplementationOnce(() => createSelectChain(mockFinancials));

      const req = createRequest('http://localhost/api/v1/external/financials', 'GET', authHeader);
      const res = await getFinancials(req, {});
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].financials.originalCost).toBe(1070);
    });
  });

  describe('POST /api/v1/external/assets', () => {
    const validAssetBody = JSON.stringify({
      pillar: 'IT & Digital',
      categoryId: 1,
      brandId: 1,
      modelId: 1,
      name: 'External Asset 1',
      serialNumber: 'SN-EXT-001',
      purchaseDate: '2026-06-01T00:00:00.000Z',
      basePrice: 1500,
      vendorId: 1,
    });

    it('returns 403 when write:assets scope is missing', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['read:assets'], // Missing write:assets
      });

      const req = createRequest('http://localhost/api/v1/external/assets', 'POST', authHeader, validAssetBody);
      const res = await postAssets(req, {});
      expect(res.status).toBe(403);
    });

    it('returns 201 when write:assets scope is present and body is valid', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['write:assets'],
      });

      vi.mocked(db.query.models.findFirst).mockResolvedValueOnce({
        id: 1,
        name: 'Model 1',
        category: {
          id: 1,
          prefix: 'HRW',
        },
      } as unknown as never);

      const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;
      dbSelectMock.mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ value: 0 }]),
      }));

      const req = createRequest('http://localhost/api/v1/external/assets', 'POST', authHeader, validAssetBody);
      const res = await postAssets(req, {});

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.assetTag).toBe('HRW-001');
    });

    it('returns 400 when Zod validation fails', async () => {
      vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({
        ...mockApiKeyRecord,
        scopes: ['write:assets'],
      });

      const invalidBody = JSON.stringify({
        pillar: 'IT & Digital',
        name: '', // Empty name triggers validation failure
      });

      const req = createRequest('http://localhost/api/v1/external/assets', 'POST', authHeader, invalidBody);
      const res = await postAssets(req, {});

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
