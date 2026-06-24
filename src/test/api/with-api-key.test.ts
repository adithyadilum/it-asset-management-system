/**
 * @vitest-environment node
 */

 

import { NextRequest, NextResponse } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { withApiKey } from '@/lib/api/with-api-key';
import { applyRateLimit } from '@/lib/api/rate-limiter';
import { logAuditAction } from '@/lib/audit';
import { hashApiKey } from '@/lib/api/api-key-hash';

vi.mock('@/db', () => ({
  db: {
    query: {
      apiKeys: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          catch: vi.fn(),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/api/rate-limiter', () => ({
  applyRateLimit: vi.fn(),
  injectRateLimitHeaders: vi.fn((resp: any) => resp),
}));

vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn(() => ({
    catch: vi.fn(),
  })),
}));

describe('withApiKey middleware', () => {
  const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
  const requiredScope = 'read:assets';
  const validToken = 'test-token-123';
  let hashedToken = '';

  const wrappedHandler = withApiKey(requiredScope, mockHandler);

const mockApiKeyRecord: any = {
    id: 'key-test-id',
    name: 'Test Key',
    keyHash: hashedToken,
    keyPrefix: 'eitams_live_',
    keySuffix: validToken.slice(-4),
    isRevoked: false,
    expiresAt: null,
    createdAt: new Date(),
    lastUsedAt: null,
    scopes: ['read:assets'],
    createdById: 'user-id',
  };

  beforeAll(async () => {
    hashedToken = await hashApiKey(validToken);
    mockApiKeyRecord.keyHash = hashedToken;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(authHeader?: string, ip?: string, xApiKeyHeader?: string) {
    const headers = new Headers();
    if (authHeader !== undefined) headers.set('authorization', authHeader);
    if (xApiKeyHeader !== undefined) headers.set('x-api-key', xApiKeyHeader);
    if (ip !== undefined) headers.set('x-forwarded-for', ip);
    return new NextRequest('http://localhost/api/test', { headers });
  }

  it('fails if no authorization header is provided', async () => {
    const req = createRequest();
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('fails if authorization header is not Bearer', async () => {
    const req = createRequest('Token test-token');
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('fails if API key is not found', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(undefined);
    const req = createRequest(`Bearer ${validToken}`);
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_API_KEY');
  });

  it('fails if API key has been revoked', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({ ...mockApiKeyRecord, isRevoked: true });
    const req = createRequest(`Bearer ${validToken}`);
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('REVOKED_API_KEY');
  });

  it('fails if API key has expired', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({ ...mockApiKeyRecord, expiresAt: pastDate });
    const req = createRequest(`Bearer ${validToken}`);
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('EXPIRED_API_KEY');
  });

  it('fails if API key lacks required scope', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce({ ...mockApiKeyRecord, scopes: ['read:users'] });
    const req = createRequest(`Bearer ${validToken}`);
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('fails if rate limited', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(mockApiKeyRecord);
    vi.mocked(applyRateLimit).mockResolvedValueOnce({ success: false, limit: 100, remaining: 0, reset: 1234 });
    const req = createRequest(`Bearer   ${validToken}   `, '1.2.3.4');
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(applyRateLimit).toHaveBeenCalledWith('key-test-id:1.2.3.4');
  });

  it('succeeds and calls handler if valid, checking IPs and white spaces', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(mockApiKeyRecord);
    vi.mocked(applyRateLimit).mockResolvedValueOnce({ success: true, limit: 100, remaining: 99, reset: 1234 });
    
    const req = createRequest(`Bearer   ${validToken}   `, '1.2.3.4');
    const res = await wrappedHandler(req, {});
    
    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(req, { apiKey: mockApiKeyRecord });
    expect(applyRateLimit).toHaveBeenCalledWith('key-test-id:1.2.3.4');
    expect(db.update).toHaveBeenCalled();
    expect(logAuditAction).toHaveBeenCalled();
  });

  it('succeeds and calls handler if valid x-api-key header is provided', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(mockApiKeyRecord);
    vi.mocked(applyRateLimit).mockResolvedValueOnce({ success: true, limit: 100, remaining: 99, reset: 1234 });
    
    const req = createRequest(undefined, '1.2.3.4', validToken);
    const res = await wrappedHandler(req, {});
    
    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledWith(req, { apiKey: mockApiKeyRecord });
  });

  it('returns INTERNAL_ERROR for unhandled faults', async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockRejectedValueOnce(new Error('DB connection failed'));
    const req = createRequest(`Bearer ${validToken}`);
    const res = await wrappedHandler(req, {});
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
