import { NextResponse } from 'next/server';
import { db } from '@/db';
import { systemAuditLogs, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { extractLabelFromValues } from '@/lib/audit';
import { withMobileAuth } from '@/lib/api/with-auth';
import { canViewAuditLog } from '@/lib/auth/roles';
import {
  buildEventDetailsSentence,
  describeEntityType,
} from '@/lib/audit-events';

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
export const GET = withMobileAuth(canViewAuditLog, async () => {
  // Fetch the 5 most recent audit log entries.
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
          : describeEntityType(record.entityType));

      return {
        id: record.id,
        action: record.actionType,
        event: buildEventDetailsSentence(
          record.actionType,
          record.entityType,
          oldValue,
          newValue
        ),
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
