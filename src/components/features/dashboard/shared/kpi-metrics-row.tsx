import { KpiCard } from './kpi-card';
import type { DashboardKpiMetrics } from '@/types/dashboard';
import { getCurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

function getHealthColor(
  label: string
): 'success' | 'warning' | 'destructive' | 'default' {
  if (label === 'Excellent' || label === 'Good') return 'success';
  if (label === 'Fair') return 'warning';
  if (label === 'Poor') return 'destructive';
  return 'default';
}

/**
 * Column counts as literal class names.
 *
 * Tailwind's scanner reads source text, so `lg:grid-cols-${n}` would compile
 * to nothing at all -- the class has to appear verbatim somewhere.
 */
const GRID_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function KpiMetricsRow({
  metrics,
  currencyCode = 'LKR',
  exchangeRate = 1,
  isAuditor = false,
}: KpiMetricsRowProps) {
  const depreciationRate =
    (metrics.totalAssetValue ?? 0) > 0
      ? (1 - (metrics.netBookValue ?? 0) / (metrics.totalAssetValue ?? 1)) * 100
      : 0;

  const showFinancials = metrics.totalAssetValue !== undefined;

  const convertedTotalAssetValue =
    (metrics.totalAssetValue ?? 0) * exchangeRate;
  const convertedNetBookValue = (metrics.netBookValue ?? 0) * exchangeRate;
  const convertedRepairSpend =
    (metrics.cumulativeRepairSpend ?? 0) * exchangeRate;
  const convertedSoftwareCostLeak =
    (metrics.inactiveSoftwareCostLeak ?? 0) * exchangeRate;

  // How many cards each row actually renders. The column counts used to be
  // hardcoded to four, so a role that sees fewer -- an IT Operator gets no
  // financial cards -- left the right-hand half of every row empty.
  const heroCardCount =
    2 + // Total Assets and Fleet Health are always shown
    (showFinancials ? 1 : 0) +
    (showFinancials && metrics.netBookValue !== undefined ? 1 : 0);

  const secondaryCardCount =
    (isAuditor ? 0 : 2) + // Warranty Expiry and Software Renewals
    (metrics.cumulativeRepairSpend !== undefined ? 1 : 0) +
    (metrics.inactiveSoftwareCostLeak !== undefined ? 1 : 0);

  const totalCardCount = heroCardCount + secondaryCardCount;
  const singleRow = totalCardCount <= 4;

  const secondaryCards = (
    <>
      {/* Warranty Expiry */}
      {!isAuditor && (
        <KpiCard
          title="Warranty Expiry (30d)"
          value={`${formatNumber(metrics.warrantyExpiries30Days)} Assets`}
          badgeText="Risk"
          badgeType={
            metrics.warrantyExpiries30Days > 0 ? 'negative' : 'positive'
          }
          valueColor={
            metrics.warrantyExpiries30Days > 0 ? 'warning' : 'default'
          }
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
          badgeType={
            metrics.softwareRenewals30Days > 0 ? 'negative' : 'positive'
          }
          valueColor={
            metrics.softwareRenewals30Days > 0 ? 'warning' : 'default'
          }
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
            (metrics.repairSpendTrend ?? 0) <= 0 ? 'positive' : 'negative'
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
          valueColor={
            metrics.inactiveSoftwareSeats > 0 ? 'destructive' : 'default'
          }
          subText1={`${getCurrencySymbol(currencyCode)}${formatValueWithoutSymbol(convertedSoftwareCostLeak)} monthly in idle seat waste`}
          subText2="Target for license subscription downgrade."
          href="/assets/software"
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* ─── KPI cards ────────────────────────────────────────────────── */}
      <div
        className={cn(
          'grid gap-3 grid-cols-1 sm:grid-cols-2',
          GRID_COLUMNS[singleRow ? totalCardCount : heroCardCount]
        )}
      >
        {/* Total Assets — always visible */}
        <KpiCard
          size="hero"
          title="Total Assets"
          value={formatNumber(metrics.totalActiveAssets)}
          badgeText={
            metrics.totalActiveAssetsChange > 0
              ? `+${metrics.totalActiveAssetsChange} MTD`
              : metrics.totalActiveAssetsChange === 0
                ? 'No change'
                : `${metrics.totalActiveAssetsChange} MTD`
          }
          badgeType={
            metrics.totalActiveAssetsChange >= 0 ? 'positive' : 'negative'
          }
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
                  metrics.fleetHealthLabel === 'Excellent' ||
                  metrics.fleetHealthLabel === 'Good'
                    ? 'positive'
                    : metrics.fleetHealthLabel === 'Fair'
                      ? 'neutral'
                      : 'negative'
                }
                valueColor={getHealthColor(metrics.fleetHealthLabel)}
                subText1="Composite fleet health indicator"
                subText2="Utilization, warranty, repairs, compliance."
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fleet Health Score</DialogTitle>
              <DialogDescription>
                How this metric is calculated and why it matters to your
                organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm text-foreground">
              <p>
                The <strong>Fleet Health Score</strong> (
                {metrics.fleetHealthScore}/100 &mdash;{' '}
                {metrics.fleetHealthLabel}) is a weighted average of six
                measures, each one a way the fleet quietly costs money when it
                slips.
              </p>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">
                  What it measures
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>
                    <strong>Condition (25%):</strong> share of the fleet not
                    currently in repair, defective or lost.
                  </li>
                  <li>
                    <strong>Deployment (20%):</strong> how much serviceable kit
                    is assigned. Broken and end-of-life assets are excluded, and
                    85% earns full marks &mdash; keeping a spare pool is good
                    practice, not a fault.
                  </li>
                  <li>
                    <strong>Return discipline (15%):</strong> open assignments
                    that are past their expected return date.
                  </li>
                  <li>
                    <strong>Repeat repairs (15%):</strong> assets with three or
                    more repairs, which are usually cheaper to replace than to
                    fix again.
                  </li>
                  <li>
                    <strong>Support cover (15%):</strong> assets either under
                    warranty or already past their useful life. An asset due for
                    replacement is not an exposure, so it counts as covered.
                  </li>
                  <li>
                    <strong>Licence use (10%):</strong> purchased seats on
                    active licences that are actually allocated.
                  </li>
                </ul>
              </div>

              <p className="text-muted-foreground">
                A measure with nothing to count is dropped and the rest are
                reweighted, so a fleet with no software licences is not marked
                down for seats it never bought. Bands:{' '}
                <strong>85+ Excellent</strong>, <strong>70+ Good</strong>,{' '}
                <strong>50+ Fair</strong>, below that <strong>Poor</strong>.
              </p>

              <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                <strong>How to use it:</strong> the score is only useful as a
                pointer to the component dragging it down. A low reading is
                always attributable &mdash; idle stock to reclaim, kit out on
                loan past its return date, devices worth retiring rather than
                repairing again, assets running without cover, or licences paid
                for and unassigned. Every measure is one a well-run fleet can
                score full marks on.
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Merged in rather than left to a second grid, so a role that sees
            only four cards gets one full-width row instead of two half-empty
            ones. */}
        {singleRow && secondaryCards}
      </div>

      {/* Row 2 only exists when there are more cards than fit one row. */}
      {!singleRow && (
        <div
          className={cn(
            'grid gap-3 grid-cols-1 sm:grid-cols-2',
            GRID_COLUMNS[secondaryCardCount]
          )}
        >
          {secondaryCards}
        </div>
      )}
    </div>
  );
}
