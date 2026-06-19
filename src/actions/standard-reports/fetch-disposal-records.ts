import { eq, and, sql, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { assetDisposals, assets, models, categories, users } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewFilters, ReportPreviewRow } from '@/types/standard-reports';

export async function fetchDisposalRecords(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (filters.status && filters.status !== 'All statuses') {
    conditions.push(eq(assetDisposals.status, filters.status as never));
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${assetDisposals.requestedAt} >= ${filters.dateFrom}::timestamp`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${assetDisposals.requestedAt} <= ${filters.dateTo}::timestamp`
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

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;
  const requestedByUser = alias(users, 'requestedByUser');
  const approvedByUser = alias(users, 'approvedByUser');

  const baseQuery = db
    .select({
      id: assetDisposals.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      requestedBy: requestedByUser.name,
      approvedBy: approvedByUser.name,
      status: assetDisposals.status,
      reason: assetDisposals.reason,
      justification: assetDisposals.justification,
      disposalMethod: assetDisposals.disposalMethod,
      dataWiped: assetDisposals.dataWiped,
      tagsRemoved: assetDisposals.tagsRemoved,
      salvageValue: assetDisposals.actualSalvageValue,
      bookValue: assetDisposals.bookValueAtDisposal,
      requestedAt: assetDisposals.requestedAt,
      resolvedAt: assetDisposals.resolvedAt,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      requestedByUser,
      eq(assetDisposals.requestedById, requestedByUser.id)
    )
    .leftJoin(
      approvedByUser,
      eq(assetDisposals.approvedById, approvedByUser.id)
    )
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(
      requestedByUser,
      eq(assetDisposals.requestedById, requestedByUser.id)
    )
    .leftJoin(
      approvedByUser,
      eq(assetDisposals.approvedById, approvedByUser.id)
    )
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(assetDisposals.requestedAt))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.disposalRecords',
    startTime: queryTimer,
  });

  const data: ReportPreviewRow[] = rows.map((row) => {
    const gainLoss =
      Number(row.salvageValue || 0) - Number(row.bookValue || 0);
    const procTime =
      row.resolvedAt && row.requestedAt
        ? Math.floor(
            (new Date(row.resolvedAt).getTime() -
              new Date(row.requestedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : '-';
    return {
      id: String(row.id),
      'Disposal ID': String(row.id),
      'Asset Tag': row.assetTag,
      'Asset Name': row.assetName || '-',
      'Requested By': row.requestedBy || '-',
      'Approved By': row.approvedBy || '-',
      Status: row.status,
      Reason: row.reason,
      Justification: row.justification || '-',
      'Disposal Method': row.disposalMethod || '-',
      'Data Wiped': row.dataWiped ? 'Yes' : 'No',
      'Tags Removed': row.tagsRemoved ? 'Yes' : 'No',
      'Salvage Value': row.salvageValue ? String(row.salvageValue) : '0',
      'Book Value': row.bookValue ? String(row.bookValue) : '0',
      'Gain/Loss': String(gainLoss.toFixed(2)),
      'Requested At': row.requestedAt
        ? new Date(row.requestedAt).toLocaleDateString()
        : '-',
      'Resolved At': row.resolvedAt
        ? new Date(row.resolvedAt).toLocaleDateString()
        : '-',
      'Processing Time (Days)': String(procTime),
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
