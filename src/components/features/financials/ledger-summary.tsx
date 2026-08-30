import { formatMoneyByCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface LedgerSummaryStat {
  label: string;
  /** Rendered as currency when `currencyCode` is set, otherwise verbatim. */
  value: number | string;
  currencyCode?: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning';
}

/**
 * The totals strip above a financial ledger.
 *
 * These pages were a heading and a grid, which meant the question they exist to
 * answer -- what is this estate worth, and how much of it has been written down
 * -- could only be reached by exporting the table and summing it by hand. The
 * figures cover everything the current filters match, not just the visible
 * page, so narrowing the filters narrows the totals with it.
 */
export function LedgerSummary({
  stats,
  asOf,
  className,
}: {
  stats: LedgerSummaryStat[];
  /** ISO timestamp the figures were computed at. */
  asOf?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold',
                stat.tone === 'positive' && 'text-emerald-600',
                stat.tone === 'warning' && 'text-amber-600'
              )}
            >
              {typeof stat.value === 'number' && stat.currencyCode
                ? formatMoneyByCurrency(stat.value, stat.currencyCode)
                : stat.value}
            </p>
            {stat.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      {asOf ? (
        <p className="text-xs text-muted-foreground">
          {/* Depreciation advances in whole calendar months, so this figure
              legitimately will not move until the month rolls over. */}
          Calculated {new Date(asOf).toLocaleString()} · depreciation advances
          monthly
        </p>
      ) : null}
    </div>
  );
}
