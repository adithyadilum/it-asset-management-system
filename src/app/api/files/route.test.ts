/**
 * @vitest-environment node
 */

import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/files/route';
import { get } from '@vercel/blob';
import { resolveDocumentKind } from '@/lib/data/document-access';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import type { UserRole } from '@/types/auth';

vi.mock('@vercel/blob', () => ({ get: vi.fn() }));

vi.mock('@/actions/auth', () => ({ getAuthenticatedUser: vi.fn() }));

vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));

// Only the database lookup is mocked; the real policy in
// `@/lib/auth/document-policy` is exercised as written.
vi.mock('@/lib/data/document-access', () => ({
  resolveDocumentKind: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  serverEnv: { PRIVATE_BLOB_READ_WRITE_TOKEN: 'test-token' },
}));

const mockGetUser = vi.mocked(getAuthenticatedUserFromRequest);
const mockResolveKind = vi.mocked(resolveDocumentKind);
const mockBlobGet = vi.mocked(get);

function createRequest(pathname: string): NextRequest {
  return {
    nextUrl: new URL(
      `http://localhost/api/files?pathname=${encodeURIComponent(pathname)}`
    ),
    headers: new Headers(),
  } as unknown as NextRequest;
}

/** The route is wrapped in `withAuth`, so it receives (request, ctx). */
const callGet = (req: NextRequest) => GET(req, {});

function asUser(role: UserRole) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    name: 'Test User',
    role,
    isActive: true,
  };
}

describe('GET /api/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlobGet.mockResolvedValue({
      statusCode: 200,
      stream: 'stream',
      blob: { etag: 'etag-1', contentType: 'application/pdf' },
    } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);

    const response = await callGet(createRequest('invoices/abc.pdf'));

    expect(response.status).toBe(401);
    expect(mockResolveKind).not.toHaveBeenCalled();
  });

  it('rejects pathnames outside the sensitive prefixes', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));

    const response = await callGet(createRequest('models/logo.png'));

    expect(response.status).toBe(400);
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it('rejects traversal attempts', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));

    const response = await callGet(createRequest('invoices/../secrets.pdf'));

    expect(response.status).toBe(400);
  });

  it('returns 404 when no record references the blob', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));
    mockResolveKind.mockResolvedValue(null);

    const response = await callGet(createRequest('invoices/orphan.pdf'));

    expect(response.status).toBe(404);
    // The blob must never be fetched for an unreferenced pathname.
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it('denies Employee access to an invoice', async () => {
    mockGetUser.mockResolvedValue(asUser('Employee'));
    mockResolveKind.mockResolvedValue('invoice');

    const response = await callGet(createRequest('invoices/abc.pdf'));

    expect(response.status).toBe(403);
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it('denies Employee access to a disposal certificate', async () => {
    mockGetUser.mockResolvedValue(asUser('Employee'));
    mockResolveKind.mockResolvedValue('disposal-certificate');

    const response = await callGet(createRequest('disposals/cert.pdf'));

    expect(response.status).toBe(403);
  });

  it('allows ITOperator to read an invoice, preserving the asset panel flow', async () => {
    mockGetUser.mockResolvedValue(asUser('ITOperator'));
    mockResolveKind.mockResolvedValue('invoice');

    const response = await callGet(createRequest('invoices/abc.pdf'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('abc.pdf');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('allows FinancialAuditor to read a disposal certificate', async () => {
    mockGetUser.mockResolvedValue(asUser('FinancialAuditor'));
    mockResolveKind.mockResolvedValue('disposal-certificate');

    const response = await callGet(createRequest('disposals/cert.pdf'));

    expect(response.status).toBe(200);
  });

  it('allows ITOperator to read a disposal certificate it uploaded', async () => {
    mockGetUser.mockResolvedValue(asUser('ITOperator'));
    mockResolveKind.mockResolvedValue('disposal-certificate');

    const response = await callGet(createRequest('disposals/cert.pdf'));

    expect(response.status).toBe(200);
  });

  it('passes through a 304 without streaming the body', async () => {
    mockGetUser.mockResolvedValue(asUser('GlobalAdmin'));
    mockResolveKind.mockResolvedValue('asset-document');
    mockBlobGet.mockResolvedValue({
      statusCode: 304,
      blob: { etag: 'etag-1' },
    } as never);

    const response = await callGet(createRequest('documents/spec.pdf'));

    expect(response.status).toBe(304);
    expect(response.headers.get('ETag')).toBe('etag-1');
  });
});
