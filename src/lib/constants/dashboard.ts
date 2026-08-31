/**
 * Dashboard configuration constants.
 *
 * All magic numbers and default values used by the admin KPI dashboard
 * are centralised here so they can be tuned without searching through
 * query logic.
 */

// ── Cache TTLs (seconds) ─────────────────────────────────────────────
/** Revalidation interval for KPI metrics cache. */
export const DASHBOARD_KPI_CACHE_TTL = 300; // 5 minutes

/** Revalidation interval for inventory & allocation caches. */
export const DASHBOARD_CHART_CACHE_TTL = 300; // 5 minutes

// ── Query limits ─────────────────────────────────────────────────────
/** Default row limit for dashboard table widgets when no explicit limit is provided. */
export const DASHBOARD_TABLE_DEFAULT_LIMIT = 50;

/** Maximum number of recent activity entries to display. */
export const DASHBOARD_RECENT_ACTIVITIES_LIMIT = 5;

// ── Financial defaults ───────────────────────────────────────────────
/**
 * Fallback cost-per-seat used when a software license has no associated
 * purchase record.  This prevents the cost-leak KPI from silently
 * ignoring unpriced licences.
 *
 * Unit: USD per seat per billing period.
 */
export const DEFAULT_SOFTWARE_SEAT_COST = 50;

/**
 * Default useful-life in months when an asset has no explicit value.
 * Used for straight-line depreciation calculations.
 */
export const DEFAULT_USEFUL_LIFE_MONTHS = 60; // 5 years

// ── Fleet Health Score weights ───────────────────────────────────────
/**
 * Weighted components for the composite Fleet Health Score (0–100).
 * All weights must sum to 1.0.
 */
export const FLEET_HEALTH_WEIGHTS = {
  /** Share of the fleet not currently broken, lost or in repair. */
  condition: 0.25,
  /** Deployment of serviceable kit, measured against a realistic target. */
  deployment: 0.2,
  /** Inverse ratio of overdue returns vs open assignments. */
  returns: 0.15,
  /** Inverse ratio of assets with repeated repairs. */
  repairs: 0.15,
  /** Share of assets either under warranty or already past useful life. */
  support: 0.15,
  /** Share of purchased seats on active licences that are allocated. */
  licences: 0.1,
} as const;

/**
 * Statuses meaning the asset cannot be used right now.
 *
 * These drive the condition component, which is the most direct health signal
 * the fleet has and was absent from the original score entirely -- a fleet
 * could have a third of its kit broken and still read "Excellent" as long as
 * the rest was assigned.
 */
export const OUT_OF_ACTION_STATUSES = [
  'In Repair',
  'Defective',
  'Lost',
] as const;

/**
 * Statuses meaning the asset is not available to hand out -- the out-of-action
 * set plus everything at end of life.
 *
 * Deployment is measured against what is left after these, so broken and
 * retired kit is not double-counted as capital you failed to deploy. It is
 * already penalised by the condition component.
 */
export const NON_DEPLOYABLE_STATUSES = [
  ...OUT_OF_ACTION_STATUSES,
  'Retired',
  'Pending Disposal',
  'Disposed',
] as const;

/**
 * Deployment rate that earns full marks.
 *
 * The old score divided assigned by every active asset, so 100% was the only
 * way to score full marks on utilisation -- which would mean holding no spare
 * kit at all. Keeping a buffer is good practice, not a defect, so the target
 * sits below 1 and anything at or above it scores 1.
 */
export const TARGET_DEPLOYMENT_RATE = 0.85;

/** Threshold for "high-maintenance" asset flag. */
export const HIGH_MAINTENANCE_TICKET_THRESHOLD = 3;

// ── Auto-refresh ─────────────────────────────────────────────────────
/** Dashboard auto-refresh interval in milliseconds. */
export const DASHBOARD_AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
