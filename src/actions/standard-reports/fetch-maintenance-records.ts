import { eq, and, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  maintenanceTickets,
  assets,
  models,
  categories,
  users,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type {
  ReportPreviewFilters,
  ReportPreviewRow,
} from '@/types/standard-reports';

export async function fetchMaintenanceRecords(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (filters.status && filters.status !== 'All statuses') {
    conditions.push(eq(maintenanceTickets.status, filters.status as never));
  }
  if (
    filters.assetType &&
    filters.assetType !== 'All Assets' &&
    filters.assetType !== 'All Types'
  ) {
    conditions.push(
      eq(maintenanceTickets.ticketType, filters.assetType as never)
    );
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${maintenanceTickets.createdAt} >= ${filters.dateFrom}::timestamp`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${maintenanceTickets.createdAt} <= ${filters.dateTo}::timestamp`
    );
  }
  if (
    filters.category &&
    filters.category !== 'All categories' &&
    filters.category !== ''
  ) {
    conditions.push(eq(categories.name, filters.category));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const dispatchedByUser = alias(users, 'dispatchedByUser');

  const baseQuery = db
    .select({
      id: maintenanceTickets.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      ticketType: maintenanceTickets.ticketType,
      vendorName: maintenanceTickets.vendorName,
      rmaNumber: maintenanceTickets.rmaNumber,
      reportedIssue: maintenanceTickets.reportedIssue,
      resolutionNotes: maintenanceTickets.resolutionNotes,
      estimatedCost: maintenanceTickets.estimatedCost,
      actualCost: maintenanceTickets.actualCost,
      estimatedReturnDate: maintenanceTickets.estimatedReturnDate,
      actualCompletionDate: maintenanceTickets.actualCompletionDate,
      status: maintenanceTickets.status,
      dispatchedBy: dispatchedByUser.name,
      createdAt: maintenanceTickets.createdAt,
    })
    .from(maintenanceTickets)
    .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      dispatchedByUser,
      eq(maintenanceTickets.dispatchedById, dispatchedByUser.id)
    )
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintenanceTickets)
    .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      dispatchedByUser,
      eq(maintenanceTickets.dispatchedById, dispatchedByUser.id)
    )
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(maintenanceTickets.createdAt))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.maintenanceRecords',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const costVariance =
      Number(row.actualCost || 0) - Number(row.estimatedCost || 0);
    const duration =
      row.actualCompletionDate && row.createdAt
        ? Math.floor(
            (new Date(row.actualCompletionDate).getTime() -
              new Date(row.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : '-';
    return {
      id: String(row.id),
      'Ticket ID': String(row.id),
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      'Ticket Type': row.ticketType,
      'Vendor Name': row.vendorName || '-',
      'RMA Number': row.rmaNumber || '-',
      'Reported Issue': row.reportedIssue || '-',
      'Resolution Notes': row.resolutionNotes || '-',
      'Estimated Cost': row.estimatedCost ? String(row.estimatedCost) : '-',
      'Actual Cost': row.actualCost ? String(row.actualCost) : '-',
      'Cost Variance': String(costVariance.toFixed(2)),
      'Estimated Return Date': row.estimatedReturnDate
        ? new Date(row.estimatedReturnDate).toLocaleDateString()
        : '-',
      'Completion Date': row.actualCompletionDate
        ? new Date(row.actualCompletionDate).toLocaleDateString()
        : '-',
      'Duration (Days)': String(duration),
      Status: row.status,
      'Dispatched By': row.dispatchedBy || '-',
      'Created At': row.createdAt
        ? new Date(row.createdAt).toLocaleDateString()
        : '-',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
