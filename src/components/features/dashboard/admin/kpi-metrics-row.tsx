import { KpiCard } from "./kpi-card"
import type { DashboardKpiMetrics } from "@/actions/dashboard"

export interface KpiMetricsRowProps {
  metrics: DashboardKpiMetrics;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function getHealthColor(label: string): "success" | "warning" | "destructive" | "default" {
  if (label === "Excellent" || label === "Good") return "success";
  if (label === "Fair") return "warning";
  if (label === "Poor") return "destructive";
  return "default";
}

export function KpiMetricsRow({ metrics }: KpiMetricsRowProps) {
  const depreciationRate = (metrics.totalAssetValue ?? 0) > 0
    ? (1 - (metrics.netBookValue ?? 0) / (metrics.totalAssetValue ?? 1)) * 100
    : 0;

  const showFinancials = metrics.totalAssetValue !== undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Row 1: Hero KPIs ─────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets — always visible */}
        <KpiCard
          size="hero"
          title="Total Assets"
          value={formatNumber(metrics.totalActiveAssets)}
          badgeText={
            metrics.totalActiveAssetsChange > 0
              ? `+${metrics.totalActiveAssetsChange} MTD`
              : metrics.totalActiveAssetsChange === 0
                ? "No change"
                : `${metrics.totalActiveAssetsChange} MTD`
          }
          badgeType={metrics.totalActiveAssetsChange >= 0 ? "positive" : "negative"}
          subText1="Active fleet (non-archived)"
          subText2="Excludes disposed and archived assets."
          href="/assets/hardware"
        />

        {/* Total Asset Value — financial roles only */}
        {showFinancials && (
          <KpiCard
            size="hero"
            title="Total Asset Value"
            value={formatCurrency(metrics.totalAssetValue!)}
            trendValue={metrics.totalAssetValueTrend}
            badgeType="positive"
            subText1="Acquisition cost of active inventory"
            subText2="Includes hardware, software, and facilities."
            href="/financials/tco"
          />
        )}

        {/* Net Book Value — financial roles only */}
        {showFinancials && metrics.netBookValue !== undefined && (
          <KpiCard
            size="hero"
            title="Net Book Value"
            value={formatCurrency(metrics.netBookValue)}
            badgeText={`-${depreciationRate.toFixed(1)}%`}
            badgeType="negative"
            subText1="Depreciated value of asset base"
            subText2="Calculated via straight-line depreciation."
            href="/financials/depreciation"
          />
        )}

        {/* Fleet Health Score — always visible */}
        <KpiCard
          size="hero"
          title="Fleet Health"
          value={`${metrics.fleetHealthScore} / 100`}
          badgeText={metrics.fleetHealthLabel}
          badgeType={
            metrics.fleetHealthLabel === "Excellent" || metrics.fleetHealthLabel === "Good"
              ? "positive"
              : metrics.fleetHealthLabel === "Fair"
                ? "neutral"
                : "negative"
          }
          valueColor={getHealthColor(metrics.fleetHealthLabel)}
          subText1="Composite fleet health indicator"
          subText2="Utilization, warranty, repairs, compliance."
        />
      </div>

      {/* ─── Row 2: Secondary KPIs ─────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Warranty Expiry */}
        <KpiCard
          title="Warranty Expiry (30d)"
          value={`${formatNumber(metrics.warrantyExpiries30Days)} Assets`}
          badgeText="Risk"
          badgeType={metrics.warrantyExpiries30Days > 0 ? "negative" : "positive"}
          valueColor={metrics.warrantyExpiries30Days > 0 ? "warning" : "default"}
          subText1={`${formatNumber(metrics.warrantyExpiries30Days)} active devices near support end`}
          subText2="Action needed to renew or retire."
          href="/assets/hardware"
        />

        {/* Software Renewals */}
        <KpiCard
          title="Software Renewals (30d)"
          value={`${formatNumber(metrics.softwareRenewals30Days)} Licenses`}
          badgeText="Risk"
          badgeType={metrics.softwareRenewals30Days > 0 ? "negative" : "positive"}
          valueColor={metrics.softwareRenewals30Days > 0 ? "warning" : "default"}
          subText1={`${formatNumber(metrics.softwareRenewals30Days)} critical subscriptions near expiry`}
          subText2={`Affects ${formatNumber(metrics.impactedSoftwareEmployees)} employee custodians.`}
          href="/assets/software"
        />

        {/* Cumulative Repair Spend — financial roles only */}
        {metrics.cumulativeRepairSpend !== undefined && (
          <KpiCard
            title="Cumulative Repair Spend"
            value={formatCurrency(metrics.cumulativeRepairSpend)}
            trendValue={metrics.repairSpendTrend}
            badgeType={
              (metrics.repairSpendTrend ?? 0) <= 0 ? "positive" : "negative"
            }
            subText1="Actual maintenance expenditures"
            subText2="Month-over-month trend comparison."
            href="/operations/maintenance"
          />
        )}

        {/* Idle Software Seats */}
        {metrics.inactiveSoftwareCostLeak !== undefined && (
          <KpiCard
            title="Idle Software Seats"
            value={`${formatNumber(metrics.inactiveSoftwareSeats)} Seats`}
            badgeText={`-${formatCompactCurrency(metrics.inactiveSoftwareCostLeak)}/mo`}
            badgeType="negative"
            valueColor={metrics.inactiveSoftwareSeats > 0 ? "destructive" : "default"}
            subText1={`${formatCurrency(metrics.inactiveSoftwareCostLeak)} monthly in idle seat waste`}
            subText2="Target for license subscription downgrade."
            href="/assets/software"
          />
        )}
      </div>
    </div>
  )
}
