import {
  and,
  count,
  eq,
  isNull,
  ne,
  notInArray,
  sql,
  inArray,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetPurchases,
  categories,
  maintenanceTickets,
  models,
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
  TARGET_DEPLOYMENT_RATE,
  OUT_OF_ACTION_STATUSES,
  NON_DEPLOYABLE_STATUSES,
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

/**
 * Everything the score needs, already reduced to counts.
 *
 * Each denominator is named so the component that uses it can be checked
 * against the same population -- the previous shape divided an assignment
 * count from one table by an asset count from another, which could exceed 1
 * and was then silently clamped to zero.
 */
export interface FleetHealthInputs {
  /** Assets in the fleet: not archived, not disposed. */
  totalActiveAssets: number;
  /** Of those, currently In Repair, Defective or Lost. */
  outOfActionCount: number;
  /** Of those, serviceable and available to hand out or already handed out. */
  deployableCount: number;
  /** Of the deployable set, currently assigned. */
  assignedCount: number;
  /** Open assignments (no return recorded) on assets still in the fleet. */
  openAssignmentCount: number;
  /** Of those, past their expected return date. */
  overdueCount: number;
  /** Assets with at least HIGH_MAINTENANCE_TICKET_THRESHOLD repairs. */
  highRepairCount: number;
  /** In-service assets that have a purchase record to judge cover against. */
  purchasedAssetCount: number;
  /** Of those, under warranty or already past their useful life. */
  supportCoveredCount: number;
  /** Seats across active licences. */
  totalSWSeats: number;
  /** Live allocations against those same licences. */
  allocatedSWSeats: number;
}

/** Safe ratio: no denominator means no signal, not a zero. */
function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}

/**
 * A 0-100 composite of six things that each cost money when they slip.
 *
 * Every component is scored so that a well-run fleet can actually reach 1.
 * That was the main problem with the previous version: utilisation demanded
 * 100% of assets be assigned (so holding any spare kit capped the score) and
 * warranty coverage demanded every asset still be under warranty (which no
 * ageing fleet can be, so the ceiling fell every month regardless of what
 * anyone did). Both now measure against a target that good practice can meet.
 *
 * Components with no denominator are dropped and the remaining weights are
 * renormalised, so an organisation with no software licences is not marked
 * down for the seats it does not have.
 */
export function calculateFleetHealthScore(inputs: FleetHealthInputs): number {
  const {
    totalActiveAssets,
    outOfActionCount,
    deployableCount,
    assignedCount,
    openAssignmentCount,
    overdueCount,
    highRepairCount,
    purchasedAssetCount,
    supportCoveredCount,
    totalSWSeats,
    allocatedSWSeats,
  } = inputs;

  const components = [
    {
      // How much of the fleet is usable right now. The most direct health
      // signal there is, and the one the original score left out.
      applicable: totalActiveAssets > 0,
      weight: FLEET_HEALTH_WEIGHTS.condition,
      value: 1 - ratio(outOfActionCount, totalActiveAssets),
    },
    {
      // Idle capital, measured only against serviceable kit and only up to a
      // realistic target, so a spare pool is not treated as a failure.
      applicable: deployableCount > 0,
      weight: FLEET_HEALTH_WEIGHTS.deployment,
      value: ratio(
        ratio(assignedCount, deployableCount),
        TARGET_DEPLOYMENT_RATE
      ),
    },
    {
      // Custody risk, now measured against open assignments rather than a
      // status count from a different table.
      applicable: openAssignmentCount > 0,
      weight: FLEET_HEALTH_WEIGHTS.returns,
      value: 1 - ratio(overdueCount, openAssignmentCount),
    },
    {
      // Repeat offenders: kit that should be replaced rather than repaired
      // again.
      applicable: totalActiveAssets > 0,
      weight: FLEET_HEALTH_WEIGHTS.repairs,
      value: 1 - ratio(highRepairCount, totalActiveAssets),
    },
    {
      // Unplanned cost exposure. An asset past its useful life counts as
      // covered: replacing it is already the plan, so the absence of a
      // warranty on it is not a risk. What this catches is a young asset with
      // no cover, which is the case that actually costs money.
      applicable: purchasedAssetCount > 0,
      weight: FLEET_HEALTH_WEIGHTS.support,
      value: ratio(supportCoveredCount, purchasedAssetCount),
    },
    {
      // Seats paid for and not used.
      applicable: totalSWSeats > 0,
      weight: FLEET_HEALTH_WEIGHTS.licences,
      value: ratio(allocatedSWSeats, totalSWSeats),
    },
  ];

  const applicableComponents = components.filter((c) => c.applicable);
  if (applicableComponents.length === 0) {
    return 100; // Nothing to judge: an empty fleet is a clean slate, not a sick one.
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
          // Broken, missing, or away being fixed -- the condition component.
          outOfAction: sql<number>`SUM(CASE WHEN ${inArray(assets.status, [...OUT_OF_ACTION_STATUSES])} THEN 1 ELSE 0 END)`,
          // Serviceable kit: what is left after the out-of-action set and
          // everything at end of life. Deployment is judged against this, not
          // against every asset on the books.
          deployable: sql<number>`SUM(CASE WHEN ${notInArray(assets.status, [...NON_DEPLOYABLE_STATUSES])} THEN 1 ELSE 0 END)`,
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
                      'asset_purchases.purchase_date',
                      undefined,
                      // Software is carried at cost, so this figure still
                      // covers the same assets as total acquisition value.
                      'categories.pillar'
                    )
                  )}
                END
              ELSE 0 END
            )
          `,
          warrantyExpiries30Days: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' AND ${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE AND ${assetPurchases.warrantyExpiry}::date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END)`,
          // Denominator for support cover: in-service assets that have a
          // purchase record to judge cover against.
          purchasedAssets: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' THEN 1 ELSE 0 END)`,
          // Covered means under warranty OR already past its useful life.
          // An asset at end of life is due for replacement, so having no
          // warranty on it is not an exposure -- counting it as one is what
          // made the old warranty component impossible to score well on.
          supportCovered: sql<number>`SUM(CASE WHEN ${assets.status} != 'Disposed' AND (
            ${assetPurchases.warrantyExpiry}::date >= CURRENT_DATE
            OR (
              ${assets.usefulLifeMonths} IS NOT NULL
              AND ${assetPurchases.purchaseDate} + (${assets.usefulLifeMonths} || ' months')::interval < CURRENT_DATE
            )
          ) THEN 1 ELSE 0 END)`,
        })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        // Joined only so the NBV expression can read the pillar.
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .where(eq(assets.isArchived, false)),

      // Grouped by the currency the ticket recorded, so each bucket converts
      // with its own rate below.
      db
        .select({
          currencyCode: maintenanceTickets.currencyCode,
          allTimeRepair: sql<number>`SUM(${maintenanceTickets.actualCost})`,
          repairThisMonth: sql<number>`SUM(CASE WHEN ${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE) THEN ${maintenanceTickets.actualCost} ELSE 0 END)`,
          repairLastMonth: sql<number>`SUM(CASE WHEN ${maintenanceTickets.actualCompletionDate} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND ${maintenanceTickets.actualCompletionDate} < DATE_TRUNC('month', CURRENT_DATE) THEN ${maintenanceTickets.actualCost} ELSE 0 END)`,
        })
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.status, 'COMPLETED'))
        .groupBy(maintenanceTickets.currencyCode),

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

      // Joined to the licence so allocations are counted against the same
      // set of licences that supplies the seat total. Without it a live
      // allocation on a deactivated licence inflated the numerator only.
      db
        .select({
          licenseId: softwareAllocations.licenseId,
          count: count(),
        })
        .from(softwareAllocations)
        .innerJoin(
          softwareLicenses,
          eq(softwareLicenses.id, softwareAllocations.licenseId)
        )
        .where(
          and(
            isNull(softwareAllocations.revokedAt),
            eq(softwareLicenses.isActive, true)
          )
        )
        .groupBy(softwareAllocations.licenseId),

      // Both halves of the return-discipline ratio come from one query over
      // one population. They used to be an assignment count divided by an
      // asset status count, which could exceed 1 whenever an archived asset
      // still held an open assignment.
      db
        .select({
          open: sql<number>`COUNT(*)`,
          overdue: sql<number>`SUM(CASE WHEN ${assetAssignments.expectedReturnDate}::date < CURRENT_DATE THEN 1 ELSE 0 END)`,
        })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .where(
          and(
            isNull(assetAssignments.returnedDate),
            eq(assets.isArchived, false),
            ne(assets.status, 'Disposed')
          )
        ),

      // Same definition as the high-maintenance table: cancelled tickets are
      // not repairs and archived assets are out of the fleet. Without these the
      // KPI counted a different set of assets than the table beneath it listed.
      db.select({ count: count() }).from(
        db
          .select({ assetId: maintenanceTickets.assetId })
          .from(maintenanceTickets)
          .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
          .where(
            and(
              ne(maintenanceTickets.status, 'CANCELLED'),
              eq(assets.isArchived, false)
            )
          )
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
    const outOfActionCount = Number(assetMetricsRes[0]?.outOfAction || 0);
    const deployableCount = Number(assetMetricsRes[0]?.deployable || 0);

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
    const purchasedAssetCount = Number(
      financialMetricsRes[0]?.purchasedAssets || 0
    );
    const supportCoveredCount = Number(
      financialMetricsRes[0]?.supportCovered || 0
    );

    // Repair costs carry their own currency (maintenance_tickets.currency_code,
    // added with the repair-dialog currency picker). This used to assume every
    // amount was USD and convert the lot to LKR, which multiplied a fleet of
    // LKR-denominated repairs by ~303 -- a 1.1M repair bill rendered as 353M.
    const sumRepairs = (
      field: 'allTimeRepair' | 'repairThisMonth' | 'repairLastMonth'
    ) =>
      maintenanceMetricsRes.reduce((total, row) => {
        const amount = parseFloat(row[field]?.toString() || '0');
        if (!Number.isFinite(amount) || amount === 0) return total;
        return total + convertCurrencyAmount(amount, row.currencyCode, 'LKR');
      }, 0);

    const cumulativeRepairSpend = sumRepairs('allTimeRepair');
    const repairThisMonth = sumRepairs('repairThisMonth');
    const repairLastMonth = sumRepairs('repairLastMonth');
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

    const openAssignmentCount = Number(overdueCountRes[0]?.open || 0);
    const overdueCountHealth = Number(overdueCountRes[0]?.overdue || 0);
    const highRepairCount = highRepairCountRes[0]?.count || 0;

    const fleetHealthScore = calculateFleetHealthScore({
      totalActiveAssets,
      outOfActionCount,
      deployableCount,
      assignedCount: assignedCountHealth,
      openAssignmentCount,
      overdueCount: overdueCountHealth,
      highRepairCount,
      purchasedAssetCount,
      supportCoveredCount,
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
