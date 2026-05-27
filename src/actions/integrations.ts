'use server';

import { Client } from '@upstash/qstash';
import { randomBytes, createHash, createHmac, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { apiKeys, webhookSubscriptions } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { logAuditAction } from '@/lib/audit';
import { API_KEY_PREFIX } from '@/lib/constants';
import { decrypt, encrypt } from '@/lib/crypto';
import { createWebhookSchema, updateWebhookSchema } from '@/lib/validations/integrations';
import { createApiKeySchema } from '@/lib/validations/integrations';
import { revalidatePath } from 'next/cache';
import { isValidUuid } from '@/lib/auth/uuid';

type WebhookSubscriptionResult =
  | { success: true; secret: string }
  | { success: false; error: string };

type WebhookMutationResult =
  | { success: true }
  | { success: false; error: string };

type TestWebhookResult =
  | { success: true; message: string }
  | { success: false; error: string };

function parseStringArrayField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter((item) => item.length > 0);
    }
  } catch {
    // fall through to treating the value as a single item
  }

  return [trimmed];
}

function parseOptionalBooleanField(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;

  if (!token) {
    throw new Error('QSTASH_TOKEN not set in environment variables');
  }

  return new Client({ token });
}

type CreateApiKeyResult = {
  success: true;
  plainTextKey: string;
} | {
  success: false;
  error: string;
};

export async function createApiKey(formData: FormData): Promise<CreateApiKeyResult> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  const rawName = (formData.get('name') as string) || '';
  const rawScopes = (formData.get('scopes') as string) || '[]';
  const rawExpires = (formData.get('expiresAt') as string) || undefined;

  try {
    const parsedScopes = JSON.parse(rawScopes);
    const parsedResult = createApiKeySchema.safeParse({ name: rawName, scopes: parsedScopes, expiresAt: rawExpires });

    if (!parsedResult.success) {
      return {
        success: false,
        error: parsedResult.error.issues[0]?.message ?? 'Please check the API key details and try again.',
      };
    }

    const parsed = parsedResult.data;

    const bytes = randomBytes(32);
    const plainText = `${API_KEY_PREFIX}${bytes.toString('hex')}`;
    const keyHash = createHash('sha256').update(plainText).digest('hex');
    const keyPrefix = plainText.slice(0, API_KEY_PREFIX.length);
    const keySuffix = plainText.slice(-4);

    const insertResult = await db.insert(apiKeys).values({
      name: parsed.name,
      keyHash,
      keyPrefix,
      keySuffix,
      scopes: parsed.scopes,
      createdById: currentUser.id,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    }).returning({ id: apiKeys.id });

    await logAuditAction({
      entityType: 'ApiKey',
      entityId: insertResult[0].id,
      actionType: 'API_KEY_CREATED',
      performedById: currentUser.id,
      newData: { name: parsed.name, scopes: parsed.scopes },
    });

    try { revalidatePath('/settings/integrations'); } catch {}

    return { success: true, plainTextKey: plainText };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, error: 'Please select valid API key scopes and try again.' };
    }

    return { success: false, error: 'Failed to create API key. Please try again.' };
  }
}

export async function revokeApiKey(keyId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isValidUuid(keyId)) return { success: false, error: 'Invalid id' };

  const existing = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, keyId) });
  if (!existing) return { success: false, error: 'API key not found' };
  if (existing.isRevoked) return { success: false, error: 'API key already revoked' };

  const [updated] = await db.update(apiKeys)
    .set({ isRevoked: true })
    .where(eq(apiKeys.id, keyId))
    .returning({ id: apiKeys.id });

  if (!updated) {
    return { success: false, error: 'API key not found or already deleted' };
  }

  await logAuditAction({
    entityType: 'ApiKey',
    entityId: keyId,
    actionType: 'API_KEY_REVOKED',
    performedById: currentUser.id,
    oldData: { isRevoked: false },
    newData: { isRevoked: true },
  });

  try { revalidatePath('/settings/integrations'); } catch {}

  return { success: true, message: 'API key revoked.' };
}

export async function deleteApiKey(keyId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isValidUuid(keyId)) return { success: false, error: 'Invalid id' };

  const existing = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, keyId) });
  if (!existing) return { success: false, error: 'API key not found' };
  if (!existing.isRevoked) return { success: false, error: 'API key must be revoked before deletion' };

  const [deleted] = await db.delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .returning({ id: apiKeys.id });

  if (!deleted) {
    return { success: false, error: 'API key not found or already deleted' };
  }

  await logAuditAction({
    entityType: 'ApiKey',
    entityId: keyId,
    actionType: 'DELETE',
    performedById: currentUser.id,
    oldData: existing,
  });

  try { revalidatePath('/settings/integrations'); } catch {}

  return { success: true };
}

export async function createWebhookSubscription(formData: FormData): Promise<WebhookSubscriptionResult> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  const rawName = (formData.get('name') as string) || '';
  const rawUrl = (formData.get('url') as string) || '';
  const rawEvents = parseStringArrayField(formData.get('events'));

  const parsedResult = createWebhookSchema.safeParse({
    name: rawName,
    url: rawUrl,
    events: rawEvents,
  });

  if (!parsedResult.success) {
    return {
      success: false,
      error: parsedResult.error.issues[0]?.message ?? 'Please check the webhook details and try again.',
    };
  }

  const secret = randomBytes(32).toString('hex');
  const encryptedSecret = encrypt(secret);

  const insertResult = await db
    .insert(webhookSubscriptions)
    .values({
      name: parsedResult.data.name,
      url: parsedResult.data.url,
      events: parsedResult.data.events,
      secret: encryptedSecret,
      createdById: currentUser.id,
    })
    .returning({ id: webhookSubscriptions.id });

  await logAuditAction({
    entityType: 'WebhookSubscription',
    entityId: insertResult[0].id,
    actionType: 'WEBHOOK_CREATED',
    performedById: currentUser.id,
    newData: {
      name: parsedResult.data.name,
      url: parsedResult.data.url,
      events: parsedResult.data.events,
    },
  });

  try {
    revalidatePath('/settings/integrations');
  } catch {}

  return { success: true, secret };
}

export async function updateWebhookSubscription(
  id: string,
  formData: FormData
): Promise<WebhookMutationResult> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isValidUuid(id)) {
    return { success: false, error: 'Invalid id' };
  }

  const existing = await db.query.webhookSubscriptions.findFirst({
    where: eq(webhookSubscriptions.id, id),
  });

  if (!existing) {
    return { success: false, error: 'Webhook subscription not found' };
  }

  const rawName = formData.get('name');
  const rawUrl = formData.get('url');
  const rawEvents = formData.get('events');
  const rawIsActive = formData.get('isActive');

  const updateInput: {
    name?: string;
    url?: string;
    events?: string[];
    isActive?: boolean;
  } = {};

  if (typeof rawName === 'string' && rawName.trim()) {
    updateInput.name = rawName.trim();
  }

  if (typeof rawUrl === 'string' && rawUrl.trim()) {
    updateInput.url = rawUrl.trim();
  }

  const parsedEvents = parseStringArrayField(rawEvents);
  if (typeof rawEvents === 'string' && rawEvents.trim()) {
    updateInput.events = parsedEvents;
  }

  const parsedIsActive = parseOptionalBooleanField(rawIsActive);
  if (typeof parsedIsActive === 'boolean') {
    updateInput.isActive = parsedIsActive;
  }

  const parsedResult = updateWebhookSchema.safeParse(updateInput);
  if (!parsedResult.success) {
    return {
      success: false,
      error: parsedResult.error.issues[0]?.message ?? 'Please check the webhook details and try again.',
    };
  }

  const [updated] = await db
    .update(webhookSubscriptions)
    .set({
      ...(parsedResult.data.name !== undefined ? { name: parsedResult.data.name } : {}),
      ...(parsedResult.data.url !== undefined ? { url: parsedResult.data.url } : {}),
      ...(parsedResult.data.events !== undefined ? { events: parsedResult.data.events } : {}),
      ...(parsedResult.data.isActive !== undefined ? { isActive: parsedResult.data.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(webhookSubscriptions.id, id))
    .returning();

  if (!updated) {
    return { success: false, error: 'Webhook subscription could not be updated' };
  }

  await logAuditAction({
    entityType: 'WebhookSubscription',
    entityId: id,
    actionType: 'WEBHOOK_UPDATED',
    performedById: currentUser.id,
    oldData: existing,
    newData: updated,
  });

  try {
    revalidatePath('/settings/integrations');
  } catch {}

  return { success: true };
}

export async function deleteWebhookSubscription(id: string): Promise<WebhookMutationResult> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isValidUuid(id)) {
    return { success: false, error: 'Invalid id' };
  }

  const existing = await db.query.webhookSubscriptions.findFirst({
    where: eq(webhookSubscriptions.id, id),
  });

  if (!existing) {
    return { success: false, error: 'Webhook subscription not found' };
  }

  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));

  await logAuditAction({
    entityType: 'WebhookSubscription',
    entityId: id,
    actionType: 'WEBHOOK_DELETED',
    performedById: currentUser.id,
    oldData: existing,
  });

  try {
    revalidatePath('/settings/integrations');
  } catch {}

  return { success: true };
}

export async function sendTestWebhook(subscriptionId: string): Promise<TestWebhookResult> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isValidUuid(subscriptionId)) {
    return { success: false, error: 'Invalid id' };
  }

  const subscription = await db.query.webhookSubscriptions.findFirst({
    where: eq(webhookSubscriptions.id, subscriptionId),
  });

  if (!subscription) {
    return { success: false, error: 'Webhook subscription not found' };
  }

  if (!subscription.isActive) {
    return { success: false, error: 'Webhook subscription is inactive' };
  }

  const secret = decrypt(subscription.secret);
  const envelope = {
    event_id: `evt_${randomUUID()}`,
    event_type: 'ping' as const,
    created_at: new Date().toISOString(),
    data: {
      message: 'Test event from EITAMS',
    },
  };

  const payload = JSON.stringify(envelope);
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const qstash = getQStashClient();
    await qstash.publishJSON({
      url: subscription.url,
      body: envelope,
      headers: {
        'Content-Type': 'application/json',
        'X-EITAMS-Signature': `sha256=${signature}`,
        'X-EITAMS-Event': 'ping',
      },
    });

    return { success: true, message: 'Test event queued via QStash' };
  } catch (error) {
    console.error('Failed to send test webhook via QStash:', error);
    let errorMessage = 'Failed to dispatch test event to QStash';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
