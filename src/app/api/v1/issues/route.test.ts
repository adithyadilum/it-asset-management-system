/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import {
  recordMobileIssue,
  MobileIssueError,
} from '@/lib/data/mobile-issues-repo';
import type { UserRole } from '@/types/auth';
vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));
vi.mock('@/actions/auth', () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock('@/lib/api/with-rate-limit', () => ({
  withRateLimit: (_bucket: string, handler: unknown) => handler,
}));
vi.mock('@/lib/data/mobile-issues-repo', () => ({
  recordMobileIssue: vi.fn(),
  MobileIssueError: class extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message);
    }
  },
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
const assetId = '123e4567-e89b-12d3-a456-426614174000';
const user = (role: UserRole) => ({
  id: assetId,
  name: 'Operator',
  email: 'operator@example.com',
  role,
  isActive: true,
});
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/v1/issues', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
describe('mobile issue boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue(
      user('ITOperator')
    );
    vi.mocked(recordMobileIssue).mockResolvedValue({
      success: true,
      ticketId: 4,
      message: 'Recorded',
    });
  });
  it.each(['Employee', 'FinancialAuditor'] as const)(
    'denies %s before reading or changing an asset',
    async (role) => {
      vi.mocked(getAuthenticatedUserFromRequest).mockResolvedValue(user(role));
      expect(
        (await POST(request({ assetId, issueNote: 'Fault' }), {})).status
      ).toBe(403);
      expect(recordMobileIssue).not.toHaveBeenCalled();
    }
  );
  it.each([
    { assetId: 'bad', issueNote: 'Fault' },
    { assetId, issueNote: '   ' },
    { assetId, issueNote: 'a'.repeat(1001) },
  ])('rejects invalid reports', async (body) => {
    expect((await POST(request(body), {})).status).toBe(400);
    expect(recordMobileIssue).not.toHaveBeenCalled();
  });
  it('accepts an operator report and trims the description', async () => {
    expect(
      (await POST(request({ assetId, issueNote: '  Screen flickers  ' }), {}))
        .status
    ).toBe(200);
    expect(recordMobileIssue).toHaveBeenCalledWith(
      { assetId, issueNote: 'Screen flickers' },
      assetId
    );
  });
  it('returns a domain conflict without an internal error payload', async () => {
    vi.mocked(recordMobileIssue).mockRejectedValue(
      new MobileIssueError('An open ticket exists.', 409)
    );
    const response = await POST(request({ assetId, issueNote: 'Fault' }), {});
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'An open ticket exists.' });
  });
});
