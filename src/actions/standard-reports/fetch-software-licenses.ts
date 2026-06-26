import { eq, and, isNull, inArray, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import { softwareLicenses, softwareAllocations, models, brands } from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewFilters, ReportPreviewRow } from '@/types/standard-reports';

export async function fetchSoftwareLicenses(
  filters: ReportPreviewFilters,
  pageSize: number,
  offset: number
): Promise<{ data: ReportPreviewRow[]; totalRows: number; pageCount: number }> {
  const queryTimer = startLatencyTimer();
  const conditions = [];

  if (
    filters.status &&
    filters.status !== 'All statuses' &&
    filters.status !== 'All Types'
  ) {
    conditions.push(
      eq(softwareLicenses.licenseType, filters.status as never)
    );
  }
  if (filters.dateFrom) {
    conditions.push(
      sql`${softwareLicenses.expiryDate} >= ${filters.dateFrom}`
    );
  }
  if (filters.dateTo) {
    conditions.push(
      sql`${softwareLicenses.expiryDate} <= ${filters.dateTo}`
    );
  }

  const whereCondition =
    conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: softwareLicenses.id,
      softwareName: models.name,
      publisher: brands.name,
      licenseKey: softwareLicenses.licenseKey,
      licenseType: softwareLicenses.licenseType,
      totalSeats: softwareLicenses.totalSeats,
      startDate: softwareLicenses.startDate,
      expiryDate: softwareLicenses.expiryDate,
      isActive: softwareLicenses.isActive,
    })
    .from(softwareLicenses)
    .innerJoin(models, eq(softwareLicenses.modelId, models.id))
    .leftJoin(brands, eq(models.brandId, brands.id))
    .where(whereCondition);

  const totalRowsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(softwareLicenses)
    .innerJoin(models, eq(softwareLicenses.modelId, models.id))
    .leftJoin(brands, eq(models.brandId, brands.id))
    .where(whereCondition);

  const totalRows = Number(totalRowsCount[0]?.count || 0);

  const rows = await baseQuery
    .orderBy(desc(softwareLicenses.createdAt))
    .limit(pageSize)
    .offset(offset);

  logLatency({
    scope: 'DB ACTION',
    label: 'standardReports.fetchReportPreview.softwareLicenses',
    startTime: queryTimer,
  });

  const licenseIds = rows.map((r) => r.id);
  const usedSeatsMap = new Map<string, number>();
  if (licenseIds.length > 0) {
    const allocations = await db
      .select({
        licenseId: softwareAllocations.licenseId,
        count: sql<number>`count(*)::int`,
      })
      .from(softwareAllocations)
      .where(
        and(
          inArray(softwareAllocations.licenseId, licenseIds),
          isNull(softwareAllocations.revokedAt)
        )
      )
      .groupBy(softwareAllocations.licenseId);

    for (const alloc of allocations) {
      usedSeatsMap.set(alloc.licenseId, alloc.count);
    }
  }

  const data: ReportPreviewRow[] = rows.map((row) => {
    const used = usedSeatsMap.get(row.id) || 0;
    const total = row.totalSeats;
    const available = Math.max(0, total - used);
    const utilization = total > 0 ? (used / total) * 100 : 0;
    const daysUntilExpiry = row.expiryDate
      ? Math.floor(
          (new Date(row.expiryDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : -1;

    return {
      id: row.id,
      'License ID': 'LIC-' + row.id.substring(0, 8).toUpperCase(),
      'Software Name': row.softwareName || '-',
      Publisher: row.publisher || '-',
      'License Key': row.licenseKey || '-',
      'License Type': row.licenseType,
      'Total Seats': String(total),
      'Used Seats': String(used),
      'Available Seats': String(available),
      'Utilization %': utilization.toFixed(1) + '%',
      'Start Date': row.startDate
        ? new Date(row.startDate).toLocaleDateString()
        : '-',
      'Expiry Date': row.expiryDate
        ? new Date(row.expiryDate).toLocaleDateString()
        : '-',
      'Days Until Expiry':
        daysUntilExpiry >= 0 ? String(daysUntilExpiry) : 'Expired/Unknown',
      Status: row.isActive ? 'Active' : 'Inactive',
    };
  });

  return {
    data,
    totalRows,
    pageCount: Math.ceil(totalRows / pageSize),
  };
}
