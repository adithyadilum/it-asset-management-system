/** @vitest-environment node */
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { GET as profile } from '../../v1/profile/route';
import {
  getAuthenticatedUser,
  getAuthenticatedMobileUserFromRequest,
} from '@/lib/auth/get-authenticated-user';
import { db } from '@/db';
import { getPusherServerClient } from '@/lib/pusher-server';

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: vi.fn(),
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));
vi.mock('@/db', () => ({ db: { select: vi.fn(), update: vi.fn() } }));
vi.mock('@/lib/pusher-server', () => ({ getPusherServerClient: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAuditAction: vi.fn() }));
const owner = {
  id: 'owner',
  name: 'Nimasha Perera',
  email: 'it@example.test',
  role: 'ITOperator' as const,
  isActive: true,
};
const device = {
  id: 'device-1',
  userId: owner.id,
  jwtId: 'a'.repeat(32),
  deviceName: 'Samsung Galaxy S24',
  deviceOs: 'Android',
  deviceModel: 'Galaxy S24',
};
const trigger = vi.fn(),
  updateWhere = vi.fn(),
  updateSet = vi.fn();
const request = () =>
  new NextRequest('http://localhost/api/auth/unlink-device', {
    method: 'POST',
    body: JSON.stringify({ deviceId: device.id }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthenticatedUser).mockResolvedValue(owner);
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue({
    ...owner,
    deviceId: device.id,
    jwtId: device.jwtId,
  });
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([device]),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  vi.mocked(db.select).mockReturnValue(query as never);
  updateWhere.mockResolvedValue(undefined);
  updateSet.mockReturnValue({ where: updateWhere });
  vi.mocked(db.update).mockReturnValue({ set: updateSet } as never);
  trigger.mockResolvedValue(undefined);
  vi.mocked(getPusherServerClient).mockReturnValue({ trigger } as never);
});
it('persists revocation before publishing to the exact private device channel', async () => {
  let release: () => void = () => {};
  updateWhere.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  const pending = POST(request(), {});
  for (let n = 0; n < 12; n++) await Promise.resolve();
  expect(updateSet).toHaveBeenCalledWith({ isRevoked: true });
  expect(trigger).not.toHaveBeenCalled();
  release();
  expect((await pending).status).toBe(200);
  expect(trigger).toHaveBeenCalledExactlyOnceWith(
    `private-device-${device.jwtId}`,
    'device_unlinked',
    expect.any(Object)
  );
});
it('denies unowned devices without revoking or broadcasting', async () => {
  vi.mocked(getAuthenticatedUser).mockResolvedValue({
    ...owner,
    id: 'another-operator',
  });
  expect((await POST(request(), {})).status).toBe(403);
  expect(db.update).not.toHaveBeenCalled();
  expect(trigger).not.toHaveBeenCalled();
});
it('allows an administrator to revoke another user device', async () => {
  vi.mocked(getAuthenticatedUser).mockResolvedValue({
    ...owner,
    id: 'administrator',
    role: 'GlobalAdmin',
  });
  expect((await POST(request(), {})).status).toBe(200);
});
it('keeps revocation successful when push delivery is unavailable', async () => {
  const warning = vi.spyOn(console, 'error').mockImplementation(() => {});
  trigger.mockRejectedValueOnce(new Error('Push unavailable'));
  expect((await POST(request(), {})).status).toBe(200);
  expect(updateSet).toHaveBeenCalledWith({ isRevoked: true });
  warning.mockRestore();
});
it('keeps mobile session checks uncached and rejects revoked credentials', async () => {
  const response = await profile(
    new NextRequest('http://localhost/api/v1/profile'),
    {}
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({
    data: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
    },
  });
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue(null);
  expect(
    (await profile(new NextRequest('http://localhost/api/v1/profile'), {}))
      .status
  ).toBe(401);
});
