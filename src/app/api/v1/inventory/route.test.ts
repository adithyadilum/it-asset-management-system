/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { GET as profile } from './[assetId]/route';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import {
  getMobileInventory,
  getMobileAssetProfile,
} from '@/lib/data/mobile-inventory-repo';

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUserFromRequest: vi.fn(),
}));
vi.mock('@/lib/api/with-rate-limit', () => ({
  withRateLimit: (_bucket: string, handler: unknown) => handler,
}));
vi.mock('@/lib/data/mobile-inventory-repo', () => ({
  getMobileInventory: vi.fn(),
  getMobileAssetProfile: vi.fn(),
}));

const id = '123e4567-e89b-12d3-a456-426614174000';
const request = (query = '') =>
  new NextRequest(`http://localhost/api/v1/inventory${query}`);
const callProfile = (assetId = id) =>
  profile(request(), { params: Promise.resolve({ assetId }) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue({
    id,
    role: 'ITOperator',
    isActive: true,
    email: 'it@example.test',
    name: 'IT Operator',
  });
  vi.mocked(getMobileInventory).mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    filters: { categories: [], locations: [], statuses: [] },
  });
  vi.mocked(getMobileAssetProfile).mockResolvedValue(null);
});
describe('inventory access and query contract', () => {
  it('rejects anonymous requests and employees before reading inventory or profiles', async () => {
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue(null);
    expect((await GET(request(), {})).status).toBe(401);
    expect((await callProfile()).status).toBe(401);
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue({
      id,
      role: 'Employee',
      isActive: true,
      email: 'employee@example.test',
      name: 'Employee',
    });
    expect((await GET(request(), {})).status).toBe(403);
    expect((await callProfile()).status).toBe(403);
    expect(getMobileInventory).not.toHaveBeenCalled();
    expect(getMobileAssetProfile).not.toHaveBeenCalled();
  });
  it('returns uncached results with bounded defaults', async () => {
    const response = await GET(request(), {});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getMobileInventory).toHaveBeenCalledWith({
      query: '',
      page: 1,
      pageSize: 20,
    });
  });
  it('passes validated combined filters and search to the repository', async () => {
    const response = await GET(
      request(
        '?query=Dell%20Latitude&pillar=Hardware&categoryId=2&locationId=3&status=Assigned&page=2&pageSize=10'
      ),
      {}
    );
    expect(response.status).toBe(200);
    expect(getMobileInventory).toHaveBeenCalledWith({
      query: 'Dell Latitude',
      pillar: 'Hardware',
      categoryId: 2,
      locationId: 3,
      status: 'Assigned',
      page: 2,
      pageSize: 10,
    });
  });
  it.each([
    '?page=0',
    '?pageSize=51',
    '?page=1.5',
    '?categoryId=-1',
    '?pillar=Unknown',
    `?query=${'a'.repeat(121)}`,
  ])('rejects invalid or unbounded filters: %s', async (query) => {
    expect((await GET(request(query), {})).status).toBe(400);
    expect(getMobileInventory).not.toHaveBeenCalled();
  });
  it('validates profile identifiers and distinguishes missing assets', async () => {
    expect((await callProfile('not-an-id')).status).toBe(400);
    expect(getMobileAssetProfile).not.toHaveBeenCalled();
    expect((await callProfile()).status).toBe(404);
    expect(getMobileAssetProfile).toHaveBeenCalledWith(id);
  });
});
