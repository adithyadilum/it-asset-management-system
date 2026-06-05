import { and, count, eq, isNull, isNotNull, sql, inArray, ne, desc } from 'drizzle-orm';
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
import type { AuthenticatedUser } from '@/actions/auth';
import { unstable_cache } from 'next/cache';
import { calculateStraightLineDepreciation } from '@/lib/financial-math';
import {
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

export function assertAdminOrOperator(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');
}

export function assertAdminOrAuditor(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor')
    throw new Error('Forbidden');
}

export function assertNotEmployee(user: AuthenticatedUser) {
  if (user.role === 'Employee') throw new Error('Forbidden');
}

export function assertAdmin(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin') throw new Error('Forbidden');
}

// ============================================================================
// TYPES
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

export interface PendingDisposalRow {
  disposalId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  requestedBy: string;
  requestedByEmail: string;
  daysPending: number;
}

export interface DepreciationLedgerRow {
  id: string;
  assetId: string;
  category: string;
  purchaseDate: string | Date | null;
  originalPrice: number;
  currencyCode: string;
  expectedLifespan: string;
  currentBookValue: number;
}

export interface WriteOffLedgerRow {
  id: string;
  assetId: string;
  category: string;
  disposalDate: string | Date | null;
  originalPrice: number;
  currencyCode: string;
  bookValue: number;
  salvageValue: number;
}

export interface DashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  pendingDisposals: PendingDisposalRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
  recentActivities: RecentActivity[];
  topHighValueAssets: TopHighValueAssetRow[];
  depreciationLedger?: DepreciationLedgerRow[];
  writeOffsLedger?: WriteOffLedgerRow[];
  softwareOptimization?: SoftwareOptimizationRow[];
}

export interface HighMaintenanceRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  currentStatus: string;
  repairCount: number;
  totalDowntimeDays: number;
}

export interface RecentActivity {
  id: number;
  text: string;
  actionType: string;
  performedBy: string;
  performedAt: string;
}

export interface TopHighValueAssetRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  location: string;
  originalCost: number | null;
  currentBookValue: number | null;
}

export interface SoftwareOptimizationRow {
  id: string;
  productName: string;
  totalSeats: number;
  assignedSeats: number;
  idleSeats: number;
  costPerSeat: number;
  monthlyLeak: number;
}

export interface InventoryStatusItem {
  name: string;
  value: number;
  color: string;
}

export interface InventoryStatusResponse {
  inventoryData: InventoryStatusItem[];
  utilizationRate: number;
}

export interface DepartmentAllocationItem {
  name: string;
  value: number;
}

export interface AssetsByCategoryItem {
  categoryName: string;
  pillar: string;
  count: number;
}

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

// ============================================================================
// INTERNAL READ FUNCTIONS (DRY & secure wrappers will call these)
// ============================================================================

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

function formatActionType(actionType: string): string {
  const act = actionType.toLowerCase().replace(/_/g, ' ');

  if (act.endsWith('ed') || act.endsWith('d')) return act;
  if (act === 'login') return 'logged in';
  if (act === 'logout') return 'logged out';
  if (act.endsWith('e')) return `${act}d`;
  return `${act}ed`;
}

export async function getRecentActivitiesInternal(): Promise<RecentActivity[]> {
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

export async function getDashboardTopHighValueAssetsInternal(): Promise<TopHighValueAssetRow[]> {
  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: models.name,
      locationName: locations.name,
      totalCost: assetPurchases.totalCost,
      currencyCode: assetPurchases.currencyCode,
      purchaseDate: assetPurchases.purchaseDate,
      usefulLifeMonths: assets.usefulLifeMonths,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(
      and(
        eq(assets.isArchived, false),
        isNotNull(assetPurchases.totalCost)
      )
    );

  // Map and sort costs in USD
  const assetsWithNormalizedCost = rows.map((r) => {
    const cost = parseFloat(r.totalCost?.toString() || '0');
    
    const lifeMonths = r.usefulLifeMonths || 60;
    const bookValue = calculateStraightLineDepreciation(cost, lifeMonths, r.purchaseDate);

    return {
      assetId: r.assetId,
      assetTag: r.assetTag,
      assetName: r.assetName || 'Unknown Asset',
      location: r.locationName || 'Unassigned',
      originalCost: cost > 0 ? cost : null,
      currentBookValue: bookValue > 0 ? bookValue : null,
      currencyCode: 'USD',
      cost,
    };
  });

  // Sort by USD cost descending
  assetsWithNormalizedCost.sort((a, b) => b.cost - a.cost);

  // Take top 10 and clean up temp sorting field
  return assetsWithNormalizedCost.slice(0, 10).map((item) => {
    const rest = { ...item };
    delete (rest as { cost?: number }).cost;
    return rest;
  });
}

export async function getDashboardSoftwareOptimizationInternal(): Promise<SoftwareOptimizationRow[]> {
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

  const allocations = await db
    .select({
      licenseId: softwareAllocations.licenseId,
      count: count(),
    })
    .from(softwareAllocations)
    .where(isNull(softwareAllocations.revokedAt))
    .groupBy(softwareAllocations.licenseId);

  const allocMap = new Map(allocations.map((a) => [a.licenseId, a.count]));

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
    const computedCostPerSeat =
      lic.totalSeats > 0 ? licenseCost / lic.totalSeats : 0;
    const costPerSeat =
      computedCostPerSeat > 0 ? computedCostPerSeat : 10;
    const monthlyLeak = idle * costPerSeat;

    return {
      id: lic.id,
      productName: lic.modelName || 'Unknown License',
      totalSeats: lic.totalSeats,
      assignedSeats: assigned,
      idleSeats: idle,
      costPerSeat,
      monthlyLeak,
      currencyCode: 'USD',
    };
  });
}

// ============================================================================
// CACHED FUNCTIONS
// ============================================================================

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

function getFleetHealthLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

export const getCachedDashboardKpiMetrics = unstable_cache(
  async (): Promise<DashboardKpiMetrics> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalAssetsRes,
      assetsCreatedThisMonthRes,
      totalValueRes,
      totalValuePrevRes,
      nbvRes,
      licensesRes,
      allocationsCountRes,
      warrantyExpiryRes,
      repairSpendCurrentRes,
      repairSpendPrevRes,
      expiringLicensesRes,
      totalAssignedRes,
      overdueCountRes,
      highRepairCountRes,
      warrantyCoverageRes,
      totalSoftwareSeatsRes,
      allocatedSoftwareSeatsRes,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(assets)
        .where(and(eq(assets.isArchived, false), ne(assets.status, 'Disposed'))),

      db
        .select({ count: count() })
        .from(assets)
        .where(
          and(
            eq(assets.isArchived, false),
            sql`${assets.createdAt} >= DATE_TRUNC('month', CURRENT_DATE)`
          )
        ),

      db
        .select({
          sum: sql<string | null>`SUM(${assetPurchases.totalCost})`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(eq(assets.isArchived, false)),

      db
        .select({
          sum: sql<string | null>`SUM(${assetPurchases.totalCost})`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(
            eq(assets.isArchived, false),
            sql`${assets.createdAt} < ${thirtyDaysAgo.toISOString()}::timestamp`
          )
        ),

      db
        .select({
          nbv: sql<string | null>`
            SUM(
              GREATEST(0,
                ${assetPurchases.totalCost}::numeric - (
                  ${assetPurchases.totalCost}::numeric
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

      db
        .select({
          id: softwareLicenses.id,
          totalSeats: softwareLicenses.totalSeats,
          assetId: softwareLicenses.assetId,
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.isActive, true)),

      db
        .select({
          licenseId: softwareAllocations.licenseId,
          count: count(),
        })
        .from(softwareAllocations)
        .where(isNull(softwareAllocations.revokedAt))
        .groupBy(softwareAllocations.licenseId),

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

      db
        .select({ count: count() })
        .from(assets)
        .where(
          and(
            eq(assets.isArchived, false),
            eq(assets.status, 'Assigned')
          )
        ),

      db
        .select({ count: count() })
        .from(assetAssignments)
        .where(
          and(
            isNull(assetAssignments.returnedDate),
            sql`${assetAssignments.expectedReturnDate}::date < CURRENT_DATE`
          )
        ),

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

      db
        .select({
          sum: sql<string | null>`SUM(${softwareLicenses.totalSeats})`,
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.isActive, true)),

      db
        .select({ count: count() })
        .from(softwareAllocations)
        .where(isNull(softwareAllocations.revokedAt)),
    ]);

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

    const licenses = licensesRes;
    const allocMap = new Map(
      allocationsCountRes.map((a) => [a.licenseId, a.count])
    );

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
        costPerSeat > 0 ? costPerSeat : 10; // Default to $10 per seat
      inactiveSoftwareCostLeak += inactive * activeCostPerSeat;
    });

    const warrantyExpiries30Days = warrantyExpiryRes[0]?.count || 0;

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
