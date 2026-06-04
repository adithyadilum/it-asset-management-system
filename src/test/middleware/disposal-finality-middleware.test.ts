import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Mock dependencies BEFORE importing the module under test
const mockLogAuditAction = vi.fn();
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

const mockLogError = vi.fn();
vi.mock('@/lib/latency', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const mockGetToken = vi.fn();
vi.mock('next-auth/jwt', () => ({
  getToken: () => mockGetToken(),
}));

const mockDbFindFirst = vi.fn();
vi.mock('@/db', () => ({
  db: {
    query: {
      assets: {
        findFirst: (...args: unknown[]) => mockDbFindFirst(...args),
      },
    },
  },
}));

// Mock schema to satisfy imports
vi.mock('@/db/schema', () => ({
  assets: { id: 'assets.id' },
}));

// Mock NextResponse
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  class MockNextResponse {
    status: number;
    body: any;
    headers: any;
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    }
    json() {
      return JSON.parse(this.body);
    }
    static next = vi.fn().mockReturnValue('next-response');
  }
  return {
    ...actual,
    NextResponse: MockNextResponse,
  };
});

// Import the middleware AFTER mocks are set up
import { disposalFinalityMiddleware } from '@/middleware/disposal-finality-middleware';

describe('disposalFinalityMiddleware', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

  const createMockRequest = (method: string, pathname: string) => {
    return {
      method,
      nextUrl: { pathname },
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows non-asset API requests', async () => {
    const req = createMockRequest('PUT', '/api/v1/users/123');
    const result = await disposalFinalityMiddleware(req);
    expect(result).toBe('next-response');
    expect(mockDbFindFirst).not.toHaveBeenCalled();
  });

  it('allows GET requests on asset endpoints', async () => {
    const req = createMockRequest('GET', `/api/v1/assets/${VALID_UUID}`);
    const result = await disposalFinalityMiddleware(req);
    expect(result).toBe('next-response');
    expect(mockDbFindFirst).not.toHaveBeenCalled();
  });

  it('allows requests with invalid UUIDs without querying DB', async () => {
    const req = createMockRequest('PUT', '/api/v1/assets/invalid-id-format');
    const result = await disposalFinalityMiddleware(req);
    expect(result).toBe('next-response');
    expect(mockDbFindFirst).not.toHaveBeenCalled();
  });

  it('allows request when asset is not found', async () => {
    mockDbFindFirst.mockResolvedValue(null);
    const req = createMockRequest('PATCH', `/api/v1/assets/${VALID_UUID}`);
    
    const result = await disposalFinalityMiddleware(req);
    expect(result).toBe('next-response');
    expect(mockDbFindFirst).toHaveBeenCalledTimes(1);
  });

  it('allows request when asset is active', async () => {
    mockDbFindFirst.mockResolvedValue({
      id: VALID_UUID,
      status: 'Assigned',
      isArchived: false,
      assetTag: 'TAG-123',
    });
    
    const req = createMockRequest('DELETE', `/api/v1/assets/${VALID_UUID}`);
    const result = await disposalFinalityMiddleware(req);
    expect(result).toBe('next-response');
  });

  it('blocks request and returns 403 when asset is disposed', async () => {
    mockDbFindFirst.mockResolvedValue({
      id: VALID_UUID,
      status: 'Disposed',
      isArchived: false,
      assetTag: 'TAG-123',
    });
    mockGetToken.mockResolvedValue({ id: MOCK_USER_ID });
    
    const req = createMockRequest('PUT', `/api/v1/assets/${VALID_UUID}`);
    const response = await disposalFinalityMiddleware(req) as Response;
    
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.message).toBe('Record is finalized');
    expect(json.details).toBe('Asset is disposed');
    
    expect(mockLogAuditAction).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'ACCESS_DENIED',
      performedById: MOCK_USER_ID,
      newData: expect.objectContaining({
        reason: 'Attempted to modify a finalized record (Disposed or Archived)',
        assetTag: 'TAG-123',
        method: 'PUT',
      }),
    }));
  });

  it('blocks request and returns 403 when asset is archived', async () => {
    mockDbFindFirst.mockResolvedValue({
      id: VALID_UUID,
      status: 'Available',
      isArchived: true,
      assetTag: 'TAG-456',
    });
    mockGetToken.mockResolvedValue(null); // Anonymous user
    
    const req = createMockRequest('DELETE', `/api/v1/assets/${VALID_UUID}`);
    const response = await disposalFinalityMiddleware(req) as Response;
    
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.details).toBe('Asset is archived');
    
    // Should not log audit if no valid user ID
    expect(mockLogAuditAction).not.toHaveBeenCalled();
  });

  it('returns 503 if database check throws error', async () => {
    mockDbFindFirst.mockRejectedValue(new Error('DB failure'));
    
    const req = createMockRequest('PATCH', `/api/v1/assets/${VALID_UUID}`);
    const response = await disposalFinalityMiddleware(req) as Response;
    
    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toBe('Service Unavailable');
    
    expect(mockLogError).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'DISPOSAL_FINALITY_GUARD',
      label: 'unexpected_error_checking_record_finality',
    }));
  });
});
