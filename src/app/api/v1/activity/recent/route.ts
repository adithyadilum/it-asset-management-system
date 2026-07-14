import { NextResponse } from 'next/server';
import { db } from '@/db';
import { systemAuditLogs, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { extractLabelFromValues } from '@/lib/audit';
import { getAuthenticatedMobileUserFromRequest } from '@/lib/auth/get-authenticated-user';

/** Humanise camelCase / snake_case entity type strings into readable words. */
function humanizeEntityType(entityType: string): string {
  return entityType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a short human-readable event description from an audit row —
 * mirrors the `buildEventDetails` logic used in the Next.js audit-log table.
 */
function buildEventDetails(
  actionType: string,
  entityType: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  const action = actionType.trim().toUpperCase();

  if (action === 'LOGIN') return 'User logged in';
  if (action === 'LOGOUT') return 'User logged out';
  if (action === 'DEVICE_LINKED') return 'Mobile device linked';
  if (action === 'DEVICE_UNLINKED') return 'Mobile device unlinked';
  if (action === 'ACCESS_DENIED') {
    const role = newValue?.role ? String(newValue.role) : 'Unknown';
    return `Access denied for role [${role}]`;
  }

  if (!oldValue && !newValue) {
    if (action === 'CREATE') return `Created ${humanizeEntityType(entityType).toLowerCase()}`;
    if (action === 'DELETE') return `Deleted ${humanizeEntityType(entityType).toLowerCase()}`;
    return 'Updated record';
  }

  if (oldValue && newValue) {
    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    for (const key of keys) {
      if (!Object.is(oldValue[key], newValue[key])) {
        const label = key
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .trim();
        const oldStr = String(oldValue[key] ?? '-');
        const newStr = String(newValue[key] ?? '-');
        if (action === 'CREATE') return `Created ${label} as [${newStr}]`;
        if (action === 'DELETE') return `Deleted ${label} [${oldStr}]`;
        return `Changed ${label} from [${oldStr}] → [${newStr}]`;
      }
    }
  }

  if (action === 'CREATE') return `Created ${humanizeEntityType(entityType).toLowerCase()}`;
  if (action === 'DELETE') return `Deleted ${humanizeEntityType(entityType).toLowerCase()}`;
  return 'Updated record';
}

/**
 * GET /api/v1/activity/recent
 *
 * Returns the 5 most recent system audit log entries, authenticated via
 * the same mobile JWT that is issued during the QR pairing flow.
 *
 * Response shape:
 * {
 *   data: Array<{
 *     id: number;
 *     action: string;        // e.g. "CREATE", "ASSIGN", "LOGIN"
 *     event: string;         // human-readable description
 *     entityType: string;    // e.g. "Asset", "users"
 *     entityLabel: string;   // e.g. "AST-1023 · MacBook Pro"
 *     performedBy: { name: string; email: string } | null;
 *     performedAt: string;   // ISO 8601
 *   }>
 * }
 */
export async function GET(req: Request) {
  // --- 1. Authenticate via mobile JWT ---
  const user = await getAuthenticatedMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 2. Fetch the 5 most recent audit log entries ---
  try {
    const records = await db
      .select({
        id: systemAuditLogs.id,
        performedAt: systemAuditLogs.performedAt,
        entityType: systemAuditLogs.entityType,
        entityId: systemAuditLogs.entityId,
        actionType: systemAuditLogs.actionType,
        oldValue: systemAuditLogs.oldValue,
        newValue: systemAuditLogs.newValue,
        performedById: users.id,
        performedByName: users.name,
        performedByEmail: users.email,
      })
      .from(systemAuditLogs)
      .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
      .orderBy(desc(systemAuditLogs.performedAt), desc(systemAuditLogs.id))
      .limit(5);

    const data = records.map((record) => {
      const oldValue = record.oldValue as Record<string, unknown> | null;
      const newValue = record.newValue as Record<string, unknown> | null;

      // Derive a short entity label the same way the web audit log does
      const entityLabel =
        extractLabelFromValues(oldValue, newValue) ??
        (record.entityType === 'URL'
          ? record.entityId
          : humanizeEntityType(record.entityType));

      return {
        id: record.id,
        action: record.actionType,
        event: buildEventDetails(record.actionType, record.entityType, oldValue, newValue),
        entityType: record.entityType,
        entityLabel,
        performedBy: record.performedById
          ? {
              name: record.performedByName ?? 'Unknown',
              email: record.performedByEmail ?? '',
            }
          : null,
        performedAt: record.performedAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/v1/activity/recent] DB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
