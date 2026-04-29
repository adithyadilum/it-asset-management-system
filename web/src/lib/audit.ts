import { db } from '@/db';
import { systemAuditLogs } from '@/db/schema';
import { headers } from 'next/headers';

type AuditPayload = {
  entityType: string;
  entityId: string;
  actionType:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'ACCESS_DENIED'
    | 'LOGIN'
    | 'LOGOUT';
  performedById: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function areAuditValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!areAuditValuesEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return false;
      }

      if (!areAuditValuesEqual(left[key], right[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

export async function logAuditAction(payload: AuditPayload) {
  try {
    // 1. Silent IP Capture via Next.js Headers
    // In Next.js 15+, headers() must be awaited
    const headersList = await headers();
    // Vercel/proxies use x-forwarded-for. Fallback to standard remote address.
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = (
      forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown IP'
    ).slice(0, 45);

    // 2. State Diff Calculation (Only log what actually changed)
    let finalOldValue = payload.oldData;
    let finalNewValue = payload.newData;

    if (payload.actionType === 'UPDATE' && payload.oldData && payload.newData) {
      finalOldValue = {};
      finalNewValue = {};

      // Compare keys to find the exact diff
      for (const key in payload.newData) {
        if (!areAuditValuesEqual(payload.newData[key], payload.oldData[key])) {
          finalOldValue[key] = payload.oldData[key];
          finalNewValue[key] = payload.newData[key];
        }
      }

      // If nothing actually changed, skip logging to save DB space
      if (Object.keys(finalNewValue).length === 0) return;
    }

    // 3. Write the Immutable Record
    await db.insert(systemAuditLogs).values({
      entityType: payload.entityType,
      entityId: payload.entityId,
      actionType: payload.actionType,
      performedById: payload.performedById,
      // Drizzle handles jsonb natively, passing objects is correct
      oldValue: finalOldValue ? finalOldValue : null,
      newValue: finalNewValue ? finalNewValue : null,
      ipAddress: ipAddress,
    });
  } catch (error) {
    // We log the error to the server console, but DO NOT throw it.
    // We don't want a failed audit log to break the user's CRUD operation.
    console.error('CRITICAL: Failed to write to audit ledger', error);
  }
}
