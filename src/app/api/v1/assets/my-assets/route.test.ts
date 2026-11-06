/** @vitest-environment node */
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getAuthenticatedMobileUserFromRequest } from '@/lib/auth/get-authenticated-user';
import { getMobileMyAssets } from '@/lib/data/mobile-my-assets-repo';
import { ServiceUnavailableError } from '@/lib/service-availability';

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));
vi.mock('@/lib/data/mobile-my-assets-repo', () => ({
  getMobileMyAssets: vi.fn(),
}));
const principal = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Nimasha Perera',
  email: 'operator@example.test',
  role: 'ITOperator' as const,
  isActive: true,
  deviceId: 'device-1',
  jwtId: 'token-1',
};
const request = () =>
  new NextRequest(
    'http://localhost/api/v1/assets/my-assets?userId=someone-else'
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue(principal);
  vi.mocked(getMobileMyAssets).mockResolvedValue({ data: [], software: [] });
});
it('scopes both lists to the paired user and prevents response caching', async () => {
  const response = await GET(request(), {});
  expect(getMobileMyAssets).toHaveBeenCalledExactlyOnceWith(principal.id);
  expect(await response.json()).toEqual({ data: [], software: [] });
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('rejects unpaired and unauthorized users before querying assignments', async () => {
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue(null);
  expect((await GET(request(), {})).status).toBe(401);
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue({
    ...principal,
    role: 'Employee',
  });
  expect((await GET(request(), {})).status).toBe(403);
  expect(getMobileMyAssets).not.toHaveBeenCalled();
});
it('returns a recoverable 503 during a database outage', async () => {
  vi.mocked(getMobileMyAssets).mockRejectedValue(new ServiceUnavailableError());
  const response = await GET(request(), {});
  expect(response.status).toBe(503);
  expect(response.headers.get('retry-after')).toBe('5');
  expect((await response.json()).code).toBe('SERVICE_UNAVAILABLE');
});
