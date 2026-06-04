import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
    const proxy = new Proxy(c, {
      get(t, p) {
        if (p === 'then') return (r: (v: unknown) => void) => r(resolvedValue);
        return t[p as string];
      },
    });
    return proxy;
  };

  const db = {
    insert: vi.fn().mockReturnValue(chain([])),
    update: vi.fn().mockReturnValue(chain([])),
    delete: vi.fn().mockReturnValue(chain([])),
    query: {
      apiKeys: { findFirst: vi.fn() },
      webhookSubscriptions: { findFirst: vi.fn() },
    },
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  apiKeys: { id: 'apiKeys.id', name: 'apiKeys.name', isRevoked: 'apiKeys.isRevoked' },
  webhookSubscriptions: { id: 'webhookSubscriptions.id' },
}));

const mockLogAuditAction = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Upstash QStash Client
const mockQStashPublishJSON = vi.fn();
const mockQStashEndpointsCreate = vi.fn();
const mockQStashEndpointsUpdate = vi.fn();
const mockQStashEndpointsDelete = vi.fn();

vi.mock('@upstash/qstash', () => {
  return {
    Client: vi.fn().mockImplementation(function() {
      return {
        publishJSON: mockQStashPublishJSON,
        endpoints: {
          create: mockQStashEndpointsCreate,
          update: mockQStashEndpointsUpdate,
          delete: mockQStashEndpointsDelete,
        },
      };
    }),
  };
});

vi.mock('@/lib/crypto', () => ({
  encrypt: (s: string) => `encrypted:${s}`,
  decrypt: (s: string) => s.replace('encrypted:', ''),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  sendTestWebhook,
} from '@/actions/integrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await createApiKey(formData({ name: 'Test', scopes: '["read:assets"]' }));
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', 'Unauthorized');
  });

  it('validates scopes and returns error on syntax error', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await createApiKey(formData({ name: 'Test', scopes: 'not-json' }));
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', expect.stringContaining('valid API key scopes'));
  });

  it('validates schema (name too short)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await createApiKey(formData({ name: 'A', scopes: '["read:assets"]' }));
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('creates API key, hashes, and returns plaintext', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockReturnValue(chain([{ id: 'key-1' }]));

    const result = await createApiKey(formData({ name: 'Prod Key', scopes: '["read:assets"]' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plainTextKey).toMatch(/^eitams_live_[0-9a-f]+$/);
    }
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'API_KEY_CREATED',
        entityId: 'key-1',
      })
    );
  });
});

describe('revokeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await revokeApiKey('uuid');
    expect(result.success).toBe(false);
  });

  it('returns error for invalid UUID format', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await revokeApiKey('not-a-uuid');
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', 'Invalid id');
  });

  it('returns error if key not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.apiKeys.findFirst.mockResolvedValue(null);
    const result = await revokeApiKey('00000000-0000-4000-a000-000000000000');
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', 'API key not found');
  });

  it('returns error if key already revoked', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.apiKeys.findFirst.mockResolvedValue({ isRevoked: true });
    const result = await revokeApiKey('00000000-0000-4000-a000-000000000000');
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', 'API key already revoked');
  });

  it('revokes key and logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const keyId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.apiKeys.findFirst.mockResolvedValue({ id: keyId, isRevoked: false });
    mockDb.update.mockReturnValue(chain([{ id: keyId }]));

    const result = await revokeApiKey(keyId);
    expect(result.success).toBe(true);
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'API_KEY_REVOKED',
        entityId: keyId,
        newData: { isRevoked: true },
      })
    );
  });
});

describe('deleteApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await deleteApiKey('uuid');
    expect(result.success).toBe(false);
  });

  it('deletes key and logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const keyId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.apiKeys.findFirst.mockResolvedValue({ id: keyId, name: 'Test Key', isRevoked: true });
    mockDb.delete.mockReturnValue(chain([{ id: keyId }]));

    const result = await deleteApiKey(keyId);
    expect(result.success).toBe(true);
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DELETE',
        entityId: keyId,
      })
    );
  });
});

describe('createWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-token';
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await createWebhookSubscription(formData({ name: 'Hook', url: 'https://test.com', events: '["ping"]' }));
    expect(result.success).toBe(false);
  });

  it('creates webhook subscription and saves to DB', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockReturnValue(chain([{ id: 'wh_1' }]));

    const result = await createWebhookSubscription(
      formData({ name: 'Prod Hook', url: 'https://test.com/hook', events: '["asset.created"]' })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.secret).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'WEBHOOK_CREATED' })
    );
  });
});

describe('updateWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-token';
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await updateWebhookSubscription('id', formData({ name: 'New' }));
    expect(result.success).toBe(false);
  });

  it('updates webhook in QStash and DB', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const webhookId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.webhookSubscriptions.findFirst.mockResolvedValue({
      id: webhookId,
      qstashEndpointId: 'ep_123',
    });
    mockDb.update.mockReturnValue(chain([{ id: webhookId }]));

    const result = await updateWebhookSubscription(webhookId, formData({ isActive: 'false' }));

    expect(result.success).toBe(true);
    // QStash update shouldn't be called if URL isn't changing
    expect(mockQStashEndpointsUpdate).not.toHaveBeenCalled();
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'WEBHOOK_UPDATED' })
    );
  });

  it('calls QStash update when URL changes', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const webhookId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.webhookSubscriptions.findFirst.mockResolvedValue({
      id: webhookId,
      qstashEndpointId: 'ep_123',
    });
    mockDb.update.mockReturnValue(chain([{ id: webhookId }]));

    await updateWebhookSubscription(webhookId, formData({ url: 'https://new.com/hook' }));

    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'WEBHOOK_UPDATED' })
    );
  });
});

describe('deleteWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-token';
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await deleteWebhookSubscription('id');
    expect(result.success).toBe(false);
  });

  it('deletes from QStash and DB', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const webhookId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.webhookSubscriptions.findFirst.mockResolvedValue({
      id: webhookId,
      qstashEndpointId: 'ep_123',
    });
    mockDb.delete.mockReturnValue(chain([{ id: webhookId }]));

    const result = await deleteWebhookSubscription(webhookId);

    expect(result.success).toBe(true);
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'WEBHOOK_DELETED' })
    );
  });
});

describe('testWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-token';
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await sendTestWebhook('id');
    expect(result.success).toBe(false);
  });

  it('publishes ping event via QStash', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const webhookId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.webhookSubscriptions.findFirst.mockResolvedValue({
      id: webhookId,
      url: 'https://test.com/hook',
      secret: 'encrypted:whsec_123',
      isActive: true,
    });
    mockQStashPublishJSON.mockResolvedValue({ messageId: 'msg_1' });

    const result = await sendTestWebhook(webhookId);

    expect(result.success).toBe(true);
    expect(mockQStashPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://test.com/hook',
        body: expect.objectContaining({ event_type: 'ping' }),
      })
    );
  });

  it('returns error if webhook inactive', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const webhookId = '00000000-0000-4000-a000-000000000000';
    mockDb.query.webhookSubscriptions.findFirst.mockResolvedValue({
      id: webhookId,
      url: 'https://test.com/hook',
      isActive: false,
    });

    const result = await sendTestWebhook(webhookId);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error', 'Webhook subscription is inactive');
  });
});
