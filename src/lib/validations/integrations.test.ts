import { describe, it, expect } from 'vitest';
import {
  createApiKeySchema,
  createWebhookSchema,
  updateWebhookSchema,
} from '@/lib/validations/integrations';

// ---------------------------------------------------------------------------
// createApiKeySchema
// ---------------------------------------------------------------------------

describe('createApiKeySchema', () => {
  it('accepts a valid API key with name, scopes, and optional expiry', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Production API Key',
      scopes: ['read:assets'],
    });
    expect(result.success).toBe(true);
  });

  it('requires name ≥ 3 chars', () => {
    const result = createApiKeySchema.safeParse({
      name: 'AB',
      scopes: ['read:assets'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects name > 100 chars', () => {
    const result = createApiKeySchema.safeParse({
      name: 'A'.repeat(101),
      scopes: ['read:assets'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts name exactly 100 chars', () => {
    const result = createApiKeySchema.safeParse({
      name: 'A'.repeat(100),
      scopes: ['read:assets'],
    });
    expect(result.success).toBe(true);
  });

  it('requires at least one scope', () => {
    const result = createApiKeySchema.safeParse({
      name: 'My Key',
      scopes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid scope values', () => {
    const result = createApiKeySchema.safeParse({
      name: 'My Key',
      scopes: ['invalid:scope'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid scope values', () => {
    const allScopes = [
      'read:assets', 'read:assets:by-user', 'write:assets',
      'read:users', 'read:maintenance', 'read:disposals', 'read:financials',
    ];
    const result = createApiKeySchema.safeParse({
      name: 'Full Access Key',
      scopes: allScopes,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid expiresAt date string', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Temp Key',
      scopes: ['read:assets'],
      expiresAt: '2025-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid expiresAt format', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Temp Key',
      scopes: ['read:assets'],
      expiresAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts undefined expiresAt (no expiry)', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Permanent Key',
      scopes: ['read:assets'],
      expiresAt: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepts omitted expiresAt', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Permanent Key',
      scopes: ['read:assets'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple scopes', () => {
    const result = createApiKeySchema.safeParse({
      name: 'Multi-scope Key',
      scopes: ['read:assets', 'write:assets', 'read:users'],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createWebhookSchema
// ---------------------------------------------------------------------------

describe('createWebhookSchema', () => {
  it('accepts a valid webhook with name, HTTPS URL, and events', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Prod Webhook',
      url: 'https://example.com/webhook',
      events: ['asset.created'],
    });
    expect(result.success).toBe(true);
  });

  it('requires name ≥ 3 chars', () => {
    const result = createWebhookSchema.safeParse({
      name: 'AB',
      url: 'https://example.com/webhook',
      events: ['asset.created'],
    });
    expect(result.success).toBe(false);
  });

  it('requires HTTPS URL', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Webhook',
      url: 'https://example.com/hook',
      events: ['asset.created'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects HTTP URL', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Webhook',
      url: 'http://example.com/hook',
      events: ['asset.created'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-URL strings', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Webhook',
      url: 'not-a-url',
      events: ['asset.created'],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one event', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Webhook',
      url: 'https://example.com/hook',
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid event types', () => {
    const result = createWebhookSchema.safeParse({
      name: 'Webhook',
      url: 'https://example.com/hook',
      events: ['invalid.event'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid event types', () => {
    const allEvents = [
      'asset.created', 'asset.status_changed',
      'assignment.created', 'assignment.returned',
      'maintenance.created', 'maintenance.completed',
      'disposal.requested', 'disposal.approved',
      'ping',
    ];
    const result = createWebhookSchema.safeParse({
      name: 'Full Events',
      url: 'https://example.com/hook',
      events: allEvents,
    });
    expect(result.success).toBe(true);
  });

  it('rejects name > 100 chars', () => {
    const result = createWebhookSchema.safeParse({
      name: 'A'.repeat(101),
      url: 'https://example.com/hook',
      events: ['asset.created'],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateWebhookSchema
// ---------------------------------------------------------------------------

describe('updateWebhookSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateWebhookSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with isActive only', () => {
    const result = updateWebhookSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with events only', () => {
    const result = updateWebhookSchema.safeParse({
      events: ['asset.created', 'ping'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects HTTP URL in update', () => {
    const result = updateWebhookSchema.safeParse({
      url: 'http://example.com/hook',
    });
    expect(result.success).toBe(false);
  });

  it('accepts HTTPS URL in update', () => {
    const result = updateWebhookSchema.safeParse({
      url: 'https://example.com/hook',
    });
    expect(result.success).toBe(true);
  });

  it('rejects events array with invalid event type', () => {
    const result = updateWebhookSchema.safeParse({
      events: ['invalid.event'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no updates)', () => {
    const result = updateWebhookSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    const result = updateWebhookSchema.safeParse({ name: 'AB' });
    expect(result.success).toBe(false);
  });
});
