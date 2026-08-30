/**
 * @vitest-environment node
 */

import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { GET } from '@/app/api/v1/search/route';
import { getToken } from 'next-auth/jwt';

const mockGetAuthenticatedUserFromRequest = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));
vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: vi.fn(),
  getAuthenticatedUserFromRequest: mockGetAuthenticatedUserFromRequest,
  getAuthenticatedMobileUserFromRequest: vi.fn(),
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

function createRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    cookies: {
      get: vi.fn(),
    },
  } as unknown as NextRequest;
}

/** The route is wrapped in `withAuth`, so it receives (request, ctx). */
const callGet = (req: NextRequest) => GET(req, {});

describe('GET /api/v1/search', () => {
  const dbSelectMock = db.select as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    mockGetAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await callGet(
      createRequest('http://localhost/api/v1/search?q=laptop')
    );
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns assets, users, and backend-driven reports for GlobalAdmin', async () => {
    mockGetAuthenticatedUserFromRequest.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'GlobalAdmin',
    } as never);

    const queuedResults = [
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

    const response = await callGet(
      createRequest('http://localhost/api/v1/search?q=report')
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
    mockGetAuthenticatedUserFromRequest.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'Employee',
    } as never);

    const response = await callGet(
      createRequest('http://localhost/api/v1/search?q=lap')
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.assets).toEqual([]);
    expect(body.users).toEqual([]);
    expect(body.reports).toEqual([]);
  });
});
