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
} from '@/db/schema';
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
