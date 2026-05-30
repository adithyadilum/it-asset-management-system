/**
 * Dashboard configuration constants.
 *
 * All magic numbers and default values used by the admin KPI dashboard
 * are centralised here so they can be tuned without searching through
 * query logic.
 */

// ── Cache TTLs (seconds) ─────────────────────────────────────────────
/** Revalidation interval for KPI metrics cache. */
export const DASHBOARD_KPI_CACHE_TTL = 30; // 5 minutes

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
  /** % of active assets currently assigned to a user/location. */
  utilization: 0.3,
  /** Inverse ratio of overdue returns vs total assigned. */
  overdue: 0.2,
  /** Inverse ratio of assets with ≥3 maintenance tickets. */
  repairs: 0.2,
  /** % of active assets under warranty. */
  warranty: 0.15,
  /** % of software seats actively allocated. */
  software: 0.15,
} as const;

/** Threshold for "high-maintenance" asset flag. */
export const HIGH_MAINTENANCE_TICKET_THRESHOLD = 3;

// ── Auto-refresh ─────────────────────────────────────────────────────
/** Dashboard auto-refresh interval in milliseconds. */
export const DASHBOARD_AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
