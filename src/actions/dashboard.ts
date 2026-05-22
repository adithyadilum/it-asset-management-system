'use server';

import { and, count, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assetAssignments,
  assetDisposals,
  assets,
  departments,
  maintenanceTickets,
  models,
  users,
  systemAuditLogs,
} from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';

// ============================================================================
// READ: Overdue Returns Table
// ============================================================================

export interface OverdueReturnRow {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  employeeName: string;
  employeeEmail: string;
  department: string | null;
  expectedReturnDate: string;
  daysOverdue: number;
}

/**
 * Returns all active assignments where the expected_return_date has passed
 * and the asset has not yet been returned.
 *
 * Access: GlobalAdmin, ITOperator
 */
export async function getDashboardOverdueReturns(): Promise<OverdueReturnRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

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
    .orderBy(sql`${assetAssignments.expectedReturnDate}::date ASC`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map((row) => {
    const expectedDate = new Date(row.expectedReturnDate!);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - expectedDate.getTime()) / msPerDay)
    );

    return {
      assignmentId: row.assignmentId,
      assetId: row.assetId,
      assetTag: row.assetTag,
      assetName: row.assetName,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      department: row.department ?? null,
      expectedReturnDate: row.expectedReturnDate!,
      daysOverdue,
    };
  });
}

// ============================================================================
// READ: Pending Disposals Table
// ============================================================================

export interface PendingDisposalRow {
  disposalId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  requestedBy: string;
  requestedByEmail: string;
  daysPending: number;
}

/**
 * Returns all disposal requests with status 'Pending Approval'.
 *
 * Access: GlobalAdmin, FinanceAuditor
 */
export async function getDashboardPendingDisposals(): Promise<PendingDisposalRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor')
    throw new Error('Forbidden');

  const rows = await db
    .select({
      disposalId: assetDisposals.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      requestedBy: users.name,
      requestedByEmail: users.email,
      reason: assetDisposals.reason,
      requestedAt: assetDisposals.requestedAt,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(users, eq(assetDisposals.requestedById, users.id))
    .where(eq(assetDisposals.status, 'Pending Approval'))
    .orderBy(assetDisposals.requestedAt);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;

  return rows.map((row) => ({
    disposalId: row.disposalId,
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    requestedBy: row.requestedBy,
    requestedByEmail: row.requestedByEmail,
    daysPending: Math.max(0, Math.floor((today.getTime() - new Date(row.requestedAt).getTime()) / msPerDay)),
  }));
}

// ============================================================================
// READ: High-Maintenance Assets (Lemons) Table
// ============================================================================

export interface HighMaintenanceRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  currentStatus: string;
  repairCount: number;
  totalDowntimeDays: number;
}

/**
 * Returns assets with 3 or more maintenance tickets.
 * Calculates total downtime from ticket created_at to completion (or now if still active).
 *
 * Access: GlobalAdmin, ITOperator
 */
export async function getDashboardHighMaintenanceAssets(): Promise<HighMaintenanceRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');

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
    .having(sql`COUNT(${maintenanceTickets.id}) >= 3`)
    .orderBy(sql`repair_count DESC`);

  return rows.map((row) => ({
    assetId: row.assetId,
    assetTag: row.assetTag,
    assetName: row.assetName,
    currentStatus: row.currentStatus,
    repairCount: Number(row.repairCount),
    totalDowntimeDays: Number(row.totalDowntimeDays ?? 0),
  }));
}

// ============================================================================
// READ: Recent Activities (Audit Log)
// ============================================================================

export interface RecentActivity {
  id: number;
  text: string;
  actionType: string;
  performedBy: string;
  performedAt: string;
}

function formatActionType(actionType: string): string {
  const act = actionType.toLowerCase().replace(/_/g, ' ');

  if (act.endsWith('ed') || act.endsWith('d')) {
    return act;
  }

  if (act === 'login') return 'logged in';
  if (act === 'logout') return 'logged out';

  if (act.endsWith('e')) {
    return `${act}d`;
  }

  return `${act}ed`;
}

/**
 * Returns the 5 most recent activities from the system audit logs.
 *
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardRecentActivities(): Promise<RecentActivity[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  
  // Fetch top 5 recent logs with user info
  const logs = await db
    .select({
      id: systemAuditLogs.id,
      entityType: systemAuditLogs.entityType,
      entityId: systemAuditLogs.entityId,
      actionType: systemAuditLogs.actionType,
      performedAt: systemAuditLogs.performedAt,
      performedByName: users.name,
    })
    .from(systemAuditLogs)
    .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
    .orderBy(desc(systemAuditLogs.performedAt))
    .limit(5);

  // For simplicity, we'll try to resolve Asset Tags for 'Asset' entities
  const assetIds = logs
    .filter(l => l.entityType === 'Asset')
    .map(l => l.entityId);
    
  const assetMap = new Map<string, string>();
  if (assetIds.length > 0) {
    const assetDetails = await db
      .select({ id: assets.id, assetTag: assets.assetTag })
      .from(assets)
      .where(sql`${assets.id}::text IN ${assetIds}`);
    
    assetDetails.forEach(a => assetMap.set(a.id, a.assetTag));
  }

  return logs.map((log) => {
    const performer = log.performedByName || 'System';
    const entityLabel = assetMap.get(log.entityId) || log.entityId.slice(0, 8);
    
    const actionPhrase = formatActionType(log.actionType);
    let text = `${performer} ${actionPhrase} ${log.entityType.toLowerCase()}`;
    
    // Humanize common patterns
    if (log.entityType === 'Asset') {
      text = `${performer} ${actionPhrase} asset ${entityLabel}`;
    } else if (log.entityType === 'MaintenanceTicket') {
      text = `${performer} updated maintenance for ${entityLabel}`;
    } else if (log.actionType === 'LOGIN') {
      text = `${performer} logged into the system`;
    }

    return {
      id: log.id,
      text,
      actionType: log.actionType,
      performedBy: performer,
      performedAt: log.performedAt.toISOString(),
    };
  });
}

// ============================================================================
// READ: Current Inventory Status Donut Chart
// ============================================================================

export interface InventoryStatusItem {
  name: string;
  value: number;
  color: string;
}

export interface InventoryStatusResponse {
  inventoryData: InventoryStatusItem[];
  utilizationRate: number;
}

/**
 * Returns dynamic inventory distribution counts grouped by status,
 * along with the calculated asset utilization rate.
 *
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardInventoryStatus(): Promise<InventoryStatusResponse> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

  const results = await db
    .select({
      status: assets.status,
      count: count(assets.id),
    })
    .from(assets)
    .where(eq(assets.isArchived, false))
    .groupBy(assets.status);

  const statusColorMap: Record<string, { label: string; color: string }> = {
    'Available': { label: 'New / Available', color: '#2563eb' },
    'Assigned': { label: 'Assigned', color: '#84cc16' },
    'In Repair': { label: 'In Repair', color: '#9333ea' },
    'Defective': { label: 'Defective', color: '#ef4444' },
    'Lost': { label: 'Lost', color: '#f97316' },
    'Retired': { label: 'Retired', color: '#64748b' },
    'Pending Disposal': { label: 'Pending Disposal', color: '#94a3b8' },
    'Disposed': { label: 'Disposed', color: '#e11d48' },
  };

  const dataMap = new Map<string, number>();
  let totalActive = 0;
  let assignedCount = 0;

  results.forEach(r => {
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
      inventoryData.push({
        name: meta.label,
        value: val,
        color: meta.color,
      });
    }
  });

  results.forEach(r => {
    if (!statusColorMap[r.status] && Number(r.count) > 0) {
      const val = Number(r.count);
      inventoryData.push({
        name: r.status,
        value: val,
        color: '#6b7280',
      });
      totalActive += val;
    }
  });

  const utilizationRate = totalActive > 0 ? Math.round((assignedCount / totalActive) * 100) : 0;

  return {
    inventoryData,
    utilizationRate,
  };
}

export interface DepartmentAllocationItem {
  name: string;
  value: number;
}

/**
 * Returns the count of active assigned assets grouped by department name.
 *
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardDepartmentAllocation(): Promise<DepartmentAllocationItem[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');

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
}

