/**
 * @vitest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { logAuditAction } from '@/lib/audit';
import { GET as getHandler } from '@/app/api/v1/settings/notification-rules/route';
import { PUT as putHandler } from '@/app/api/v1/settings/notification-rules/[id]/route';

// Mocks
vi.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));

// Setup chainable mock structure for Drizzle query builder
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockWhereSelect = vi.fn(() => ({
  limit: mockLimit,
}));
const mockFrom = vi.fn(() => ({
  orderBy: mockOrderBy,
  where: mockWhereSelect,
}));

const mockReturning = vi.fn();
const mockWhereUpdate = vi.fn(() => ({
  returning: mockReturning,
}));
const mockSet = vi.fn(() => ({
  where: mockWhereUpdate,
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: mockFrom,
    })),
    update: vi.fn(() => ({
      set: mockSet,
    })),
  },
}));

function createGetRequest(url: string = 'http://localhost/api/v1/settings/notification-rules'): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createPutRequest(
  url: string = 'http://localhost/api/v1/settings/notification-rules/1',
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('Settings Alert Notification Rules API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/settings/notification-rules', () => {
    it('returns 401 Unauthorized if user session is invalid', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

      const req = createGetRequest();
      const response = await getHandler();

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 200 and lists all rules for authenticated users', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'user-123',
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        isActive: true,
        createdAt: new Date(),
      } as any);

      const mockRules = [
        { id: 1, ruleKey: 'WARRANTY_EXPIRY_WARNING', isEnabled: true },
        { id: 2, ruleKey: 'RETURN_OVERDUE', isEnabled: false },
      ];
      mockOrderBy.mockResolvedValue(mockRules);

      const req = createGetRequest();
      const response = await getHandler();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockRules);
      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/settings/notification-rules/[id]', () => {
    it('returns 401 Unauthorized if user session is invalid', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

      const req = createPutRequest('http://localhost/api/v1/settings/notification-rules/1', {
        isEnabled: false,
        channelInApp: true,
        channelEmail: true,
        channelTeams: false,
      });

      const response = await putHandler(req, {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 if ID format is invalid', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'user-123',
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        isActive: true,
        createdAt: new Date(),
      } as any);

      const req = createPutRequest('http://localhost/api/v1/settings/notification-rules/abc', {
        isEnabled: false,
        channelInApp: true,
        channelEmail: true,
        channelTeams: false,
      });

      const response = await putHandler(req, {
        params: Promise.resolve({ id: 'abc' }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Invalid rule ID format');
    });

    it('returns 400 if validation fails due to missing payload parameters', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'user-123',
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        isActive: true,
        createdAt: new Date(),
      } as any);

      // missing channelEmail and channelTeams
      const req = createPutRequest('http://localhost/api/v1/settings/notification-rules/1', {
        isEnabled: true,
        channelInApp: true,
      });

      const response = await putHandler(req, {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Validation failed');
    });

    it('returns 404 if notification rule does not exist in the database', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'user-123',
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        isActive: true,
        createdAt: new Date(),
      } as any);

      mockLimit.mockResolvedValue([]); // Rule not found

      const req = createPutRequest('http://localhost/api/v1/settings/notification-rules/999', {
        isEnabled: false,
        channelInApp: true,
        channelEmail: true,
        channelTeams: false,
      });

      const response = await putHandler(req, {
        params: Promise.resolve({ id: '999' }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Notification rule not found');
    });

    it('returns 200, updates rule, and logs audit action for successful updates', async () => {
      const user = {
        id: 'user-123',
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin' as const,
        isActive: true,
        createdAt: new Date(),
      };
      vi.mocked(getAuthenticatedUser).mockResolvedValue(user as any);

      const existingRule = {
        id: 1,
        ruleKey: 'WARRANTY_EXPIRY_WARNING',
        displayName: 'Warranty Expiry',
        isEnabled: true,
        thresholdDays: 30,
        channelInApp: true,
        channelEmail: true,
        channelTeams: false,
      };

      const updatedRule = {
        ...existingRule,
        isEnabled: false,
        thresholdDays: 15,
        channelTeams: true,
        updatedById: user.id,
      };

      mockLimit.mockResolvedValue([existingRule]);
      mockReturning.mockResolvedValue([updatedRule]);

      const req = createPutRequest('http://localhost/api/v1/settings/notification-rules/1', {
        isEnabled: false,
        thresholdDays: 15,
        channelInApp: true,
        channelEmail: true,
        channelTeams: true,
      });

      const response = await putHandler(req, {
        params: Promise.resolve({ id: '1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(updatedRule);

      // Verify Drizzle update was called
      expect(db.update).toHaveBeenCalled();

      // Verify audit logging was called
      expect(logAuditAction).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'NotificationRule',
        entityId: '1',
        actionType: 'UPDATE',
        performedById: user.id,
        oldData: existingRule,
        newData: updatedRule,
      }));
    });
  });
});
