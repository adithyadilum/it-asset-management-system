/**
 * @vitest-environment node
 */

 

process.env.ENCRYPTION_SECRET = 'IUr+UelUGH0oEhuAoI63Uvbcd+7Ra5o7Uo8PU2PaUHE=';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as emailHandler } from '@/app/api/qstash/email/route';
import { POST as teamsHandler } from '@/app/api/qstash/teams/route';
import { encrypt } from '@/lib/crypto';
import { db } from '@/db';
import { notificationLogs } from '@/db/schema';

// Mock Upstash QStash client and receiver
const mockVerify = vi.fn().mockResolvedValue(true);

vi.mock('@upstash/qstash', () => {
  return {
    Receiver: class {
      verify = mockVerify;
    },
  };
});

// Mock Resend SDK
const mockSend = vi.fn().mockResolvedValue({ id: 'email-id-123' });

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

// Mock global fetch for MS Teams webhook requests
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
});
vi.stubGlobal('fetch', mockFetch);

// Setup a sequential database query mock
let mockQueriesQueue: any[] = [];

const createQueryBuilderMock = () => {
  const builder: any = {
    select: () => builder,
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

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => createQueryBuilderMock()),
    insert: vi.fn(() => createInsertBuilderMock()),
    update: vi.fn(() => createQueryBuilderMock()),
  },
}));

function createRequest(
  url: string,
  bodyObj: any,
  signature?: string
): NextRequest {
  const headers = new Headers();
  if (signature) {
    headers.set('Upstash-Signature', signature);
  }
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyObj),
  });
}

describe('External Dispatch Route Handlers (Email & Teams)', () => {
  const encryptedResendKey = encrypt('re_test_key_123456');
  const encryptedTeamsUrl = encrypt(
    'https://outlook.office.com/webhook/test-webhook-url'
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueriesQueue = [];
    vi.useFakeTimers();

    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-sig';
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-sig';
    process.env.ENCRYPTION_SECRET =
      'IUr+UelUGH0oEhuAoI63Uvbcd+7Ra5o7Uo8PU2PaUHE=';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Email Dispatcher Handler — POST /api/qstash/email', () => {
    const payload = {
      eventType: 'WARRANTY_EXPIRY',
      userId: 'user-id-abc',
      title: 'Warranty Approaching Expiry',
      message: 'The asset laptop warranty expires soon.',
      targetUrl: '/assets/d3b07384-d113-4956-a5cc-98124b8d7d92',
    };

    it('returns 401 if QStash signature is invalid', async () => {
      mockVerify.mockResolvedValueOnce(false);
      const req = createRequest(
        'http://localhost:3000/api/qstash/email',
        payload,
        'bad-sig'
      );
      const res = await emailHandler(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid Upstash signature');
    });

    it('successfully fetches recipient user details, decrypts keys, compiles HTML template, and sends email', async () => {
      mockVerify.mockResolvedValueOnce(true);

      // Configure DB responses sequentially:
      mockQueriesQueue = [
        // 1. users query (returns email)
        [{ email: 'employee@tiqri.com' }],
        // 2. integrationSettings lookup (returns encrypted API key)
        [{ id: 1, resendApiKey: encryptedResendKey }],
        // 3. Dynamic asset lookup from targetUrl /assets/asset-id-xyz
        [{ name: 'HP EliteBook 840', assetTag: 'TIQRI-LAP-023' }],
      ];

      mockSend.mockResolvedValueOnce({ id: 'email-id-123' });

      const req = createRequest(
        'http://localhost:3000/api/qstash/email',
        payload,
        'valid-sig'
      );
      const res = await emailHandler(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify Resend send was triggered with the custom template
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'employee@tiqri.com',
          subject: '[TIQRI Assets] Warranty Approaching Expiry',
          html: expect.stringContaining('TIQRI Assets'),
        })
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('HP EliteBook 840'),
        })
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Asset ID : TIQRI-LAP-023'),
        })
      );
    });

    it('implements exponential backoff and logs failure to Dead Letter logs after 5 unsuccessful attempts', async () => {
      mockVerify.mockResolvedValueOnce(true);

      mockQueriesQueue = [
        [{ email: 'employee@tiqri.com' }],
        [{ id: 1, resendApiKey: encryptedResendKey }],
        [], // No asset details found, should default gracefully
        [], // Log DB write mock returning empty
      ];

      // Make Resend mock fail continuously
      mockSend.mockRejectedValue(new Error('SMTP service down'));

      const req = createRequest(
        'http://localhost:3000/api/qstash/email',
        payload,
        'valid-sig'
      );

      // Dispatch the handler inside a promise so we can advance time in the background
      const dispatchPromise = emailHandler(req);

      // Advance timers to trigger successive backoff intervals: 1s, 2s, 4s, 8s
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(16000);
      }

      const res = await dispatchPromise;
      expect(res.status).toBe(200);

      // 5 failed send attempts
      expect(mockSend).toHaveBeenCalledTimes(5);

      // Assert that DB insert was called with the notificationLogs table
      expect(db.insert).toHaveBeenCalledWith(notificationLogs);
    });
  });

  describe('MS Teams Dispatcher Handler — POST /api/qstash/teams', () => {
    const payload = {
      eventType: 'RETURN_OVERDUE',
      userId: 'admin-user-id',
      title: 'Asset Return Overdue',
      message: 'Asset LAP-012 expected return was yesterday.',
      targetUrl: '/operations/assignments/101',
    };

    it('returns 401 if QStash signature is invalid', async () => {
      mockVerify.mockResolvedValueOnce(false);
      const req = createRequest(
        'http://localhost:3000/api/qstash/teams',
        payload,
        'bad-sig'
      );
      const res = await teamsHandler(req);

      expect(res.status).toBe(401);
    });

    it('successfully decrypts teamsWebhookUrl, builds connector card, and dispatches webhook', async () => {
      mockVerify.mockResolvedValueOnce(true);

      mockQueriesQueue = [[{ id: 1, teamsWebhookUrl: encryptedTeamsUrl }]];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const req = createRequest(
        'http://localhost:3000/api/qstash/teams',
        payload,
        'valid-sig'
      );
      const res = await teamsHandler(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify webhook payload
      expect(mockFetch).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook/test-webhook-url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('MessageCard'),
        })
      );
    });
  });
});
