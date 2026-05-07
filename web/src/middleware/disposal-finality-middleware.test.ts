/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { disposalFinalityMiddleware } from './disposal-finality-middleware';
import { jwtVerify } from 'jose';

vi.mock('@/db', () => ({
  db: {
    query: {
      assets: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

vi.mock('@/lib/auth/jwt', () => ({
  getJwtSecretKey: vi.fn(() => new TextEncoder().encode('test-secret-key')),
}));

vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));

function createRequest(url: string, method: string = 'GET', sessionToken?: string): NextRequest {
  return {
    nextUrl: new URL(url),
    method,
    cookies: {
      get: vi.fn(() =>
        sessionToken ? { name: 'session_token', value: sessionToken } : undefined
      ),
    },
  } as unknown as NextRequest;
}

describe('disposalFinalityMiddleware', () => {
  const findFirstMock = db.query.assets.findFirst as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through for GET requests', async () => {
    const req = createRequest('http://localhost/api/v1/assets/550e8400-e29b-41d4-a716-446655440000', 'GET');
    const response = await disposalFinalityMiddleware(req);
    
    // NextResponse.next() doesn't have an easily detectable "next" state in standard Response objects
    // but we can check that it didn't return a 403
    expect(response.status).not.toBe(403);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('passes through for non-asset routes', async () => {
    const req = createRequest('http://localhost/api/v1/other/route', 'PATCH');
    const response = await disposalFinalityMiddleware(req);
    
    expect(response.status).not.toBe(403);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('blocks PATCH requests for Disposed assets', async () => {
    const assetId = '550e8400-e29b-41d4-a716-446655440000';
    findFirstMock.mockResolvedValue({
      id: assetId,
      status: 'Disposed',
      isArchived: false,
      assetTag: 'AST-001',
    });

    const req = createRequest(`http://localhost/api/v1/assets/${assetId}`, 'PATCH');
    const response = await disposalFinalityMiddleware(req);
    
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe('Record is finalized');
    expect(body.details).toBe('Asset is disposed');
  });

  it('blocks PUT requests for Archived assets', async () => {
    const assetId = '550e8400-e29b-41d4-a716-446655440000';
    findFirstMock.mockResolvedValue({
      id: assetId,
      status: 'Available',
      isArchived: true,
      assetTag: 'AST-001',
    });

    const req = createRequest(`http://localhost/api/v1/assets/${assetId}`, 'PUT');
    const response = await disposalFinalityMiddleware(req);
    
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.details).toBe('Asset is archived');
  });

  it('allows PATCH requests for active assets', async () => {
    const assetId = '550e8400-e29b-41d4-a716-446655440000';
    findFirstMock.mockResolvedValue({
      id: assetId,
      status: 'Available',
      isArchived: false,
      assetTag: 'AST-001',
    });

    const req = createRequest(`http://localhost/api/v1/assets/${assetId}`, 'PATCH');
    const response = await disposalFinalityMiddleware(req);
    
    expect(response.status).not.toBe(403);
  });

  it('logs audit action when blocking', async () => {
    const assetId = '550e8400-e29b-41d4-a716-446655440000';
    findFirstMock.mockResolvedValue({
      id: assetId,
      status: 'Disposed',
      isArchived: false,
      assetTag: 'AST-001',
    });

    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-123' },
    } as any);

    const req = createRequest(`http://localhost/api/v1/assets/${assetId}`, 'DELETE', 'mock-token');
    await disposalFinalityMiddleware(req);
    
    const { logAuditAction } = await import('@/lib/audit');
    expect(logAuditAction).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'ACCESS_DENIED',
      performedById: 'user-123',
    }));
  });
});
