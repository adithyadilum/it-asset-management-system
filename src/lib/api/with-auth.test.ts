/**
 * @vitest-environment node
 */

import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  allowAnyRole,
  withAuth,
  withMobileAuth,
  withSessionAuth,
} from '@/lib/api/with-auth';
import {
  getAuthenticatedMobileUserFromRequest,
  getAuthenticatedUser,
  getAuthenticatedUserFromRequest,
} from '@/lib/auth/get-authenticated-user';
import { canManageAssets } from '@/lib/auth/roles';
import type { UserRole } from '@/types/auth';

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: vi.fn(),
  getAuthenticatedUserFromRequest: vi.fn(),
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));

const mockRequestUser = vi.mocked(getAuthenticatedUserFromRequest);
const mockMobileUser = vi.mocked(getAuthenticatedMobileUserFromRequest);
const mockSessionUser = vi.mocked(getAuthenticatedUser);

function asUser(role: UserRole) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role,
    isActive: true,
  };
}

const request = {} as NextRequest;

describe('withAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 and never runs the handler when unauthenticated', async () => {
    mockRequestUser.mockResolvedValue(null);
    const handler = vi.fn();

    const response = await withAuth(allowAnyRole, handler)(request, {});

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 and never runs the handler when the predicate fails', async () => {
    mockRequestUser.mockResolvedValue(asUser('Employee'));
    const handler = vi.fn();

    const response = await withAuth(canManageAssets, handler)(request, {});

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes the principal to the handler on success', async () => {
    mockRequestUser.mockResolvedValue(asUser('ITOperator'));
    const handler = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));

    const response = await withAuth(canManageAssets, handler)(request, {});

    expect(response.status).toBe(204);
    expect(handler).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        user: expect.objectContaining({ id: 'user-1' }),
      })
    );
  });

  it('preserves route context such as params', async () => {
    mockRequestUser.mockResolvedValue(asUser('GlobalAdmin'));
    const handler = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const params = Promise.resolve({ id: '42' });

    await withAuth(allowAnyRole, handler)(request, { params });

    expect(handler).toHaveBeenCalledWith(
      request,
      expect.objectContaining({ params })
    );
  });
});

describe('withMobileAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a web session principal', async () => {
    mockMobileUser.mockResolvedValue(null);
    const handler = vi.fn();

    const response = await withMobileAuth(allowAnyRole, handler)(request, {});

    expect(response.status).toBe(401);
    // A cookie-based principal must not satisfy a mobile-only route.
    expect(mockRequestUser).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('enforces the role predicate for mobile principals', async () => {
    mockMobileUser.mockResolvedValue({
      ...asUser('Employee'),
      deviceId: 'device-1',
      jwtId: 'jti-1',
    });

    const response = await withMobileAuth(canManageAssets, vi.fn())(
      request,
      {}
    );

    expect(response.status).toBe(403);
  });
});

describe('withSessionAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a bearer-token principal', async () => {
    mockSessionUser.mockResolvedValue(null);

    const response = await withSessionAuth(allowAnyRole, vi.fn())(request, {});

    expect(response.status).toBe(401);
    expect(mockMobileUser).not.toHaveBeenCalled();
  });

  it('allows a session principal that satisfies the predicate', async () => {
    mockSessionUser.mockResolvedValue(asUser('GlobalAdmin'));
    const handler = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    const response = await withSessionAuth(canManageAssets, handler)(
      request,
      {}
    );

    expect(response.status).toBe(200);
  });
});
