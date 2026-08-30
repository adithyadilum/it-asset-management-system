import { eq, and, isNotNull, sql, desc } from 'drizzle-orm';
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

export async function fetchReturnHistory(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [isNotNull(assetAssignments.returnedDate)];

  if (
    filters.status &&
    filters.status !== 'All statuses' &&
    filters.status !== 'All Conditions'
  ) {
    conditions.push(
      eq(assetAssignments.returnCondition, filters.status as never)
    );
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${assetAssignments.returnedDate} >= ${filters.dateFrom}::timestamp`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${assetAssignments.returnedDate} <= ${filters.dateTo}::timestamp`
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

  const baseQuery = db
    .select({
      id: assetAssignments.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      assignedTo: assignedToUser.name,
      assignedDate: assetAssignments.assignedDate,
      returnedDate: assetAssignments.returnedDate,
      returnCondition: assetAssignments.returnCondition,
      state: assetAssignments.state,
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
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assetAssignments.returnedDate))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.returnHistory',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const duration =
      row.returnedDate && row.assignedDate
        ? Math.floor(
            (new Date(row.returnedDate).getTime() -
              new Date(row.assignedDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
    return {
      id: String(row.id),
      'Return ID': String(row.id),
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      'Assigned To': row.assignedTo || '-',
      'Returned By': row.assignedTo || '-',
      'Assigned Date': row.assignedDate
        ? new Date(row.assignedDate).toLocaleDateString()
        : '-',
      'Returned Date': row.returnedDate
        ? new Date(row.returnedDate).toLocaleDateString()
        : '-',
      'Duration (Days)': String(duration >= 0 ? duration : 0),
      'Return Condition': row.returnCondition || '-',
      State: formatAssignmentState(row.state),
      Notes: row.notes || '-',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
