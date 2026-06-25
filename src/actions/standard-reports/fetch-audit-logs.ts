import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { systemAuditLogs, users } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { resolveTargetEntityLabels, resolveAuditValueLabels } from '@/actions/audit-log';
import { extractLabelFromValues } from '@/lib/audit';
import { buildEventDetailsSentence } from './utils';
import type { ReportPreviewFilters, ReportPreviewRow } from '@/types/standard-reports';

export async function fetchAuditLogs(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (
    filters.status &&
    filters.status !== 'All statuses' &&
    filters.status !== 'All Actions'
  ) {
    conditions.push(eq(systemAuditLogs.actionType, filters.status));
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${systemAuditLogs.performedAt} >= ${filters.dateFrom}::timestamp`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${systemAuditLogs.performedAt} <= ${filters.dateTo}::timestamp`
    );
  }

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: systemAuditLogs.id,
      performedAt: systemAuditLogs.performedAt,
      user: users.name,
      actionType: systemAuditLogs.actionType,
      entityType: systemAuditLogs.entityType,
      entityId: systemAuditLogs.entityId,
      oldValue: systemAuditLogs.oldValue,
      newValue: systemAuditLogs.newValue,
      ipAddress: systemAuditLogs.ipAddress,
    })
    .from(systemAuditLogs)
    .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(systemAuditLogs)
    .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(systemAuditLogs.performedAt))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.auditLogs',
    startTime: queryTimer,
  });

  // Resolve entity labels in bulk
  const targetEntityLabels = await resolveTargetEntityLabels(rows);
  const { labels: valueLabels, idMappings } =
    await resolveAuditValueLabels(rows);

  const data: ReportPreviewRow[] = rows.map((row) => {
    const oldVal = row.oldValue as Record<string, unknown> | null;
    const newVal = row.newValue as Record<string, unknown> | null;

    const humanize = (obj: Record<string, unknown> | null) => {
      if (!obj) return null;
      const newObj = { ...obj };
      for (const [key, val] of Object.entries(newObj)) {
        const entityType = idMappings[key];
        if (entityType && val) {
          const label = valueLabels.get(`${entityType}::${val}`);
          if (label) newObj[key] = label;
        }
      }
      return newObj;
    };

    const humanizedOld = humanize(oldVal);
    const humanizedNew = humanize(newVal);

    const resolvedLabel =
      targetEntityLabels.get(`${row.entityType}::${row.entityId}`) ||
      extractLabelFromValues(oldVal, newVal);

    const details = buildEventDetailsSentence(
      row.actionType,
      row.entityType,
      humanizedOld,
      humanizedNew
    );

    return {
      id: String(row.id),
      'Log ID': String(row.id),
      Timestamp: row.performedAt
        ? new Date(row.performedAt).toLocaleString()
        : '-',
      User: row.user || 'System',
      Action: row.actionType,
      'Entity Type': row.entityType,
      'Entity ID': resolvedLabel || row.entityId,
      'IP Address': row.ipAddress || 'Unknown IP',
      Details: details,
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
