import { and, count, eq, isNull, sql, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetPurchases,
  maintenanceTickets,
  softwareLicenses,
  softwareAllocations,
  assetAssignments,
} from '@/db/schema';
import { unstable_cache } from 'next/cache';
import {
  DEFAULT_SOFTWARE_SEAT_COST,
  DASHBOARD_KPI_CACHE_TTL,
  HIGH_MAINTENANCE_TICKET_THRESHOLD,
  FLEET_HEALTH_WEIGHTS,
} from '@/lib/constants/dashboard';
import type { DashboardKpiMetrics } from '@/types/dashboard';
import { convertCurrencyAmount } from '@/lib/currency';
import { straightLineNbvSqlFragment } from '@/lib/depreciation';

function getFleetHealthLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

export interface FleetHealthInputs {
  totalActiveAssets: number;
  assignedCountHealth: number;
  overdueCountHealth: number;
  highRepairCount: number;
  warrantyCovered: number;
  totalSWSeats: number;
  allocatedSWSeats: number;
}

export function calculateFleetHealthScore(inputs: FleetHealthInputs): number {
  const {
    totalActiveAssets,
    assignedCountHealth,
    overdueCountHealth,
    highRepairCount,
    warrantyCovered,
    totalSWSeats,
    allocatedSWSeats,
  } = inputs;

  const components = [
    {
      applicable: totalActiveAssets > 0,
      weight: FLEET_HEALTH_WEIGHTS.utilization,
      value:
        totalActiveAssets > 0
          ? Math.min(1, assignedCountHealth / totalActiveAssets)
          : 0,
    },
    {
      applicable: assignedCountHealth > 0,
      weight: FLEET_HEALTH_WEIGHTS.overdue,
      value:
        assignedCountHealth > 0
          ? Math.max(0, 1 - overdueCountHealth / assignedCountHealth)
          : 1,
    },
    {
      applicable: totalActiveAssets > 0,
      weight: FLEET_HEALTH_WEIGHTS.repairs,
      value:
        totalActiveAssets > 0
          ? Math.max(0, 1 - highRepairCount / totalActiveAssets)
          : 1,
    },
    {
      applicable: totalActiveAssets > 0,
      weight: FLEET_HEALTH_WEIGHTS.warranty,
      value:
        totalActiveAssets > 0
          ? Math.min(1, warrantyCovered / totalActiveAssets)
          : 0,
    },
    {
      applicable: totalSWSeats > 0,
      weight: FLEET_HEALTH_WEIGHTS.software,
      value:
        totalSWSeats > 0 ? Math.min(1, allocatedSWSeats / totalSWSeats) : 1,
    },
  ];

  const applicableComponents = components.filter((c) => c.applicable);
  if (applicableComponents.length === 0) {
    return 100; // Default when no components are applicable (clean slate)
  }

  const totalWeight = applicableComponents.reduce(
    (sum, c) => sum + c.weight,
    0
  );
  const weightedSum = applicableComponents.reduce(
    (sum, c) => sum + c.value * c.weight,
    0
  );

  return Math.round((weightedSum / totalWeight) * 100);
}

export const getCachedDashboardKpiMetrics = unstable_cache(
  async (): Promise<DashboardKpiMetrics> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all active licenses upfront so we can determine software asset IDs
    // and include software purchases as the 10th parallel query.
    const allLicenses = await db
      .select({
        id: softwareLicenses.id,
        totalSeats: softwareLicenses.totalSeats,
        assetId: softwareLicenses.assetId,
      })
      .from(softwareLicenses)
      .where(eq(softwareLicenses.isActive, true));

    const softwareAssetIds = allLicenses
      .map((l) => l.assetId)
      .filter(Boolean) as string[];

    const [
      assetMetricsRes,
      financialMetricsRes,
      maintenanceMetricsRes,
      softwareMetricsRes,
      expiringLicensesRes,
      allocationsCountRes,
      overdueCountRes,
      highRepairCountRes,
      softwarePurchasesRes,
    ] = await Promise.all([
      db
        .select({
          totalActive: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' THEN 1 ELSE 0 END)`,
          createdThisMonth: sql<number>`SUM(CASE WHEN ${assets.createdAt} >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 ELSE 0 END)`,
          assignedCount: sql<number>`SUM(CASE WHEN ${assets.status} = 'Assigned' THEN 1 ELSE 0 END)`,
        })
        .from(assets)
        .where(eq(assets.isArchived, false)),

      db
        .select({
          totalAssetValue: sql<number>`SUM(${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}::numeric, 1))`,
          totalAssetValuePrev: sql<number>`SUM(CASE WHEN ${assets.createdAt} < ${thirtyDaysAgo.toISOString()}::timestamp THEN ${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}::numeric, 1) ELSE 0 END)`,
          nbv: sql<number>`
            SUM(
              CASE WHEN ${assets.status} != 'Disposed' THEN
                CASE WHEN ${assetPurchases.purchaseDate} IS NULL THEN
                  COALESCE(${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}::numeric, 1), 0)
                ELSE
                  ${sql.raw(
                    straightLineNbvSqlFragment(
                      'asset_purchases.total_cost',
                      'asset_purchases.exchange_rate',
                      'assets.salvage_value',
                      'assets.useful_life_months',
                      'asset_purchases.purchase_date'
                    )
                  )}
                END
              ELSE 0 END
            )
          `,
          warrantyExpiries30Days: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' AND ${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE AND ${assetPurchases.warrantyExpiry}::date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END)`,
          warrantyCovered: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' AND ${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE THEN 1 ELSE 0 END)`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(eq(assets.isArchived, false)),

      db
        .select({
          allTimeRepair: sql<number>`SUM(${maintenanceTickets.actualCost})`,
          repairThisMonth: sql<number>`SUM(CASE WHEN ${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE) THEN ${maintenanceTickets.actualCost} ELSE 0 END)`,
          repairLastMonth: sql<number>`SUM(CASE WHEN ${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND ${maintenanceTickets.actualCompletionDate} < DATE_TRUNC('month', CURRENT_DATE) THEN ${maintenanceTickets.actualCost} ELSE 0 END)`,
        })
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.status, 'COMPLETED')),

      db
        .select({
          totalSeats: sql<number>`SUM(${softwareLicenses.totalSeats})`,
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.isActive, true)),

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
        .select({
          licenseId: softwareAllocations.licenseId,
          count: count(),
        })
        .from(softwareAllocations)
        .where(isNull(softwareAllocations.revokedAt))
        .groupBy(softwareAllocations.licenseId),

      db
        .select({ count: count() })
        .from(assetAssignments)
        .where(
          and(
            isNull(assetAssignments.returnedDate),
            sql`${assetAssignments.expectedReturnDate}::date < CURRENT_DATE`
          )
        ),

      db.select({ count: count() }).from(
        db
          .select({ assetId: maintenanceTickets.assetId })
          .from(maintenanceTickets)
          .groupBy(maintenanceTickets.assetId)
          .having(sql`COUNT(*) >= ${HIGH_MAINTENANCE_TICKET_THRESHOLD}`)
          .as('high_repair_assets')
      ),

      // 10th parallel query: software purchase costs (previously a sequential post-query)
      softwareAssetIds.length > 0
        ? db
            .select({
              assetId: assetPurchases.assetId,
              totalCostLkr: sql<number>`${assetPurchases.totalCost}::numeric * COALESCE(${assetPurchases.exchangeRate}::numeric, 1)`,
            })
            .from(assetPurchases)
            .where(inArray(assetPurchases.assetId, softwareAssetIds))
        : Promise.resolve([]),
    ]);

    const totalActiveAssets = Number(assetMetricsRes[0]?.totalActive || 0);
    const totalActiveAssetsChange = Number(
      assetMetricsRes[0]?.createdThisMonth || 0
    );
    const assignedCountHealth = Number(assetMetricsRes[0]?.assignedCount || 0);

    const totalAssetValue = parseFloat(
      financialMetricsRes[0]?.totalAssetValue?.toString() || '0'
    );
    const totalAssetValuePrev = parseFloat(
      financialMetricsRes[0]?.totalAssetValuePrev?.toString() || '0'
    );
    const totalAssetValueTrend =
      totalAssetValuePrev > 0
        ? Math.round(
            ((totalAssetValue - totalAssetValuePrev) / totalAssetValuePrev) *
              1000
          ) / 10
        : 0;

    const netBookValue = parseFloat(
      financialMetricsRes[0]?.nbv?.toString() || '0'
    );
    const warrantyExpiries30Days = Number(
      financialMetricsRes[0]?.warrantyExpiries30Days || 0
    );
    const warrantyCovered = Number(
      financialMetricsRes[0]?.warrantyCovered || 0
    );

    // Maintenance actualCost has no currency column — UI convention is USD (see repair history page).
    // Normalize to LKR using the same static rates as the rest of the app.
    const rawRepairAll = parseFloat(
      maintenanceMetricsRes[0]?.allTimeRepair?.toString() || '0'
    );
    const rawRepairThisMonth = parseFloat(
      maintenanceMetricsRes[0]?.repairThisMonth?.toString() || '0'
    );
    const rawRepairLastMonth = parseFloat(
      maintenanceMetricsRes[0]?.repairLastMonth?.toString() || '0'
    );
    const cumulativeRepairSpend = convertCurrencyAmount(
      rawRepairAll,
      'USD',
      'LKR'
    );
    const repairThisMonth = convertCurrencyAmount(
      rawRepairThisMonth,
      'USD',
      'LKR'
    );
    const repairLastMonth = convertCurrencyAmount(
      rawRepairLastMonth,
      'USD',
      'LKR'
    );
    const repairSpendTrend =
      repairLastMonth > 0
        ? Math.round(
            ((repairThisMonth - repairLastMonth) / repairLastMonth) * 1000
          ) / 10
        : 0;

    const totalSWSeats = Number(softwareMetricsRes[0]?.totalSeats || 0);
    const allocatedSWSeats = allocationsCountRes.reduce(
      (acc, a) => acc + Number(a.count),
      0
    );

    const allocMap = new Map(
      allocationsCountRes.map((a) => [a.licenseId, a.count])
    );

    // Build software purchases map from the parallel query result (values are LKR-normalized)
    const softwarePurchasesMap = new Map<string, number>(
      softwarePurchasesRes.map((p) => [
        p.assetId,
        parseFloat(p.totalCostLkr?.toString() || '0'),
      ])
    );

    const licenses = allLicenses;

    let inactiveSoftwareSeats = 0;
    let inactiveSoftwareCostLeak = 0;

    licenses.forEach((lic) => {
      const allocated = allocMap.get(lic.id) || 0;
      const inactive = Math.max(0, lic.totalSeats - allocated);
      inactiveSoftwareSeats += inactive;

      const licenseCost = lic.assetId
        ? softwarePurchasesMap.get(lic.assetId) || 0
        : 0;
      const costPerSeat = lic.totalSeats > 0 ? licenseCost / lic.totalSeats : 0;
      const activeCostPerSeat =
        costPerSeat > 0 ? costPerSeat : DEFAULT_SOFTWARE_SEAT_COST;
      inactiveSoftwareCostLeak += inactive * activeCostPerSeat;
    });

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

    const overdueCountHealth = overdueCountRes[0]?.count || 0;
    const highRepairCount = highRepairCountRes[0]?.count || 0;

    const fleetHealthScore = calculateFleetHealthScore({
      totalActiveAssets,
      assignedCountHealth,
      overdueCountHealth,
      highRepairCount,
      warrantyCovered,
      totalSWSeats,
      allocatedSWSeats,
    });

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
