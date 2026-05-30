import { KpiCard } from "./kpi-card"
import type { DashboardKpiMetrics } from "@/actions/dashboard/shared"
import { getCurrencySymbol } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export interface KpiMetricsRowProps {
  metrics: DashboardKpiMetrics;
  currencyCode?: string;
  exchangeRate?: number;
  isAuditor?: boolean;
}

function formatValueWithoutSymbol(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
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

export function KpiMetricsRow({ metrics, currencyCode = 'LKR', exchangeRate = 1, isAuditor = false }: KpiMetricsRowProps) {
  const depreciationRate = (metrics.totalAssetValue ?? 0) > 0
    ? (1 - (metrics.netBookValue ?? 0) / (metrics.totalAssetValue ?? 1)) * 100
    : 0;

  const showFinancials = metrics.totalAssetValue !== undefined;
  
  const convertedTotalAssetValue = (metrics.totalAssetValue ?? 0) * exchangeRate;
  const convertedNetBookValue = (metrics.netBookValue ?? 0) * exchangeRate;
  const convertedRepairSpend = (metrics.cumulativeRepairSpend ?? 0) * exchangeRate;
  const convertedSoftwareCostLeak = (metrics.inactiveSoftwareCostLeak ?? 0) * exchangeRate;

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
            value={formatValueWithoutSymbol(convertedTotalAssetValue)}
            currencySymbol={getCurrencySymbol(currencyCode)}
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
            value={formatValueWithoutSymbol(convertedNetBookValue)}
            currencySymbol={getCurrencySymbol(currencyCode)}
            badgeText={`-${depreciationRate.toFixed(1)}%`}
            badgeType="negative"
            subText1="Depreciated value of asset base"
            subText2="Calculated via straight-line depreciation."
            href="/financials/depreciation"
          />
        )}

        {/* Fleet Health Score — always visible */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="h-full">
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
                isInteractive={true}
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fleet Health Score</DialogTitle>
              <DialogDescription>
                How this metric is calculated and why it matters to your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm text-foreground">
              <p>
                The <strong>Fleet Health Score</strong> ({metrics.fleetHealthScore}/100) is a composite index representing the overall operational efficiency, financial risk, and reliability of your entire IT asset infrastructure.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Key Factors:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><strong>Utilization Rate:</strong> Measures the ratio of active, assigned assets against idle inventory. High idle counts lower the score.</li>
                  <li><strong>Warranty Coverage:</strong> Tracks the percentage of active hardware still protected by vendor warranties, reducing out-of-pocket repair risks.</li>
                  <li><strong>Maintenance Overhead:</strong> Penalizes fleets with disproportionately high repair frequencies or excessive cumulative maintenance spend.</li>
                  <li><strong>Software Compliance:</strong> Monitors license allocations to prevent costly over-provisioning (idle seats) or compliance breaches.</li>
                </ul>
              </div>

              <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground mt-4">
                <strong>Why it&apos;s needed:</strong> This single metric helps IT Directors quickly gauge if the asset fleet is optimized or if intervention (e.g., renewing warranties, downgrading software tiers, retiring broken hardware) is required.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Row 2: Secondary KPIs ─────────────────────────────────────── */}
      <div className={cn("grid gap-3 grid-cols-1 sm:grid-cols-2", isAuditor ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
        {/* Warranty Expiry */}
        {!isAuditor && (
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
        )}

        {/* Software Renewals */}
        {!isAuditor && (
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
        )}

        {/* Cumulative Repair Spend — financial roles only */}
        {metrics.cumulativeRepairSpend !== undefined && (
          <KpiCard
            title="Cumulative Repair Spend"
            value={formatValueWithoutSymbol(convertedRepairSpend)}
            currencySymbol={getCurrencySymbol(currencyCode)}
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
            badgeText={`-${getCurrencySymbol(currencyCode)}${formatValueWithoutSymbol(convertedSoftwareCostLeak)}/mo`}
            badgeType="negative"
            valueColor={metrics.inactiveSoftwareSeats > 0 ? "destructive" : "default"}
            subText1={`${getCurrencySymbol(currencyCode)}${formatValueWithoutSymbol(convertedSoftwareCostLeak)} monthly in idle seat waste`}
            subText2="Target for license subscription downgrade."
            href="/assets/software"
          />
        )}
      </div>
    </div>
  )
}
