'use server';

import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { logAuditAction } from '@/lib/audit';
import { API_KEY_PREFIX } from '@/lib/constants';
import { createApiKeySchema } from '@/lib/validations/integrations';
import { revalidatePath } from 'next/cache';
import { isValidUuid } from '@/lib/auth/uuid';

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
    const parsed = createApiKeySchema.parse({ name: rawName, scopes: parsedScopes, expiresAt: rawExpires });

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
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Validation failed' };
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

  await db.update(apiKeys).set({ isRevoked: true }).where(eq(apiKeys.id, keyId));

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

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

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
