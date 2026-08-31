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
                What goes into the score and how to read it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm text-foreground">
              <p>
                A weighted average of six operational measures, scored out of
                100. Your fleet currently scores{' '}
                <strong>
                  {metrics.fleetHealthScore} / 100 &mdash;{' '}
                  {metrics.fleetHealthLabel}
                </strong>
                .
              </p>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">
                  What the score measures
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>
                    <strong>Condition (25%)</strong> &mdash; assets not in
                    repair, defective or lost.
                  </li>
                  <li>
                    <strong>Deployment (20%)</strong> &mdash; serviceable assets
                    assigned to a user or location. 85% or above scores full
                    marks.
                  </li>
                  <li>
                    <strong>Return discipline (15%)</strong> &mdash; open
                    assignments still within their due date.
                  </li>
                  <li>
                    <strong>Repeat repairs (15%)</strong> &mdash; assets with
                    fewer than three repair tickets.
                  </li>
                  <li>
                    <strong>Support cover (15%)</strong> &mdash; assets under
                    warranty, or past their useful life and due for replacement.
                  </li>
                  <li>
                    <strong>Licence use (10%)</strong> &mdash; purchased
                    software seats allocated to a user.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Ratings</h4>
                <p className="text-muted-foreground">
                  85&ndash;100 Excellent &middot; 70&ndash;84 Good &middot;
                  50&ndash;69 Fair &middot; below 50 Poor
                </p>
              </div>

              <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Measures that do not apply to your fleet are excluded and the
                remaining weights adjusted. Open the KPI cards above to see the
                assets and licences behind each measure.
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
