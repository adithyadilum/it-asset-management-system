import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  assetAssignments,
  assets,
  models,
  categories,
  users,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { formatAssignmentState } from '@/lib/assignments/labels';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

export async function fetchActiveAssignments(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [isNull(assetAssignments.returnedDate)];

  if (
    filters.status &&
    filters.status !== 'All statuses' &&
    filters.status !== 'All States'
  ) {
    conditions.push(eq(assetAssignments.state, filters.status as never));
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${assetAssignments.assignedDate} >= ${filters.dateFrom}::timestamp`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${assetAssignments.assignedDate} <= ${filters.dateTo}::timestamp`
    );
  }
  if (
    filters.category &&
    filters.category !== 'All categories' &&
    filters.category !== ''
  ) {
    conditions.push(eq(categories.name, filters.category));
  }
  if (filters.assetType && filters.assetType !== 'All Assets') {
    let dbPillar = filters.assetType;
    if (dbPillar === 'Hardware') dbPillar = 'Hardware';
    if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
    if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';
    conditions.push(eq(categories.pillar, dbPillar as never));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const assignedToUser = alias(users, 'assignedToUser');
  const assignedByUser = alias(users, 'assignedByUser');

  const baseQuery = db
    .select({
      id: assetAssignments.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      assignedTo: assignedToUser.name,
      assignedBy: assignedByUser.name,
      assignedDate: assetAssignments.assignedDate,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      state: assetAssignments.state,
      acceptanceStatus: assetAssignments.acceptanceStatus,
      notes: assetAssignments.notes,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      assignedToUser,
      eq(assetAssignments.assignedToUserId, assignedToUser.id)
    )
    .leftJoin(
      assignedByUser,
      eq(assetAssignments.assignedById, assignedByUser.id)
    )
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      assignedToUser,
      eq(assetAssignments.assignedToUserId, assignedToUser.id)
    )
    .leftJoin(
      assignedByUser,
      eq(assetAssignments.assignedById, assignedByUser.id)
    )
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assetAssignments.assignedDate))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.activeAssignments',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const daysSinceAssigned = Math.floor(
      (Date.now() - new Date(row.assignedDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return {
      id: String(row.id),
      'Assignment ID': String(row.id),
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      'Assigned To': row.assignedTo || '-',
      'Assigned By': row.assignedBy || '-',
      'Assigned Date': row.assignedDate
        ? new Date(row.assignedDate).toLocaleDateString()
        : '-',
      'Expected Return Date': row.expectedReturnDate
        ? new Date(row.expectedReturnDate).toLocaleDateString()
        : '-',
      State: formatAssignmentState(row.state),
      'Acceptance Status': row.acceptanceStatus || 'Pending',
      'Days Since Assigned':
        daysSinceAssigned >= 0 ? String(daysSinceAssigned) : '0',
      Notes: row.notes || '-',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
