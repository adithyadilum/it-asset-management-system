import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assetAssignments,
  assetDisposals,
  assets,
  categories,
  departments,
  maintenanceTickets,
  models,
  users,
} from '@/db/schema';
import { unstable_cache } from 'next/cache';
import {
  DASHBOARD_CHART_CACHE_TTL,
  DASHBOARD_TABLE_DEFAULT_LIMIT,
  HIGH_MAINTENANCE_TICKET_THRESHOLD,
} from '@/lib/constants/dashboard';
import type {
  OverdueReturnRow,
  PendingDisposalRow,
  HighMaintenanceRow,
  InventoryStatusResponse,
  InventoryStatusItem,
  DepartmentAllocationItem,
  AssetsByCategoryItem,
} from '@/types/dashboard';

export async function getOverdueReturnsInternal(
  limit: number = DASHBOARD_TABLE_DEFAULT_LIMIT
): Promise<OverdueReturnRow[]> {
  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      employeeName: users.name,
      employeeEmail: users.email,
      department: departments.name,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      daysOverdue: sql<number>`(CURRENT_DATE - ${assetAssignments.expectedReturnDate}::date)`.as(
        'days_overdue'
      ),
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(
      and(
        isNull(assetAssignments.returnedDate),
        sql`${assetAssignments.expectedReturnDate}::date < CURRENT_DATE`
      )
    )
    .orderBy(sql`${assetAssignments.expectedReturnDate}::date ASC`)
    .limit(limit);

  return rows.map((row) => ({
    assignmentId: row.assignmentId,
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    employeeName: row.employeeName,
    employeeEmail: row.employeeEmail,
    department: row.department ?? null,
    expectedReturnDate: row.expectedReturnDate!,
    daysOverdue: Math.max(0, Number(row.daysOverdue ?? 0)),
  }));
}

export async function getPendingDisposalsInternal(
  limit: number = DASHBOARD_TABLE_DEFAULT_LIMIT
): Promise<PendingDisposalRow[]> {
  const rows = await db
    .select({
      disposalId: assetDisposals.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      requestedBy: users.name,
      requestedByEmail: users.email,
      daysPending: sql<number>`GREATEST(0, CURRENT_DATE - ${assetDisposals.requestedAt}::date)`.as(
        'days_pending'
      ),
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(users, eq(assetDisposals.requestedById, users.id))
    .where(eq(assetDisposals.status, 'Pending Approval'))
    .orderBy(assetDisposals.requestedAt)
    .limit(limit);

  return rows.map((row) => ({
    disposalId: row.disposalId,
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    requestedBy: row.requestedBy,
    requestedByEmail: row.requestedByEmail,
    daysPending: Number(row.daysPending ?? 0),
  }));
}

export async function getHighMaintenanceAssetsInternal(
  limit: number = DASHBOARD_TABLE_DEFAULT_LIMIT
): Promise<HighMaintenanceRow[]> {
  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      currentStatus: assets.status,
      repairCount: count(maintenanceTickets.id).as('repair_count'),
      totalDowntimeDays: sql<number>`
        CEIL(
          SUM(
            EXTRACT(epoch FROM (
              COALESCE(${maintenanceTickets.actualCompletionDate}, NOW())
              - ${maintenanceTickets.createdAt}
            ))
          ) / 86400
        )
      `.as('total_downtime_days'),
    })
    .from(maintenanceTickets)
    .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .groupBy(assets.id, assets.assetTag, models.name, assets.status)
    .having(
      sql`COUNT(${maintenanceTickets.id}) >= ${HIGH_MAINTENANCE_TICKET_THRESHOLD}`
    )
    .orderBy(sql`repair_count DESC`)
    .limit(limit);

  return rows.map((row) => ({
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    currentStatus: row.currentStatus,
    repairCount: Number(row.repairCount),
    totalDowntimeDays: Number(row.totalDowntimeDays ?? 0),
  }));
}


export const getCachedInventoryStatus = unstable_cache(
  async (): Promise<InventoryStatusResponse> => {
    const results = await db
      .select({
        status: assets.status,
        count: count(assets.id),
      })
      .from(assets)
      .where(eq(assets.isArchived, false))
      .groupBy(assets.status);

    const statusColorMap: Record<string, { label: string; color: string }> = {
      Available: { label: 'New / Available', color: '#2563eb' },
      Assigned: { label: 'Assigned', color: '#84cc16' },
      'In Repair': { label: 'In Repair', color: '#9333ea' },
      Defective: { label: 'Defective', color: '#ef4444' },
      Lost: { label: 'Lost', color: '#f97316' },
      Retired: { label: 'Retired', color: '#64748b' },
      'Pending Disposal': { label: 'Pending Disposal', color: '#94a3b8' },
      Disposed: { label: 'Disposed', color: '#e11d48' },
    };

    const dataMap = new Map<string, number>();
    let totalActive = 0;
    let assignedCount = 0;

    results.forEach((r) => {
      const val = Number(r.count);
      dataMap.set(r.status, val);
      if (r.status !== 'Retired' && r.status !== 'Disposed') {
        totalActive += val;
      }
      if (r.status === 'Assigned') {
        assignedCount = val;
      }
    });

    const inventoryData: InventoryStatusItem[] = [];

    Object.entries(statusColorMap).forEach(([status, meta]) => {
      const val = dataMap.get(status) || 0;
      if (val > 0) {
        inventoryData.push({ name: meta.label, value: val, color: meta.color });
      }
    });

    results.forEach((r) => {
      if (!statusColorMap[r.status] && Number(r.count) > 0) {
        inventoryData.push({
          name: r.status,
          value: Number(r.count),
          color: '#6b7280',
        });
      }
    });

    const utilizationRate =
      totalActive > 0 ? Math.round((assignedCount / totalActive) * 100) : 0;

    return { inventoryData, utilizationRate };
  },
  ['dashboard-inventory-status'],
  { revalidate: DASHBOARD_CHART_CACHE_TTL, tags: ['dashboard-inventory'] }
);

export const getCachedDepartmentAllocation = unstable_cache(
  async (): Promise<DepartmentAllocationItem[]> => {
    const results = await db
      .select({
        name: departments.name,
        value: count(assets.id),
      })
      .from(assets)
      .innerJoin(assetAssignments, eq(assets.id, assetAssignments.assetId))
      .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
      .innerJoin(departments, eq(users.departmentId, departments.id))
      .where(
        and(
          eq(assets.isArchived, false),
          isNull(assetAssignments.returnedDate)
        )
      )
      .groupBy(departments.name);

    return results.map((r) => ({
      name: r.name,
      value: Number(r.value),
    }));
  },
  ['dashboard-department-allocation'],
  { revalidate: DASHBOARD_CHART_CACHE_TTL, tags: ['dashboard-dept-allocation'] }
);

export const getCachedAssetsByCategory = unstable_cache(
  async (): Promise<AssetsByCategoryItem[]> => {
    const results = await db
      .select({
        categoryName: categories.name,
        pillar: categories.pillar,
        count: count(assets.id),
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .where(eq(assets.isArchived, false))
      .groupBy(categories.name, categories.pillar)
      .orderBy(sql`count DESC`);

    return results.map((r) => ({
      categoryName: r.categoryName,
      pillar: r.pillar,
      count: Number(r.count),
    }));
  },
  ['dashboard-assets-by-category'],
  { revalidate: DASHBOARD_CHART_CACHE_TTL, tags: ['dashboard-categories'] }
);

