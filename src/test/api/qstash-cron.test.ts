/**
 * @vitest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchAlert } from '@/lib/notifications/dispatcher';
import { POST as cronHandler } from '@/app/api/qstash/cron/route';

// Mock Upstash QStash client and receiver
const mockPublishJSON = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
const mockVerify = vi.fn().mockResolvedValue(true);

vi.mock('@upstash/qstash', () => {
  return {
    Client: class {
      publishJSON = mockPublishJSON;
    },
    Receiver: class {
      verify = mockVerify;
    },
  };
});

// Setup a sequential queue for database query results
let mockQueriesQueue: any[] = [];

const createQueryBuilderMock = () => {
  const builder: any = {
    from: () => builder,
    innerJoin: () => builder,
    leftJoin: () => builder,
    where: () => builder,
    limit: () => builder,
    offset: () => builder,
    orderBy: () => builder,
    then: (resolve: any) => {
      const nextVal = mockQueriesQueue.shift() ?? [];
      resolve(nextVal);
    },
  };
  return builder;
};

const createInsertBuilderMock = () => {
  const builder: any = {
    values: () => builder,
    returning: () => builder,
    then: (resolve: any) => {
      const nextVal = mockQueriesQueue.shift() ?? [];
      resolve(nextVal);
    },
  };
  return builder;
};

const createUpdateBuilderMock = () => {
  const builder: any = {
    set: () => builder,
    where: () => builder,
    returning: () => builder,
    then: (resolve: any) => {
      const nextVal = mockQueriesQueue.shift() ?? [];
      resolve(nextVal);
    },
  };
  return builder;
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => createQueryBuilderMock()),
    insert: vi.fn(() => createInsertBuilderMock()),
    update: vi.fn(() => createUpdateBuilderMock()),
  },
}));

// Mock the internal dispatcher to avoid real background queues
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchAlert: vi.fn().mockResolvedValue({ success: true }),
}));

function createCronRequest(headers: Record<string, string> = {}, body = ''): NextRequest {
  return new NextRequest('http://localhost:3000/api/qstash/cron', {
    method: 'POST',
    headers: new Headers(headers),
    body,
  });
}

describe('QStash Scheduled CRON Engine API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueriesQueue = [];
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-sig-key';
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-sig-key';
    process.env.QSTASH_TOKEN = 'qstash-token';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('POST /api/qstash/cron — Signature Verification', () => {
    it('returns 500 if QStash signing keys are missing in the environment', async () => {
      delete process.env.QSTASH_CURRENT_SIGNING_KEY;
      delete process.env.QSTASH_NEXT_SIGNING_KEY;

      const req = createCronRequest({ 'Upstash-Signature': 'some-signature' });
      const res = await cronHandler(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Signing keys misconfigured');
    });

    it('returns 401 if Upstash-Signature header is missing', async () => {
      const req = createCronRequest();
      const res = await cronHandler(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Missing Upstash signature');
    });

    it('returns 401 if Upstash signature is invalid', async () => {
      mockVerify.mockResolvedValue(false);

      const req = createCronRequest({ 'Upstash-Signature': 'invalid-signature' });
      const res = await cronHandler(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Invalid Upstash signature');
    });
  });

  describe('Checking Jobs Logic & Deduplication', () => {
    beforeEach(() => {
      mockVerify.mockResolvedValue(true);
    });

    it('processes checks successfully when signature is valid', async () => {
      // Configure database query sequence:
      mockQueriesQueue = [
        // 1. runWarrantyExpiryCheck - Rule query (enabled, 30 days)
        [{ ruleKey: 'WARRANTY_EXPIRY_WARNING', isEnabled: true, thresholdDays: 30 }],
        // 2. runWarrantyExpiryCheck - Expiring assets query (returns 1 asset)
        [{ id: 'asset-1', assetTag: 'AST-001', name: 'MacBook Pro 16', warrantyExpiry: '2026-06-24' }],
        // 3. runWarrantyExpiryCheck - Active admins list
        [{ id: 'admin-123' }],
        // 4. runWarrantyExpiryCheck - Deduplication query (no existing notification)
        [],

        // 5. runOverdueReturnCheck - Rule query (enabled)
        [{ ruleKey: 'RETURN_OVERDUE', isEnabled: true }],
        // 6. runOverdueReturnCheck - Overdue assignments (returns 1 assignment)
        [{ assignmentId: 10, assetId: 'asset-2', assignedById: 'admin-456', expectedReturnDate: '2026-05-20', assetTag: 'AST-002', assetName: 'iPad Air' }],
        // 7. runOverdueReturnCheck - Deduplication query (no existing notification)
        [],

        // 8. runOverdueRepairCheck - Rule query (enabled)
        [{ ruleKey: 'RETURN_OVERDUE', isEnabled: true }],
        // 9. runOverdueRepairCheck - Overdue maintenance tickets (returns 1 ticket)
        [{ ticketId: 20, assetId: 'asset-3', dispatchedById: 'admin-789', estimatedReturnDate: '2026-05-18', assetTag: 'AST-003', assetName: 'Dell Monitor' }],
        // 10. runOverdueRepairCheck - Deduplication query (no existing notification)
        [],
      ];

      const req = createCronRequest({ 'Upstash-Signature': 'valid-sig' });
      const res = await cronHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify that dispatchAlert was called for expiring warranty, overdue return, and overdue repair
      expect(dispatchAlert).toHaveBeenCalledTimes(3);
      expect(dispatchAlert).toHaveBeenNthCalledWith(1, expect.objectContaining({
        eventType: 'WARRANTY_EXPIRY',
        userId: 'admin-123',
        title: 'Warranty Expiry Warning',
      }));
      expect(dispatchAlert).toHaveBeenNthCalledWith(2, expect.objectContaining({
        eventType: 'RETURN_OVERDUE',
        userId: 'admin-456',
        title: 'Asset Return Overdue Alert',
      }));
      expect(dispatchAlert).toHaveBeenNthCalledWith(3, expect.objectContaining({
        eventType: 'RETURN_OVERDUE',
        userId: 'admin-789',
        title: 'Overdue Repair Alert',
      }));
    });

    it('does not dispatch if alerts are already sent (deduplication)', async () => {
      // Configure database query sequence:
      mockQueriesQueue = [
        // 1. runWarrantyExpiryCheck - Rule query
        [{ ruleKey: 'WARRANTY_EXPIRY_WARNING', isEnabled: true, thresholdDays: 30 }],
        // 2. runWarrantyExpiryCheck - Expiring assets
        [{ id: 'asset-1', assetTag: 'AST-001', name: 'MacBook Pro 16', warrantyExpiry: '2026-06-24' }],
        // 3. runWarrantyExpiryCheck - Admins list
        [{ id: 'admin-123' }],
        // 4. runWarrantyExpiryCheck - Deduplication query: returns an existing notification row!
        [{ id: 'notif-999' }],

        // 5. runOverdueReturnCheck - Rule query
        [{ ruleKey: 'RETURN_OVERDUE', isEnabled: true }],
        // 6. runOverdueReturnCheck - Overdue assignments
        [{ assignmentId: 10, assetId: 'asset-2', assignedById: 'admin-456', expectedReturnDate: '2026-05-20', assetTag: 'AST-002', assetName: 'iPad Air' }],
        // 7. runOverdueReturnCheck - Deduplication query: returns an existing notification row!
        [{ id: 'notif-888' }],

        // 8. runOverdueRepairCheck - Rule query
        [{ ruleKey: 'RETURN_OVERDUE', isEnabled: true }],
        // 9. runOverdueRepairCheck - Overdue maintenance tickets
        [{ ticketId: 20, assetId: 'asset-3', dispatchedById: 'admin-789', estimatedReturnDate: '2026-05-18', assetTag: 'AST-003', assetName: 'Dell Monitor' }],
        // 10. runOverdueRepairCheck - Deduplication query: returns an existing notification row!
        [{ id: 'notif-777' }],
      ];

      const req = createCronRequest({ 'Upstash-Signature': 'valid-sig' });
      const res = await cronHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // dispatchAlert should NOT have been called because all are duplicates
      expect(dispatchAlert).not.toHaveBeenCalled();
    });
  });
});
