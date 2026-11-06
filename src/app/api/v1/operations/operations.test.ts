/** @vitest-environment node */
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as tasks } from './tasks/route';
import { GET as recipients } from './recipients/route';
import { POST as handover } from './handovers/route';
import { POST as action } from './assignments/[id]/route';
import { POST as inspect } from './inspections/route';
import { getAuthenticatedMobileUserFromRequest } from '@/lib/auth/get-authenticated-user';
import {
  getMobileTasks,
  searchMobileRecipients,
  actOnMobileAssignment,
} from '@/lib/data/mobile-operations-repo';
import {
  assignSingleAsset,
  processAssetReturn,
  AssignmentServiceError,
} from '@/lib/data/operations-assignments-repo';
import { ServiceUnavailableError } from '@/lib/service-availability';
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedMobileUserFromRequest: vi.fn(),
}));
vi.mock('@/lib/api/with-rate-limit', () => ({
  withRateLimit: (_bucket: string, handler: unknown) => handler,
}));
vi.mock('@/lib/data/mobile-operations-repo', () => ({
  getMobileTasks: vi.fn(),
  searchMobileRecipients: vi.fn(),
  actOnMobileAssignment: vi.fn(),
}));
vi.mock('@/lib/data/operations-assignments-repo', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/data/operations-assignments-repo')
  >()),
  assignSingleAsset: vi.fn(),
  processAssetReturn: vi.fn(),
}));
vi.mock('@/lib/webhooks/dispatcher', () => ({ dispatchWebhookEvent: vi.fn() }));
vi.mock('@/lib/notifications/dispatcher', () => ({ dispatchAlert: vi.fn() }));
const id = '123e4567-e89b-12d3-a456-426614174000',
  revision = '2026-11-06T02:00:00.000Z';
const principal = {
  id,
  email: 'operator@tiqri.test',
  name: 'Nimasha Perera',
  role: 'ITOperator' as const,
  isActive: true,
  deviceId: id,
  jwtId: 'test-device',
};
const request = (body?: unknown, path = '/api/v1/operations/tasks') =>
  new NextRequest(
    `http://localhost${path}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        }
  );
const callAction = (body: unknown, id = '4') =>
  action(request(body), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue(principal);
  vi.mocked(assignSingleAsset).mockResolvedValue({
    assignedAssetIds: [id],
    assignedCount: 1,
    assignments: [{ assignmentId: 4, assetId: id }],
  });
  vi.mocked(actOnMobileAssignment).mockResolvedValue({
    assetId: id,
    assignmentId: 4,
    userId: id,
  });
  vi.mocked(getMobileTasks).mockResolvedValue({
    data: [],
    counts: {
      handovers: 0,
      returns: 0,
      inspections: 0,
      maintenance: 0,
      renewals: 0,
      warranties: 0,
      disposals: 0,
    },
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
});
it('rejects requests without mobile credentials before reading or mutating', async () => {
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue(null);
  expect((await tasks(request(), {})).status).toBe(401);
  expect((await recipients(request(), {})).status).toBe(401);
  expect((await handover(request({}), {})).status).toBe(401);
  expect((await callAction({})).status).toBe(401);
  expect((await inspect(request({}), {})).status).toBe(401);
  expect(assignSingleAsset).not.toHaveBeenCalled();
  expect(getMobileTasks).not.toHaveBeenCalled();
});
it.each(['Employee', 'FinancialAuditor'] as const)(
  'rejects %s principals even with a mobile token',
  async (role) => {
    vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue({
      ...principal,
      role,
    });
    expect((await tasks(request(), {})).status).toBe(403);
    expect((await handover(request({}), {})).status).toBe(403);
    expect((await inspect(request({}), {})).status).toBe(403);
    expect(assignSingleAsset).not.toHaveBeenCalled();
  }
);
it('scopes disposal tasks to GlobalAdmin and returns uncached live results', async () => {
  const response = await tasks(request(), {});
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(getMobileTasks).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, pageSize: 20 }),
    false
  );
  vi.mocked(getAuthenticatedMobileUserFromRequest).mockResolvedValue({
    ...principal,
    role: 'GlobalAdmin',
  });
  await tasks(request(), {});
  expect(getMobileTasks).toHaveBeenLastCalledWith(expect.anything(), true);
});
it.each(['?pageSize=51', '?kind=unknown', '?page=0'])(
  'rejects invalid task queries %s',
  async (query) => {
    expect(
      (await tasks(request(undefined, `/api/v1/operations/tasks${query}`), {}))
        .status
    ).toBe(400);
    expect(getMobileTasks).not.toHaveBeenCalled();
  }
);
it('uses the shared assignment command with atomic availability and revision guards', async () => {
  const response = await handover(
    request({
      assetId: id,
      expectedUpdatedAt: revision,
      assignmentType: 'user',
      targetId: id,
    }),
    {}
  );
  expect(response.status).toBe(201);
  expect(assignSingleAsset).toHaveBeenCalledWith(
    expect.objectContaining({ assetId: id, targetId: id }),
    id,
    expect.objectContaining({
      requireAvailable: true,
      expectedUpdatedAt: revision,
      afterCommit: expect.any(Function),
    })
  );
  expect(await response.json()).toMatchObject({
    success: true,
    assignmentId: 4,
  });
});
it('rejects recipient mismatches, invalid working conditions and forged assignment identifiers', async () => {
  expect(
    (
      await handover(
        request({
          assetId: id,
          expectedUpdatedAt: revision,
          assignmentType: 'user',
          targetId: 2,
        }),
        {}
      )
    ).status
  ).toBe(400);
  expect(
    (
      await inspect(
        request({
          assetId: id,
          expectedUpdatedAt: revision,
          condition: 'Fake',
          physicalCondition: 'Fair',
        }),
        {}
      )
    ).status
  ).toBe(400);
  expect((await callAction({}, 'not-a-number')).status).toBe(400);
  expect(assignSingleAsset).not.toHaveBeenCalled();
  expect(processAssetReturn).not.toHaveBeenCalled();
});
it('preserves guarded assignment identifiers and actor identity', async () => {
  const response = await callAction({
    assetId: id,
    expectedUpdatedAt: revision,
    action: 'receive',
  });
  expect(response.status).toBe(200);
  expect(actOnMobileAssignment).toHaveBeenCalledWith(
    {
      assetId: id,
      assignmentId: 4,
      expectedUpdatedAt: revision,
      action: 'receive',
    },
    id
  );
});
it('passes inspection data to the existing return command without replaying it', async () => {
  const response = await inspect(
    request({
      assetId: id,
      expectedUpdatedAt: revision,
      condition: 'Needs Repair',
      physicalCondition: 'Damaged',
      notes: ' Screen flickers ',
    }),
    {}
  );
  expect(response.status).toBe(200);
  expect(processAssetReturn).toHaveBeenCalledWith(
    {
      assetId: id,
      condition: 'Needs Repair',
      physicalCondition: 'Damaged',
      notes: 'Screen flickers',
    },
    id,
    { expectedUpdatedAt: revision }
  );
});
it('reports stale conflicts and sanitizes unavailable writes', async () => {
  vi.mocked(actOnMobileAssignment).mockRejectedValueOnce(
    new AssignmentServiceError('Refresh the asset.', 409, 'STALE_ASSET')
  );
  expect(
    (
      await callAction({
        assetId: id,
        expectedUpdatedAt: revision,
        action: 'receive',
      })
    ).status
  ).toBe(409);
  vi.mocked(assignSingleAsset).mockRejectedValueOnce(
    new ServiceUnavailableError()
  );
  const response = await handover(
    request({
      assetId: id,
      expectedUpdatedAt: revision,
      assignmentType: 'user',
      targetId: id,
    }),
    {}
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('INSERT');
  expect(assignSingleAsset).toHaveBeenCalledTimes(1);
});
