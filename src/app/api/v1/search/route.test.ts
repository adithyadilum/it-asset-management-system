/**
 * @vitest-environment node
 */

import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { GET } from '@/app/api/v1/search/route';
import { jwtVerify } from 'jose';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

vi.mock('@/lib/jwt', () => ({
  getJwtSecretKey: vi.fn(() => new TextEncoder().encode('test-secret-key')),
}));

vi.mock('@/lib/uuid', () => ({
  isValidUuid: vi.fn(() => true),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn(() => 0),
  logLatency: vi.fn(() => 0),
  logError: vi.fn(),
}));

function createSelectChain(result: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
  };
}

function createRequest(url: string, sessionToken?: string): NextRequest {
  return {
    nextUrl: new URL(url),
    cookies: {
      get: vi.fn(() =>
        sessionToken ? { name: 'session_token', value: sessionToken } : undefined
      ),
    },
  } as unknown as NextRequest;
}

describe('GET /api/v1/search', () => {
  const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    const response = await GET(createRequest('http://localhost/api/v1/search?q=laptop'));
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns assets, users, and backend-driven reports for GlobalAdmin', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        sid: 'session-id-1',
        role: 'GlobalAdmin',
      },
    } as never);

    const queuedResults = [
      [{ id: 1 }],
      [
        {
          id: 'asset-1',
          assetTag: 'LAP-001',
          name: 'ThinkPad T14',
          serialNumber: 'SN-001',
          category: 'Laptop',
        },
      ],
      [
        {
          id: 'user-1',
          name: 'Jane Doe',
          email: 'jane@tiqri.com',
          department: 'IT',
        },
      ],
      [{ count: 14 }],
      [{ count: 3 }],
      [{ count: 250 }],
    ];

    dbSelectMock.mockImplementation(() =>
      createSelectChain(queuedResults.shift() ?? [])
    );

    const response = await GET(
      createRequest('http://localhost/api/v1/search?q=report', 'valid-token')
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.assets).toHaveLength(1);
    expect(body.users).toHaveLength(1);
    expect(body.reports).toHaveLength(3);
    expect(body.reports[0]).toEqual(
      expect.objectContaining({
        label: 'Software Compliance Report',
      })
    );
  });

  it('returns empty restricted groups for Employee role', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        sid: 'session-id-2',
        role: 'Employee',
      },
    } as never);

    dbSelectMock.mockImplementation(() => createSelectChain([{ id: 1 }]));

    const response = await GET(
      createRequest('http://localhost/api/v1/search?q=lap', 'valid-token')
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.assets).toEqual([]);
    expect(body.users).toEqual([]);
    expect(body.reports).toEqual([]);
  });
});
