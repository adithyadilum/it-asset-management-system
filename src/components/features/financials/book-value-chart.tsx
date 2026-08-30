'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { formatMoneyByCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface BookValuePoint {
  /** `YYYY-MM`. */
  month: string;
  bookValue: number;
}

function formatMonthLabel(month: string) {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

/**
 * Aggregate book value across the filtered estate, a year either side of now.
 *
 * Straight-line depreciation is a function of the purchase date alone, so the
 * future half is a projection rather than a forecast -- it is what these assets
 * will be worth if nothing is bought or disposed of. That is the point: the
 * slope shows when the estate falls off a cliff and needs replacing.
 */
export function BookValueChart({
  series,
  currencyCode = 'LKR',
  className,
}: {
  series: BookValuePoint[];
  currencyCode?: string;
  className?: string;
}) {
  if (series.length === 0) return null;

  // The series is built symmetrically around the current month, which is where
  // projection takes over from history.
  const currentMonth = series[Math.floor(series.length / 2)]?.month;

  return (
    <Card className={cn('border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-0">
        <CardTitle
          className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-foreground')}
        >
          Book value over time
        </CardTitle>
        <p
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textXsRegular,
            'text-muted-foreground'
          )}
        >
          Past twelve months and the projection ahead, for the assets matching
          the current filters.
        </p>
      </CardHeader>
      <CardContent className="h-56 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={1}>
          <AreaChart
            data={series}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            aria-label="Total book value by month"
          >
            <defs>
              <linearGradient id="bookValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
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
              labelFormatter={(label) => formatMonthLabel(String(label))}
              formatter={(value) => [
                formatMoneyByCurrency(Number(value), currencyCode),
                'Book value',
              ]}
            />
            {currentMonth ? (
              <ReferenceLine
                x={currentMonth}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: 'Today',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: 'var(--color-muted-foreground)',
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="bookValue"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#bookValueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
