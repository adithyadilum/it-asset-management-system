'use server';

import { and, count, eq, isNull, sql, inArray, ne } from 'drizzle-orm';

import { db } from '@/db';
import {
  assetAssignments,
  assetDisposals,
  assets,
  categories,
  departments,
  locations,
  maintenanceTickets,
  models,
  users,
  systemAuditLogs,
  assetPurchases,
  softwareLicenses,
  softwareAllocations,
} from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { AuthenticatedUser } from '@/actions/auth';
import { getAuthenticatedUser } from '@/actions/auth';
import { unstable_cache } from 'next/cache';
import { getDepreciationLedger, getWriteOffsLedger } from '@/actions/financials';
import { calculateStraightLineDepreciation } from '@/lib/financial-math';
import {
  DEFAULT_SOFTWARE_SEAT_COST,
  DEFAULT_USEFUL_LIFE_MONTHS,
  DASHBOARD_KPI_CACHE_TTL,
  DASHBOARD_CHART_CACHE_TTL,
  DASHBOARD_TABLE_DEFAULT_LIMIT,
  DASHBOARD_RECENT_ACTIVITIES_LIMIT,
  HIGH_MAINTENANCE_TICKET_THRESHOLD,
  FLEET_HEALTH_WEIGHTS,
} from '@/lib/constants/dashboard';

// ============================================================================
// HELPER: Role Guards
// ============================================================================

function assertAdminOrOperator(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');
}

function assertAdminOrAuditor(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor')
    throw new Error('Forbidden');
}

function assertNotEmployee(user: AuthenticatedUser) {
  if (user.role === 'Employee') throw new Error('Forbidden');
}

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
 * Internal: Fetches overdue returns without re-authenticating.
 */
async function _getOverdueReturnsInternal(
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

/**
 * Returns all active assignments where the expected_return_date has passed.
 * Access: GlobalAdmin, ITOperator
 */
export async function getDashboardOverdueReturns(
  limit?: number
): Promise<OverdueReturnRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrOperator(user);
  return _getOverdueReturnsInternal(limit);
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
 * Internal: Fetches pending disposals without re-authenticating.
 */
async function _getPendingDisposalsInternal(
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

/**
 * Returns all disposal requests with status 'Pending Approval'.
 * Access: GlobalAdmin, FinanceAuditor
 */
export async function getDashboardPendingDisposals(
  limit?: number
): Promise<PendingDisposalRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrAuditor(user);
  return _getPendingDisposalsInternal(limit);
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
 * Internal: Fetches high-maintenance assets without re-authenticating.
 */
async function _getHighMaintenanceAssetsInternal(
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

/**
 * Returns assets with 3+ maintenance tickets.
 * Access: GlobalAdmin, ITOperator
 */
export async function getDashboardHighMaintenanceAssets(
  limit?: number
): Promise<HighMaintenanceRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrOperator(user);
  return _getHighMaintenanceAssetsInternal(limit);
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

  if (act.endsWith('ed') || act.endsWith('d')) return act;
  if (act === 'login') return 'logged in';
  if (act === 'logout') return 'logged out';
  if (act.endsWith('e')) return `${act}d`;
  return `${act}ed`;
}

/**
 * Internal: Fetches recent activities without re-authenticating.
 */
async function _getRecentActivitiesInternal(): Promise<RecentActivity[]> {
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
    .limit(DASHBOARD_RECENT_ACTIVITIES_LIMIT);

  // Resolve Asset Tags for 'Asset' entities
  const assetIds = logs
    .filter((l) => l.entityType === 'Asset')
    .map((l) => l.entityId);

  const assetMap = new Map<string, string>();
  if (assetIds.length > 0) {
    const assetDetails = await db
      .select({ id: assets.id, assetTag: assets.assetTag })
      .from(assets)
      .where(inArray(assets.id, assetIds));

    assetDetails.forEach((a) => assetMap.set(a.id, a.assetTag));
  }

  return logs.map((log) => {
    const performer = log.performedByName || 'System';
    const entityLabel =
      assetMap.get(log.entityId) || log.entityId.slice(0, 8);

    const actionPhrase = formatActionType(log.actionType);
    let text = `${performer} ${actionPhrase} ${log.entityType.toLowerCase()}`;

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

/**
 * Returns the 5 most recent activities from the system audit logs.
 * Access: GlobalAdmin, FinanceAuditor
 */
export async function getDashboardRecentActivities(): Promise<
  RecentActivity[]
> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrAuditor(user);
  return _getRecentActivitiesInternal();
}

// ============================================================================
// READ: Top High-Value Assets Table
// ============================================================================

export interface TopHighValueAssetRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  location: string;
  originalCost: string | null;
  currentBookValue: string | null;
}

export async function getDashboardTopHighValueAssets(): Promise<TopHighValueAssetRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrAuditor(user);

  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      locationName: locations.name,
      totalCost: assetPurchases.totalCost,
      purchaseDate: assetPurchases.purchaseDate,
      usefulLifeMonths: assets.usefulLifeMonths,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(eq(assets.isArchived, false))
    .orderBy(desc(assetPurchases.totalCost))
    .limit(10);

  return rows.map((r) => {
    const cost = parseFloat(r.totalCost?.toString() || '0');
    const lifeMonths = r.usefulLifeMonths || 60;
    const bookValue = calculateStraightLineDepreciation(cost, lifeMonths, r.purchaseDate);

    return {
      assetId: r.assetId,
      assetTag: r.assetTag,
      assetName: r.assetName || 'Unknown Asset',
      location: r.locationName || 'Unassigned',
      originalCost: cost > 0 ? `$${cost.toLocaleString()}` : null,
      currentBookValue: bookValue > 0 ? `$${bookValue.toLocaleString()}` : null,
    };
  });
}

// ============================================================================
// READ: Software Seat Cost Optimization Table
// ============================================================================

export interface SoftwareOptimizationRow {
  id: string;
  productName: string;
  totalSeats: number;
  assignedSeats: number;
  idleSeats: number;
  costPerSeat: number;
  monthlyLeak: number;
}

export async function getDashboardSoftwareOptimization(): Promise<SoftwareOptimizationRow[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertAdminOrAuditor(user);

  // Get active software licenses and their models
  const licenses = await db
    .select({
      id: softwareLicenses.id,
      totalSeats: softwareLicenses.totalSeats,
      assetId: softwareLicenses.assetId,
      modelName: models.name,
    })
    .from(softwareLicenses)
    .innerJoin(models, eq(softwareLicenses.modelId, models.id))
    .where(eq(softwareLicenses.isActive, true));

  // Get allocations
  const allocations = await db
    .select({
      licenseId: softwareAllocations.licenseId,
      count: count(),
    })
    .from(softwareAllocations)
    .where(isNull(softwareAllocations.revokedAt))
    .groupBy(softwareAllocations.licenseId);

  const allocMap = new Map(allocations.map((a) => [a.licenseId, a.count]));

  // Fetch purchases for seat cost calculations
  const softwareAssetIds = licenses
    .map((l) => l.assetId)
    .filter(Boolean) as string[];
  let softwarePurchasesMap = new Map<string, number>();

  if (softwareAssetIds.length > 0) {
    const purchases = await db
      .select({
        assetId: assetPurchases.assetId,
        totalCost: assetPurchases.totalCost,
      })
      .from(assetPurchases)
      .where(inArray(assetPurchases.assetId, softwareAssetIds));

    softwarePurchasesMap = new Map(
      purchases.map((p) => [
        p.assetId,
        parseFloat(p.totalCost?.toString() || '0'),
      ])
    );
  }

  return licenses.map((lic) => {
    const assigned = allocMap.get(lic.id) || 0;
    const idle = Math.max(0, lic.totalSeats - assigned);
    const licenseCost = lic.assetId
      ? softwarePurchasesMap.get(lic.assetId) || 0
      : 0;
    const costPerSeat =
      lic.totalSeats > 0 ? licenseCost / lic.totalSeats : DEFAULT_SOFTWARE_SEAT_COST;
    const monthlyLeak = idle * costPerSeat;

    return {
      id: lic.id,
      productName: lic.modelName || 'Unknown License',
      totalSeats: lic.totalSeats,
      assignedSeats: assigned,
      idleSeats: idle,
      costPerSeat,
      monthlyLeak,
    };
  });
}

// ============================================================================
// READ: Current Inventory Status Donut Chart (Cached)
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

const getCachedInventoryStatus = unstable_cache(
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

    // Include any unknown statuses
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

/**
 * Returns dynamic inventory distribution counts grouped by status.
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardInventoryStatus(): Promise<InventoryStatusResponse> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertNotEmployee(user);
  return getCachedInventoryStatus();
}

// ============================================================================
// READ: Department Allocation Bar Chart (Cached)
// ============================================================================

export interface DepartmentAllocationItem {
  name: string;
  value: number;
}

const getCachedDepartmentAllocation = unstable_cache(
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

/**
 * Returns the count of active assigned assets grouped by department.
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardDepartmentAllocation(): Promise<
  DepartmentAllocationItem[]
> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertNotEmployee(user);
  return getCachedDepartmentAllocation();
}

// ============================================================================
// READ: Assets by Category (NEW — Cached)
// ============================================================================

export interface AssetsByCategoryItem {
  categoryName: string;
  pillar: string;
  count: number;
}

const getCachedAssetsByCategory = unstable_cache(
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

/**
 * Returns asset counts grouped by category.
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardAssetsByCategory(): Promise<
  AssetsByCategoryItem[]
> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertNotEmployee(user);
  return getCachedAssetsByCategory();
}

// ============================================================================
// READ: KPI Metrics (Cached — all heavy queries parallelized)
// ============================================================================

export interface DashboardKpiMetrics {
  // Hero KPIs
  totalActiveAssets: number;
  totalActiveAssetsChange: number;
  totalAssetValue?: number;
  totalAssetValueTrend?: number;
  netBookValue?: number;
  fleetHealthScore: number;
  fleetHealthLabel: string;

  // Secondary KPIs
  inactiveSoftwareSeats: number;
  inactiveSoftwareCostLeak?: number;
  warrantyExpiries30Days: number;
  cumulativeRepairSpend?: number;
  repairSpendTrend?: number;
  softwareRenewals30Days: number;
  impactedSoftwareEmployees: number;
}

function getFleetHealthLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

/**
 * Internal cached helper that runs all KPI queries in parallel.
 */
const getCachedDashboardKpiMetrics = unstable_cache(
  async (): Promise<DashboardKpiMetrics> => {
    // ── Run all independent queries in parallel ────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      // 1. Total active assets + MTD change
      totalAssetsRes,
      assetsCreatedThisMonthRes,
      // 2. Total asset value (current + 30-day-ago for trend)
      totalValueRes,
      totalValuePrevRes,
      // 3. Net Book Value (SQL-side depreciation)
      nbvRes,
      // 4. Software seats & allocations
      licensesRes,
      allocationsCountRes,
      // 5. Warranty expiries (30 days)
      warrantyExpiryRes,
      // 6. Cumulative repair spend (current + previous month)
      repairSpendCurrentRes,
      repairSpendPrevRes,
      // 7. Software renewals
      expiringLicensesRes,
      // 8. Fleet health components
      totalAssignedRes,
      overdueCountRes,
      highRepairCountRes,
      warrantyCoverageRes,
      totalSoftwareSeatsRes,
      allocatedSoftwareSeatsRes,
    ] = await Promise.all([
      // 1a. Total active (non-archived, non-disposed) assets
      db
        .select({ count: count() })
        .from(assets)
        .where(and(eq(assets.isArchived, false), ne(assets.status, 'Disposed'))),

      // 1b. Assets created this month (MTD change)
      db
        .select({ count: count() })
        .from(assets)
        .where(
          and(
            eq(assets.isArchived, false),
            sql`${assets.createdAt} >= DATE_TRUNC('month', CURRENT_DATE)`
          )
        ),

      // 2a. Total asset value (current) — exchange-rate adjusted
      db
        .select({
          sum: sql<string | null>`SUM(${assetPurchases.totalCost} * COALESCE(${assetPurchases.exchangeRate}, 1))`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(eq(assets.isArchived, false)),

      // 2b. Total asset value 30 days ago — exchange-rate adjusted
      db
        .select({
          sum: sql<string | null>`SUM(${assetPurchases.totalCost} * COALESCE(${assetPurchases.exchangeRate}, 1))`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(
            eq(assets.isArchived, false),
            sql`${assets.createdAt} < ${thirtyDaysAgo.toISOString()}::timestamp`
          )
        ),

      // 3. Net Book Value via SQL (straight-line depreciation, exchange-rate adjusted)
      db
        .select({
          nbv: sql<string | null>`
            SUM(
              GREATEST(0,
                (${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}, 1)) - (
                  (${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}, 1))
                  / GREATEST(1, COALESCE(${assets.usefulLifeMonths}, ${DEFAULT_USEFUL_LIFE_MONTHS}))
                  * GREATEST(0,
                    EXTRACT(YEAR FROM AGE(NOW(), ${assetPurchases.purchaseDate}::timestamp)) * 12
                    + EXTRACT(MONTH FROM AGE(NOW(), ${assetPurchases.purchaseDate}::timestamp))
                  )
                )
              )
            )
          `,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(eq(assets.isArchived, false), ne(assets.status, 'Disposed'))
        ),

      // 4a. Active software licenses
      db
        .select({
          id: softwareLicenses.id,
          totalSeats: softwareLicenses.totalSeats,
          assetId: softwareLicenses.assetId,
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.isActive, true)),

      // 4b. Allocation counts per license
      db
        .select({
          licenseId: softwareAllocations.licenseId,
          count: count(),
        })
        .from(softwareAllocations)
        .where(isNull(softwareAllocations.revokedAt))
        .groupBy(softwareAllocations.licenseId),

      // 5. Warranty expiries (next 30 days)
      db
        .select({ count: count() })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(
            eq(assets.isArchived, false),
            ne(assets.status, 'Disposed'),
            sql`${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE`,
            sql`${assetPurchases.warrantyExpiry}::date <= CURRENT_DATE + INTERVAL '30 days'`
          )
        ),

      // 6a. Repair spend this month
      db
        .select({
          sum: sql<string | null>`SUM(${maintenanceTickets.actualCost})`,
        })
        .from(maintenanceTickets)
        .where(
          and(
            eq(maintenanceTickets.status, 'COMPLETED'),
            sql`${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE)`
          )
        ),

      // 6b. Repair spend previous month
      db
        .select({
          sum: sql<string | null>`SUM(${maintenanceTickets.actualCost})`,
        })
        .from(maintenanceTickets)
        .where(
          and(
            eq(maintenanceTickets.status, 'COMPLETED'),
            sql`${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'`,
            sql`${maintenanceTickets.actualCompletionDate} < DATE_TRUNC('month', CURRENT_DATE)`
          )
        ),

      // 7. Software renewals (next 30 days)
      db
        .select({ id: softwareLicenses.id })
        .from(softwareLicenses)
        .where(
          and(
            eq(softwareLicenses.isActive, true),
            sql`${softwareLicenses.expiryDate}::date >= CURRENT_DATE`,
            sql`${softwareLicenses.expiryDate}::date <= CURRENT_DATE + INTERVAL '30 days'`
          )
        ),

      // 8a. Total assigned assets (for fleet health - utilization)
      db
        .select({ count: count() })
        .from(assets)
        .where(
          and(
            eq(assets.isArchived, false),
            eq(assets.status, 'Assigned')
          )
        ),

      // 8b. Overdue count (for fleet health)
      db
        .select({ count: count() })
        .from(assetAssignments)
        .where(
          and(
            isNull(assetAssignments.returnedDate),
            sql`${assetAssignments.expectedReturnDate}::date < CURRENT_DATE`
          )
        ),

      // 8c. High-repair assets count (for fleet health)
      db
        .select({ count: count() })
        .from(
          db
            .select({ assetId: maintenanceTickets.assetId })
            .from(maintenanceTickets)
            .groupBy(maintenanceTickets.assetId)
            .having(sql`COUNT(*) >= ${HIGH_MAINTENANCE_TICKET_THRESHOLD}`)
            .as('high_repair_assets')
        ),

      // 8d. Warranty coverage (assets with active warranty)
      db
        .select({ count: count() })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(
            eq(assets.isArchived, false),
            ne(assets.status, 'Disposed'),
            sql`${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE`
          )
        ),

      // 8e. Total software seats
      db
        .select({
          sum: sql<string | null>`SUM(${softwareLicenses.totalSeats})`,
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.isActive, true)),

      // 8f. Allocated software seats
      db
        .select({ count: count() })
        .from(softwareAllocations)
        .where(isNull(softwareAllocations.revokedAt)),
    ]);

    // ── Compute derived values ────────────────────────────────────────

    const totalActiveAssets = totalAssetsRes[0]?.count || 0;
    const totalActiveAssetsChange = assetsCreatedThisMonthRes[0]?.count || 0;

    const totalAssetValue = parseFloat(totalValueRes[0]?.sum || '0');
    const totalAssetValuePrev = parseFloat(totalValuePrevRes[0]?.sum || '0');
    const totalAssetValueTrend =
      totalAssetValuePrev > 0
        ? Math.round(
            ((totalAssetValue - totalAssetValuePrev) / totalAssetValuePrev) *
              1000
          ) / 10
        : 0;

    const netBookValue = parseFloat(nbvRes[0]?.nbv || '0');

    // ── Software seats ────────────────────────────────────────────────

    const licenses = licensesRes;
    const allocMap = new Map(
      allocationsCountRes.map((a) => [a.licenseId, a.count])
    );

    // Fetch software purchase costs for per-seat pricing
    const softwareAssetIds = licenses
      .map((l) => l.assetId)
      .filter(Boolean) as string[];
    let softwarePurchasesMap = new Map<string, number>();

    if (softwareAssetIds.length > 0) {
      const purchases = await db
        .select({
          assetId: assetPurchases.assetId,
          totalCost: assetPurchases.totalCost,
        })
        .from(assetPurchases)
        .where(inArray(assetPurchases.assetId, softwareAssetIds));

      softwarePurchasesMap = new Map(
        purchases.map((p) => [
          p.assetId,
          parseFloat(p.totalCost?.toString() || '0'),
        ])
      );
    }

    let inactiveSoftwareSeats = 0;
    let inactiveSoftwareCostLeak = 0;

    licenses.forEach((lic) => {
      const allocated = allocMap.get(lic.id) || 0;
      const inactive = Math.max(0, lic.totalSeats - allocated);
      inactiveSoftwareSeats += inactive;

      const licenseCost = lic.assetId
        ? softwarePurchasesMap.get(lic.assetId) || 0
        : 0;
      const costPerSeat =
        lic.totalSeats > 0 ? licenseCost / lic.totalSeats : 0;
      const activeCostPerSeat =
        costPerSeat > 0 ? costPerSeat : DEFAULT_SOFTWARE_SEAT_COST;
      inactiveSoftwareCostLeak += inactive * activeCostPerSeat;
    });

    // ── Warranty & Repairs ────────────────────────────────────────────

    const warrantyExpiries30Days = warrantyExpiryRes[0]?.count || 0;

    // Cumulative repair spend (all time)
    const allTimeRepairRes = await db
      .select({
        sum: sql<string | null>`SUM(${maintenanceTickets.actualCost})`,
      })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, 'COMPLETED'));
    const cumulativeRepairSpend = parseFloat(allTimeRepairRes[0]?.sum || '0');

    const repairThisMonth = parseFloat(repairSpendCurrentRes[0]?.sum || '0');
    const repairLastMonth = parseFloat(repairSpendPrevRes[0]?.sum || '0');
    const repairSpendTrend =
      repairLastMonth > 0
        ? Math.round(
            ((repairThisMonth - repairLastMonth) / repairLastMonth) * 1000
          ) / 10
        : 0;

    // ── Software Renewals ─────────────────────────────────────────────

    const softwareRenewals30Days = expiringLicensesRes.length;

    let impactedSoftwareEmployees = 0;
    if (expiringLicensesRes.length > 0) {
      const licenseIds = expiringLicensesRes.map((l) => l.id);
      const impactedRes = await db
        .select({ count: count() })
        .from(softwareAllocations)
        .where(
          and(
            inArray(softwareAllocations.licenseId, licenseIds),
            isNull(softwareAllocations.revokedAt)
          )
        );
      impactedSoftwareEmployees = impactedRes[0]?.count || 0;
    }

    // ── Fleet Health Score ─────────────────────────────────────────────

    const assignedCountHealth = totalAssignedRes[0]?.count || 0;
    const overdueCountHealth = overdueCountRes[0]?.count || 0;
    const highRepairCount = highRepairCountRes[0]?.count || 0;
    const warrantyCovered = warrantyCoverageRes[0]?.count || 0;
    const totalSWSeats = parseFloat(totalSoftwareSeatsRes[0]?.sum || '0');
    const allocatedSWSeats = allocatedSoftwareSeatsRes[0]?.count || 0;

    const utilizationRate =
      totalActiveAssets > 0 ? assignedCountHealth / totalActiveAssets : 0;
    const overdueRate =
      assignedCountHealth > 0
        ? 1 - overdueCountHealth / assignedCountHealth
        : 1;
    const repairRate =
      totalActiveAssets > 0
        ? 1 - highRepairCount / totalActiveAssets
        : 1;
    const warrantyRate =
      totalActiveAssets > 0 ? warrantyCovered / totalActiveAssets : 0;
    const softwareRate =
      totalSWSeats > 0 ? allocatedSWSeats / totalSWSeats : 1;

    const fleetHealthScore = Math.round(
      (FLEET_HEALTH_WEIGHTS.utilization * Math.min(1, utilizationRate) +
        FLEET_HEALTH_WEIGHTS.overdue * Math.max(0, overdueRate) +
        FLEET_HEALTH_WEIGHTS.repairs * Math.max(0, repairRate) +
        FLEET_HEALTH_WEIGHTS.warranty * Math.min(1, warrantyRate) +
        FLEET_HEALTH_WEIGHTS.software * Math.min(1, softwareRate)) *
        100
    );

    return {
      totalActiveAssets,
      totalActiveAssetsChange,
      totalAssetValue,
      totalAssetValueTrend,
      netBookValue,
      fleetHealthScore,
      fleetHealthLabel: getFleetHealthLabel(fleetHealthScore),
      inactiveSoftwareSeats,
      inactiveSoftwareCostLeak,
      warrantyExpiries30Days,
      cumulativeRepairSpend,
      repairSpendTrend,
      softwareRenewals30Days,
      impactedSoftwareEmployees,
    };
  },
  ['dashboard-kpis'],
  {
    revalidate: DASHBOARD_KPI_CACHE_TTL,
    tags: ['dashboard-kpis'],
  }
);

/**
 * Returns aggregated KPI metrics for the dashboard widgets.
 * Role-filtered: ITOperator doesn't see financial values.
 *
 * Access: GlobalAdmin, ITOperator, FinanceAuditor
 */
export async function getDashboardKpiMetrics(): Promise<DashboardKpiMetrics> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertNotEmployee(user);

  const metrics = await getCachedDashboardKpiMetrics();

  if (user.role === 'ITOperator') {
    return {
      totalActiveAssets: metrics.totalActiveAssets,
      totalActiveAssetsChange: metrics.totalActiveAssetsChange,
      fleetHealthScore: metrics.fleetHealthScore,
      fleetHealthLabel: metrics.fleetHealthLabel,
      inactiveSoftwareSeats: metrics.inactiveSoftwareSeats,
      warrantyExpiries30Days: metrics.warrantyExpiries30Days,
      softwareRenewals30Days: metrics.softwareRenewals30Days,
      impactedSoftwareEmployees: metrics.impactedSoftwareEmployees,
    };
  }

  return metrics;
}

// ============================================================================
// BATCH: Fetch all dashboard data in a single page call
// ============================================================================

export interface DashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  pendingDisposals: PendingDisposalRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
  recentActivities: RecentActivity[];
  topHighValueAssets: TopHighValueAssetRow[];
  depreciationLedger?: any[];
  writeOffsLedger?: any[];
  softwareOptimization?: SoftwareOptimizationRow[];
}

/**
 * Fetches all dashboard data in a single call, performing auth once
 * and running all queries in parallel.
 *
 * Each data source is resilient — if one fails, others still return.
 */
export async function getDashboardBatchData(): Promise<DashboardBatchData> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  assertNotEmployee(user);

  const canSeeOverdue =
    user.role === 'GlobalAdmin' || user.role === 'ITOperator';
  const canSeePending =
    user.role === 'GlobalAdmin' || user.role === 'FinanceAuditor';
  const canSeeHighMaintenance =
    user.role === 'GlobalAdmin' || user.role === 'ITOperator';
  const canSeeRecentActivities =
    user.role === 'GlobalAdmin' || user.role === 'FinanceAuditor';
  const canSeeTopAssets =
    user.role === 'GlobalAdmin' || user.role === 'FinanceAuditor';

  const results = await Promise.allSettled([
    getCachedDashboardKpiMetrics(),
    getCachedInventoryStatus(),
    getCachedDepartmentAllocation(),
    canSeeOverdue
      ? _getOverdueReturnsInternal()
      : Promise.resolve([] as OverdueReturnRow[]),
    canSeePending
      ? _getPendingDisposalsInternal()
      : Promise.resolve([] as PendingDisposalRow[]),
    canSeeHighMaintenance
      ? _getHighMaintenanceAssetsInternal()
      : Promise.resolve([] as HighMaintenanceRow[]),
    canSeeRecentActivities
      ? _getRecentActivitiesInternal()
      : Promise.resolve([] as RecentActivity[]),
    canSeeTopAssets
      ? getDashboardTopHighValueAssets()
      : Promise.resolve([] as TopHighValueAssetRow[]),
    canSeeTopAssets
      ? getDepreciationLedger({ pageSize: 5 }).then((res) => res.data)
      : Promise.resolve([] as any[]),
    canSeeTopAssets
      ? getWriteOffsLedger({ pageSize: 5 }).then((res) => res.data)
      : Promise.resolve([] as any[]),
    canSeeTopAssets
      ? getDashboardSoftwareOptimization()
      : Promise.resolve([] as SoftwareOptimizationRow[]),
  ]);

  // Extract values with fallbacks for any failed queries
  const kpiMetrics: DashboardKpiMetrics =
    results[0].status === 'fulfilled'
      ? results[0].value
      : {
          totalActiveAssets: 0,
          totalActiveAssetsChange: 0,
          fleetHealthScore: 0,
          fleetHealthLabel: 'Unknown',
          inactiveSoftwareSeats: 0,
          warrantyExpiries30Days: 0,
          softwareRenewals30Days: 0,
          impactedSoftwareEmployees: 0,
        };

  // Role-filter KPI metrics for ITOperator
  const filteredKpiMetrics: DashboardKpiMetrics =
    user.role === 'ITOperator'
      ? {
          totalActiveAssets: kpiMetrics.totalActiveAssets,
          totalActiveAssetsChange: kpiMetrics.totalActiveAssetsChange,
          fleetHealthScore: kpiMetrics.fleetHealthScore,
          fleetHealthLabel: kpiMetrics.fleetHealthLabel,
          inactiveSoftwareSeats: kpiMetrics.inactiveSoftwareSeats,
          warrantyExpiries30Days: kpiMetrics.warrantyExpiries30Days,
          softwareRenewals30Days: kpiMetrics.softwareRenewals30Days,
          impactedSoftwareEmployees: kpiMetrics.impactedSoftwareEmployees,
        }
      : kpiMetrics;

  return {
    kpiMetrics: filteredKpiMetrics,
    inventoryStatus:
      results[1].status === 'fulfilled'
        ? results[1].value
        : { inventoryData: [], utilizationRate: 0 },
    departmentAllocation:
      results[2].status === 'fulfilled' ? results[2].value : [],
    overdueReturns:
      results[3].status === 'fulfilled' ? results[3].value : [],
    pendingDisposals:
      results[4].status === 'fulfilled' ? results[4].value : [],
    highMaintenanceAssets:
      results[5].status === 'fulfilled' ? results[5].value : [],
    recentActivities:
      results[6].status === 'fulfilled' ? results[6].value : [],
    topHighValueAssets:
      results[7].status === 'fulfilled' ? results[7].value : [],
    depreciationLedger:
      results[8].status === 'fulfilled' ? results[8].value : [],
    writeOffsLedger:
      results[9].status === 'fulfilled' ? results[9].value : [],
    softwareOptimization:
      results[10].status === 'fulfilled' ? results[10].value : [],
  };
}
