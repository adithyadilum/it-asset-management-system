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

const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@upstash/redis', () => {
  return {
    Redis: class {
      get = (key: string) => mockRedisGet(key);
      del = (key: string) => mockRedisDel(key);
      set = (key: string, value: unknown, options?: unknown) => mockRedisSet(key, value, options);
    },
  };
});

const mockInsertValues = vi.fn().mockResolvedValue({});
vi.mock('@/db', () => ({
  db: {
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

  const mockUser = {
    id: 'user-123',
    role: 'Employee',
    email: 'test@tiqri.com',
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
    mockRedisGet.mockResolvedValue(null);

    const req = createRequest({
      token: 'invalid-token',
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
    mockRedisGet.mockResolvedValue(JSON.stringify(mockUser));

    const req = createRequest({
      token: 'valid-token-123',
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
    expect(mockRedisGet).toHaveBeenCalledWith('qr_link:valid-token-123');
    expect(mockRedisDel).toHaveBeenCalledWith('qr_link:valid-token-123');
    expect(mockRedisSet).toHaveBeenCalledWith('qr_claimed:valid-token-123', '1', { ex: 120 });

    // Verify DB call
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
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
    mockRedisGet.mockResolvedValue(JSON.stringify(mockUser));

    const req = createRequest({
      linkToken: 'legacy-token-456',
      deviceName: 'Pixel 8 Pro',
      deviceOs: 'Android 14',
      deviceModel: 'Pixel8Pro',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');

    // Verify Redis calls
    expect(mockRedisGet).toHaveBeenCalledWith('qr_link:legacy-token-456');
    expect(mockRedisDel).toHaveBeenCalledWith('qr_link:legacy-token-456');
    expect(mockRedisSet).toHaveBeenCalledWith('qr_claimed:legacy-token-456', '1', { ex: 120 });

    // Verify cache revalidation
    expect(revalidatePath).toHaveBeenCalledWith('/settings/devices');
    expect(revalidatePath).toHaveBeenCalledWith('/(app-shell)/(management)/settings/devices');
  });
});
