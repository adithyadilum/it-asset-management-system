/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthenticatedMobileUserFromRequest } from './get-authenticated-user';
import { ServiceUnavailableError } from '@/lib/service-availability';
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
}));
vi.mock('jose', () => ({ jwtVerify: mocks.verify }));
vi.mock('@/actions/auth', () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  },
}));
describe('mobile authentication availability', () => {
  const req = new Request('http://localhost/api/v1/profile', {
    headers: { Authorization: 'Bearer test-token' },
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.verify.mockResolvedValue({
      payload: { id: 'user', jti: 'device-jti' },
    });
    mocks.select.mockImplementation(() => ({
      from: () => ({ where: () => ({ limit: mocks.limit }) }),
    }));
  });
  it('distinguishes database outages from revoked device credentials', async () => {
    mocks.limit.mockRejectedValue(
      new Error('Connection terminated unexpectedly')
    );
    await expect(
      getAuthenticatedMobileUserFromRequest(req)
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(mocks.limit).toHaveBeenCalledTimes(2);
  });
  it('continues to reject invalid signatures without querying the database', async () => {
    mocks.verify.mockRejectedValueOnce(new Error('Invalid signature'));
    expect(await getAuthenticatedMobileUserFromRequest(req)).toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it('returns no principal for a revoked or absent device', async () => {
    mocks.limit.mockResolvedValueOnce([]);
    expect(await getAuthenticatedMobileUserFromRequest(req)).toBeNull();
  });
  it('recovers a stale connection and rechecks the current user permissions', async () => {
    mocks.limit
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValueOnce([{ id: 'device', userId: 'user' }])
      .mockResolvedValueOnce([
        {
          id: 'user',
          name: 'IT operator',
          email: 'it@example.com',
          role: 'ITOperator',
          isActive: true,
        },
      ]);
    expect(await getAuthenticatedMobileUserFromRequest(req)).toMatchObject({
      role: 'ITOperator',
      deviceId: 'device',
    });
  });
});
