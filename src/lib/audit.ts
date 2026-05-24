import { db } from '@/db';
import { systemAuditLogs } from '@/db/schema';
import { headers } from 'next/headers';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'RETURN'
  | 'STATUS_CHANGE'
  | 'REPAIR_INITIATED'
  | 'REPAIR_COMPLETED'
  | 'RESOLVED_INTERNALLY'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACCESS_DENIED'
  | 'IMPORT';

type AuditPayload = {
  entityType: string;
  entityId: string;
  actionType: AuditActionType;
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

async function buildAuditRecord(payload: AuditPayload) {
  // 1. Silent IP Capture via Next.js Headers
  // In Next.js 15+, headers() must be awaited
  let ipAddress = 'Unknown IP';
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    ipAddress = (
      forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown IP'
    ).slice(0, 45);
  } catch {
    // If called outside of a request context, headers() will throw.
  }

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
    if (Object.keys(finalNewValue).length === 0) return null;
  }

  return {
    entityType: payload.entityType,
    entityId: String(payload.entityId),
    actionType: payload.actionType,
    performedById: payload.performedById,
    oldValue: finalOldValue ? finalOldValue : null,
    newValue: finalNewValue ? finalNewValue : null,
    ipAddress: ipAddress,
  };
}

export async function logAuditAction(payload: AuditPayload) {
  try {
    const record = await buildAuditRecord(payload);
    if (!record) return;

    // 3. Write the Immutable Record
    await db.insert(systemAuditLogs).values(record);
  } catch (error) {
    // We log the error to the server console, but DO NOT throw it.
    // We don't want a failed audit log to break the user's CRUD operation.
    console.error('CRITICAL: Failed to write to audit ledger', error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logAuditActionTx(tx: any, payload: AuditPayload) {
  try {
    const record = await buildAuditRecord(payload);
    if (!record) return;

    // 3. Write the Immutable Record via Transaction
    await tx.insert(systemAuditLogs).values(record);
  } catch (error) {
    console.error('CRITICAL: Failed to write to audit ledger via tx', error);
  }
}

export function extractLabelFromValues(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string | null {
  const parse = (obj: Record<string, unknown> | null): string | null => {
    if (!obj) return null;

    const codeKeys = [
      'assetTag', 'asset_tag',
      'reportCode', 'report_code',
      'locationCode', 'location_code',
      'categoryCode', 'category_code',
      'brandCode', 'brand_code',
      'modelCode', 'model_code',
      'vendorCode', 'vendor_code',
      'ownerCode', 'owner_code',
      'departmentCode', 'department_code',
      'code'
    ];
    let code: string | null = null;
    for (const key of codeKeys) {
      if (typeof obj[key] === 'string' && (obj[key] as string).trim().length > 0) {
        code = (obj[key] as string).trim();
        break;
      }
    }

    const nameKeys = ['name', 'companyName', 'company_name', 'email'];
    let name: string | null = null;
    for (const key of nameKeys) {
      if (typeof obj[key] === 'string' && (obj[key] as string).trim().length > 0) {
        name = (obj[key] as string).trim();
        break;
      }
    }

    if (code && name) {
      return `${code} · ${name}`;
    }
    return name || code || null;
  };

  const labelFromNew = parse(newValue);
  if (labelFromNew) return labelFromNew;

  const labelFromOld = parse(oldValue);
  if (labelFromOld) return labelFromOld;

  return null;
}

