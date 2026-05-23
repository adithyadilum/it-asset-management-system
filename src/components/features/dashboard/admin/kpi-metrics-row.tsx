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

export function KpiMetricsRow({ metrics }: KpiMetricsRowProps) {
  const depreciationRate = metrics.totalAssetValue > 0
    ? (1 - metrics.netBookValue / metrics.totalAssetValue) * 100
    : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard 
        title="Total Asset Value"
        value={formatCurrency(metrics.totalAssetValue)}
        badgeText="+2.4%"
        badgeType="positive"
        valueColor="default"
        subText1="Acquisition cost of active inventory"
        subText2="Includes hardware, software, and facilities."
        href="/financials/tco"
      />
      <KpiCard 
        title="Net Book Value"
        value={formatCurrency(metrics.netBookValue)}
        badgeText={`-${depreciationRate.toFixed(1)}%`}
        badgeType="negative"
        valueColor="default"
        subText1="Depreciated value of asset base"
        subText2="Calculated via straight-line depreciation."
        href="/financials/depreciation"
      />
      <KpiCard 
        title="Inactive Software Seats"
        value={`${formatNumber(metrics.inactiveSoftwareSeats)} Seats`}
        badgeText={`-${formatCompactCurrency(metrics.inactiveSoftwareCostLeak)}/mo`}
        badgeType="negative"
        valueColor="destructive"
        subText1={`${formatCurrency(metrics.inactiveSoftwareCostLeak)} monthly in idle seat waste`}
        subText2="Target for license subscription downgrade."
        href="/assets/software"
      />
      <KpiCard 
        title="Warranty Expiry (30 Days)"
        value={`${formatNumber(metrics.warrantyExpiries30Days)} Assets`}
        badgeText="Risk"
        badgeType="negative"
        valueColor="warning"
        subText1={`${formatNumber(metrics.warrantyExpiries30Days)} active devices near support end`}
        subText2="Action needed to renew or retire."
        href="/assets/hardware"
      />
      <KpiCard 
        title="Cumulative Repair Spend"
        value={formatCurrency(metrics.cumulativeRepairSpend)}
        badgeText="-4.5%"
        badgeType="positive"
        valueColor="default"
        subText1="Actual maintenance expenditures"
        subText2="Target limit: Under $20K/annum."
        href="/operations/maintenance"
      />
      <KpiCard 
        title="Software Renewals (30 Days)"
        value={`${formatNumber(metrics.softwareRenewals30Days)} Licenses`}
        badgeText="Risk"
        badgeType="negative"
        valueColor="warning"
        subText1={`${formatNumber(metrics.softwareRenewals30Days)} critical subscriptions near expiry`}
        subText2={`Affects ${formatNumber(metrics.impactedSoftwareEmployees)} employee custodians.`}
        href="/assets/software"
      />
    </div>
  )
}
