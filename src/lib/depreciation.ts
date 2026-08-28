/**
 * @file depreciation.ts
 *
 * Single source of truth for all depreciation calculations.
 *
 * WHY A SEPARATE FILE?
 * The depreciation method is a business rule that companies revisit regularly
 * (e.g. IFRS 16 audits, asset policy changes, switch from straight-line to
 * declining-balance).  Isolating it here means every callsite — the financials
 * ledger, the KPI dashboard, asset financial-vitals, disposals, standard
 * reports, and the external API — will pick up the updated formula
 * automatically without touching those files.
 *
 * HOW TO CHANGE THE METHOD
 * 1. Update / add a new function below (e.g. `calculateDecliningBalanceDepreciation`).
 * 2. Change the `calculateCurrentBookValue` export to call the new function.
 * 3. Update `DEPRECIATION_METHOD` so logs / docs reflect the active method.
 * 4. All callers continue to use `calculateCurrentBookValue` unchanged.
 *
 * CURRENT METHOD: Straight-Line (SL) with residual / salvage value
 *   NBV = cost − ((cost − salvageValue) / usefulLifeMonths) × monthsElapsed
 *   Capped at [salvageValue, cost] — never negative, never above cost.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default useful life when an asset record has no explicit value (60 months = 5 years). */
export const DEFAULT_USEFUL_LIFE_MONTHS = 60;

/** The active depreciation method name — update this when you switch methods. */
export const DEPRECIATION_METHOD = 'straight-line' as const;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Returns the number of whole calendar months elapsed between `purchaseDate`
 * and today.  Returns 0 for missing / invalid dates.
 */
export function calculateMonthsElapsed(
  purchaseDate: Date | string | null | undefined,
  /** The date to measure to. Defaults to now; pass one to project forward. */
  asOf?: Date
): number {
  if (!purchaseDate) return 0;
  const pDate = new Date(purchaseDate);
  if (isNaN(pDate.getTime())) return 0;

  const now = asOf ?? new Date();
  return (
    (now.getFullYear() - pDate.getFullYear()) * 12 +
    (now.getMonth() - pDate.getMonth())
  );
}

// ---------------------------------------------------------------------------
// Straight-line depreciation
// ---------------------------------------------------------------------------

export interface StraightLineParams {
  /** Total acquisition cost in the asset's native currency. */
  cost: number;
  /**
   * Estimated residual / salvage value at end of useful life.
   * Defaults to 0 when not provided (conservative — fully depreciated).
   */
  salvageValue?: number | null;
  /**
   * Expected useful life in months.
   * Falls back to DEFAULT_USEFUL_LIFE_MONTHS when null / undefined / 0.
   */
  usefulLifeMonths?: number | null;
  /** The date the asset was purchased / placed in service. */
  purchaseDate: Date | string | null | undefined;
}

/**
 * Calculates net book value using the straight-line method.
 *
 * Formula: NBV = cost − ((cost − salvage) / life) × months
 * Result is clamped to [salvage, cost].
 *
 * @returns Net book value in the same currency as `cost`.
 */
export function calculateStraightLineNBV(
  params: StraightLineParams,
  /** Value the asset as at this date rather than today. */
  asOf?: Date
): number {
  const { cost, purchaseDate } = params;

  if (cost <= 0) return 0;
  if (!purchaseDate) return cost; // No purchase date → assume never depreciated

  const pDate = new Date(purchaseDate);
  if (isNaN(pDate.getTime())) return cost;

  const monthsElapsed = calculateMonthsElapsed(purchaseDate, asOf);
  if (monthsElapsed <= 0) return cost; // Purchased this month or in the future

  const salvage = Math.max(0, params.salvageValue ?? 0);
  const lifeMonths = params.usefulLifeMonths || DEFAULT_USEFUL_LIFE_MONTHS;
  const depreciableAmount = Math.max(0, cost - salvage);

  const monthlyDepreciation = depreciableAmount / lifeMonths;
  const accumulatedDepreciation =
    monthlyDepreciation * Math.min(lifeMonths, monthsElapsed);

  // Clamp result: NBV is always >= salvage value (never below residual)
  return Math.max(salvage, cost - accumulatedDepreciation);
}

/**
 * Returns the annual depreciation amount (straight-line).
 * Useful for audit reports and forecast schedules.
 */
export function calculateAnnualDepreciation(
  params: StraightLineParams
): number {
  const { cost } = params;
  if (cost <= 0) return 0;
  const salvage = Math.max(0, params.salvageValue ?? 0);
  const lifeMonths = params.usefulLifeMonths || DEFAULT_USEFUL_LIFE_MONTHS;
  const depreciableAmount = Math.max(0, cost - salvage);
  return (depreciableAmount / lifeMonths) * 12;
}

/**
 * Returns the monthly depreciation amount (straight-line).
 */
export function calculateMonthlyDepreciation(
  params: StraightLineParams
): number {
  const { cost } = params;
  if (cost <= 0) return 0;
  const salvage = Math.max(0, params.salvageValue ?? 0);
  const lifeMonths = params.usefulLifeMonths || DEFAULT_USEFUL_LIFE_MONTHS;
  const depreciableAmount = Math.max(0, cost - salvage);
  return lifeMonths > 0 ? depreciableAmount / lifeMonths : 0;
}

// ---------------------------------------------------------------------------
// Primary export — change this to switch methods app-wide
// ---------------------------------------------------------------------------

/**
 * **The single, authoritative function to compute an asset's current net book value.**
 *
 * All callers in the codebase should use this function. To change the
 * depreciation method for the entire application, update only this function.
 */
export function calculateCurrentBookValue(
  params: StraightLineParams,
  asOf?: Date
): number {
  return calculateStraightLineNBV(params, asOf);
}

/**
 * Aggregate book value of a set of assets, month by month.
 *
 * Straight-line depreciation is entirely determined by the purchase date, so
 * past and future book values are computable from the same inputs the ledger
 * already reads -- no history table needed. Used for the depreciation chart,
 * where the shape of the write-down is the point.
 */
export function projectBookValueSeries(
  assets: StraightLineParams[],
  { monthsBack = 12, monthsForward = 12 } = {}
): { month: string; bookValue: number }[] {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const series: { month: string; bookValue: number }[] = [];

  for (let offset = -monthsBack; offset <= monthsForward; offset += 1) {
    const asOf = new Date(start);
    asOf.setMonth(asOf.getMonth() + offset);

    let total = 0;
    for (const asset of assets) {
      // An asset the company did not own yet contributes nothing. Without this
      // the earliest months would carry every future purchase at full cost.
      if (asset.purchaseDate) {
        const purchased = new Date(asset.purchaseDate);
        if (!isNaN(purchased.getTime()) && purchased > asOf) continue;
      }
      total += calculateStraightLineNBV(asset, asOf);
    }

    series.push({
      month: `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`,
      bookValue: Math.round(total * 100) / 100,
    });
  }

  return series;
}

// ---------------------------------------------------------------------------
// SQL helper string — for inline Postgres expressions
// ---------------------------------------------------------------------------

/**
 * Generates the SQL fragment for straight-line NBV.
 *
 * Usage in Drizzle:
 * ```ts
 * import { straightLineNbvSql } from '@/lib/depreciation';
 * sql<number>`${straightLineNbvSql('total_cost', 'exchange_rate', 'salvage_value', 'useful_life_months', 'purchase_date', 60)}`
 * ```
 *
 * @param costCol         SQL column reference for total cost (in native currency)
 * @param exchangeRateCol SQL column reference for the LKR exchange rate
 * @param salvageCol      SQL column reference for salvage value (or null literal)
 * @param lifeCol         SQL column reference for useful_life_months (or null literal)
 * @param dateCol         SQL column reference for purchase_date
 * @param defaultLife     Fallback life in months when the column is NULL
 */
export function straightLineNbvSqlFragment(
  costCol: string,
  exchangeRateCol: string,
  salvageCol: string,
  lifeCol: string,
  dateCol: string,
  defaultLife: number = DEFAULT_USEFUL_LIFE_MONTHS
): string {
  return `
    GREATEST(
      COALESCE(${salvageCol}::numeric, 0) * COALESCE(${exchangeRateCol}::numeric, 1),
      (${costCol}::numeric * COALESCE(${exchangeRateCol}::numeric, 1))
      - (
        (
          (${costCol}::numeric * COALESCE(${exchangeRateCol}::numeric, 1))
          - COALESCE(${salvageCol}::numeric, 0) * COALESCE(${exchangeRateCol}::numeric, 1)
        )
        / GREATEST(1, COALESCE(${lifeCol}, ${defaultLife}))
        * LEAST(
            GREATEST(1, COALESCE(${lifeCol}, ${defaultLife})),
            GREATEST(0,
              EXTRACT(YEAR FROM AGE(NOW(), ${dateCol}::timestamp)) * 12
              + EXTRACT(MONTH FROM AGE(NOW(), ${dateCol}::timestamp))
            )
          )
      )
    )
  `.trim();
}
