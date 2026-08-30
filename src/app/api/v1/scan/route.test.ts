/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/scan/route';
import { getAssetDetailsById } from '@/lib/data/asset-details-repo';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import type { AssetDetailsData } from '@/lib/data/asset-details-repo';
import type { UserRole } from '@/types/auth';

vi.mock('@/lib/data/asset-details-repo', () => ({
  getAssetDetailsById: vi.fn(),
}));

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));

vi.mock('@/actions/auth', () => ({ getAuthenticatedUser: vi.fn() }));

const mockGetAsset = vi.mocked(getAssetDetailsById);
const mockGetUser = vi.mocked(getAuthenticatedUserFromRequest);

function createRequest(body: unknown): Request {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Request;
}

/** The route is wrapped in `withAuth`, so it receives (request, ctx). */
const callPost = (req: Request) => POST(req as never, {});

function asUser(role: UserRole) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    name: 'Test User',
    role,
    isActive: true,
  };
}

const assetFixture = {
  asset: { id: 'asset-1', assetTag: 'LAP-001' },
  purchase: { id: 7, totalCost: '2400.00', invoiceUrl: '/api/files?x=1' },
  vendor: { id: 3, companyName: 'Acme Supplies' },
  softwareLicense: {
    id: 'lic-1',
    licenseKey: 'ABCD-EFGH-IJKL',
    totalSeats: 5,
  },
} as unknown as AssetDetailsData;

describe('POST /api/v1/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAsset.mockResolvedValue(assetFixture);
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);

    const response = await callPost(createRequest({ assetTag: 'LAP-001' }));

    expect(response.status).toBe(401);
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('returns 403 for Employee principals without registry access', async () => {
    mockGetUser.mockResolvedValue(asUser('Employee'));

    const response = await callPost(createRequest({ assetTag: 'LAP-001' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    // The asset must never be read for a principal that cannot view it.
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('redacts purchase, vendor, and license key for ITOperator', async () => {
    mockGetUser.mockResolvedValue(asUser('ITOperator'));

    const response = await callPost(createRequest({ assetTag: 'LAP-001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.purchase).toBeNull();
    expect(body.data.vendor).toBeNull();
    expect(body.data.softwareLicense.licenseKey).toBeNull();
    // Non-financial detail is still returned.
    expect(body.data.asset.assetTag).toBe('LAP-001');
    expect(body.data.softwareLicense.totalSeats).toBe(5);
  });

  it('returns full financial detail for GlobalAdmin', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));

    const response = await callPost(createRequest({ assetTag: 'LAP-001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.purchase.totalCost).toBe('2400.00');
    expect(body.data.vendor.companyName).toBe('Acme Supplies');
    expect(body.data.softwareLicense.licenseKey).toBe('ABCD-EFGH-IJKL');
  });

  it('returns full financial detail for FinancialAuditor', async () => {
    mockGetUser.mockResolvedValue(asUser('FinancialAuditor'));

    const response = await callPost(createRequest({ assetTag: 'LAP-001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.purchase.totalCost).toBe('2400.00');
  });

  it('resolves an asset tag embedded in a scanned URL', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));

    await callPost(
      createRequest({ assetTag: 'https://app.test/assets/LAP-001/' })
    );

    expect(mockGetAsset).toHaveBeenCalledWith('LAP-001');
  });

  it('returns 400 when no asset tag is supplied', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));

    const response = await callPost(createRequest({}));

    expect(response.status).toBe(400);
  });

  it('returns 404 when the asset does not exist', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));
    mockGetAsset.mockResolvedValue(null);

    const response = await callPost(createRequest({ assetTag: 'NOPE-001' }));

    expect(response.status).toBe(404);
  });
});
