import { db } from '@/db';
import { apiKeys, webhookSubscriptions, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

import type {
  ApiKeyDisplay,
  WebhookSubscriptionDisplay,
  ApiKeyScope,
  WebhookEventType,
} from '@/types/integrations';

export async function getApiKeys(): Promise<ApiKeyDisplay[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      keySuffix: apiKeys.keySuffix,
      scopes: apiKeys.scopes,
      createdByName: users.name,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isRevoked: apiKeys.isRevoked,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .leftJoin(users, eq(users.id, apiKeys.createdById))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    keySuffix: r.keySuffix,
    scopes: r.scopes as ApiKeyScope[],
    createdByName: r.createdByName || 'System',
    lastUsedAt: r.lastUsedAt ?? null,
    expiresAt: r.expiresAt ?? null,
    isRevoked: !!r.isRevoked,
    isExpired: r.expiresAt ? new Date(r.expiresAt) < new Date() : false,
    createdAt: r.createdAt,
  }));
}

export async function getWebhookSubscriptions(): Promise<WebhookSubscriptionDisplay[]> {
  const rows = await db
    .select({
      id: webhookSubscriptions.id,
      name: webhookSubscriptions.name,
      url: webhookSubscriptions.url,
      events: webhookSubscriptions.events,
      isActive: webhookSubscriptions.isActive,
      createdByName: users.name,
      createdAt: webhookSubscriptions.createdAt,
      updatedAt: webhookSubscriptions.updatedAt,
    })
    .from(webhookSubscriptions)
    .innerJoin(users, eq(users.id, webhookSubscriptions.createdById))
    .orderBy(desc(webhookSubscriptions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    events: r.events as WebhookEventType[],
    isActive: !!r.isActive,
    createdByName: r.createdByName || 'System',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}
