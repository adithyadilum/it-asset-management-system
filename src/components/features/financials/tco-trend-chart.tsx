'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { formatMoneyByCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface TCOTrendPoint {
  /** `YYYY-MM`. */
  month: string;
  purchase: number;
  maintenance: number;
  total: number;
}

/** `2026-08` -> `Aug 2026`, without dragging in a date library. */
function formatMonth(month: string) {
  const [year, monthPart] = month.split('-');
  const monthIndex = Number(monthPart) - 1;
  if (!year || Number.isNaN(monthIndex)) return month;
  const label = new Date(Date.UTC(Number(year), monthIndex, 1));
  return label.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Total cost of ownership accumulated over time.
 *
 * Purchase cost lands in one month and never moves; maintenance keeps
 * accruing. Running totals are what make that readable -- the gap between the
 * total line and the purchase line is the money spent since buying, widening
 * whenever repairs land. Per-period bars would show the same spend as isolated
 * spikes and answer a different question.
 */
export function TCOTrendChart({
  points,
  currencyCode = 'LKR',
  className,
}: {
  points: TCOTrendPoint[];
  currencyCode?: string;
  className?: string;
}) {
  if (points.length === 0) return null;

  return (
    <Card className={cn('border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-0">
        <CardTitle
          className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-foreground')}
        >
          Cost of ownership over time
        </CardTitle>
        <p
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textXsRegular,
            'text-muted-foreground'
          )}
        >
          Running totals across every asset the filters match. The gap between
          total and purchase is what has been spent keeping them running.
        </p>
      </CardHeader>
      <CardContent className="h-56 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={1}>
          <LineChart
            data={points}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            aria-label="Total, purchase and maintenance cost over time"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={formatMonth}
              tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={64}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat(undefined, {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(value)
              }
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-border)' }}
              contentStyle={{
                borderRadius: '6px',
                fontSize: '11px',
                border: '1px solid var(--color-border)',
                padding: '4px 8px',
                backgroundColor: 'var(--color-popover)',
                color: 'var(--color-popover-foreground)',
              }}
              labelFormatter={(label) =>
                typeof label === 'string' ? formatMonth(label) : label
              }
              formatter={(value, name) => [
                formatMoneyByCurrency(Number(value), currencyCode),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{
                fontSize: '11px',
                color: 'var(--color-muted-foreground)',
              }}
            />
            {/* Drawn last so it stays visible: maintenance is usually a few
                percent of purchase, which puts the total line right on top of
                the purchase line, and whichever is painted second wins. */}
            <Line
              name="Purchase cost"
              dataKey="purchase"
              type="monotone"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              name="Maintenance cost"
              dataKey="maintenance"
              type="monotone"
              stroke="var(--color-chart-4)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              name="Total cost"
              dataKey="total"
              type="monotone"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
