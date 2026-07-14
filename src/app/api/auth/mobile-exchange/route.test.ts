/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';

vi.hoisted(() => {
  process.env.MOBILE_JWT_SECRET = 'super-secret-key-that-is-at-least-32-bytes-long';
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
});

const mockRedisGetDel = vi.fn();
const mockRedisSet = vi.fn();
const mockSelectLimit = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@upstash/redis', () => {
  return {
    Redis: class {
      getdel = (key: string) => mockRedisGetDel(key);
      set = (key: string, value: unknown, options?: unknown) => mockRedisSet(key, value, options);
    },
  };
});

const mockInsertValues = vi.fn().mockResolvedValue({});
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: mockSelectLimit }),
      }),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: mockInsertValues,
    })),
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn().mockResolvedValue({}),
}));

import { POST } from './route';

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/mobile-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/mobile-exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // NOTE: role must be 'GlobalAdmin' — non-admin tokens are rejected by the RBAC backstop.
  const mockUser = {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'GlobalAdmin',
    email: 'admin@tiqri.com',
    status: 'pending',
  };

  it('returns 400 when both token and linkToken are missing', async () => {
    const req = createRequest({
      deviceName: 'iPhone 15 Pro',
      deviceOs: 'iOS 17.5.1',
      deviceModel: 'iPhone16,2',
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Missing token' });
  });

  it('returns 401 when the token is invalid or expired in Redis', async () => {
    mockRedisGetDel.mockResolvedValue(null);

    const req = createRequest({
      token: '0'.repeat(64),
      deviceName: 'iPhone 15 Pro',
      deviceOs: 'iOS 17.5.1',
      deviceModel: 'iPhone16,2',
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'QR Code expired or invalid' });
  });

  it('successfully exchanges a valid new "token" format and returns JWT token', async () => {
    mockRedisGetDel.mockResolvedValue(JSON.stringify(mockUser));
    mockSelectLimit.mockResolvedValue([{ ...mockUser, isActive: true }]);

    const req = createRequest({
      token: 'a'.repeat(64),
      deviceName: 'iPhone 15 Pro',
      deviceOs: 'iOS 17.5.1',
      deviceModel: 'iPhone16,2',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(typeof body.accessToken).toBe('string');

    // Verify Redis calls
    expect(mockRedisGetDel).toHaveBeenCalledWith(`qr_link:${'a'.repeat(64)}`);
    expect(mockRedisSet).toHaveBeenCalledWith(`qr_claimed:${'a'.repeat(64)}`, '1', { ex: 120 });

    // Verify DB call
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        deviceName: 'iPhone 15 Pro',
        deviceOs: 'iOS 17.5.1',
        deviceModel: 'iPhone16,2',
      })
    );

    // Verify cache revalidation
    expect(revalidatePath).toHaveBeenCalledWith('/settings/devices');
    expect(revalidatePath).toHaveBeenCalledWith('/(app-shell)/(management)/settings/devices');
  });

  it('successfully exchanges a valid legacy "linkToken" format and returns JWT token', async () => {
    mockRedisGetDel.mockResolvedValue(JSON.stringify(mockUser));
    mockSelectLimit.mockResolvedValue([{ ...mockUser, isActive: true }]);

    const req = createRequest({
      linkToken: 'b'.repeat(64),
      deviceName: 'Pixel 8 Pro',
      deviceOs: 'Android 14',
      deviceModel: 'Pixel8Pro',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');

    // Verify Redis calls
    expect(mockRedisGetDel).toHaveBeenCalledWith(`qr_link:${'b'.repeat(64)}`);
    expect(mockRedisSet).toHaveBeenCalledWith(`qr_claimed:${'b'.repeat(64)}`, '1', { ex: 120 });

    // Verify cache revalidation
    expect(revalidatePath).toHaveBeenCalledWith('/settings/devices');
    expect(revalidatePath).toHaveBeenCalledWith('/(app-shell)/(management)/settings/devices');
  });
});

describe('POST /api/auth/mobile-exchange — RBAC backstop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when the QR token was minted by an Employee', async () => {
    const employee = {
      id: '22222222-2222-4222-8222-222222222222',
      role: 'Employee',
      email: 'employee@tiqri.com',
      status: 'pending',
    };
    mockRedisGetDel.mockResolvedValue(JSON.stringify(employee));
    mockSelectLimit.mockResolvedValue([{ ...employee, isActive: true }]);

    const req = createRequest({
      token: 'c'.repeat(64),
      deviceName: 'iPhone 15',
      deviceOs: 'iOS 17',
      deviceModel: 'iPhone15,2',
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Forbidden/i);

    // Ensure no device was persisted in the database
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns 403 when the QR token was minted by an ITOperator', async () => {
    const operator = {
      id: '33333333-3333-4333-8333-333333333333',
      role: 'ITOperator',
      email: 'operator@tiqri.com',
      status: 'pending',
    };
    mockRedisGetDel.mockResolvedValue(JSON.stringify(operator));
    mockSelectLimit.mockResolvedValue([{ ...operator, isActive: true }]);

    const req = createRequest({
      token: 'd'.repeat(64),
      deviceName: 'Pixel 8',
      deviceOs: 'Android 14',
      deviceModel: 'Pixel8',
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Forbidden/i);

    // Ensure no device was persisted in the database
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});
