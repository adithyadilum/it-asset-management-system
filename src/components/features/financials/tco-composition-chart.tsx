'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { formatMoneyByCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface TCOCompositionPoint {
  assetId: string;
  purchase: number;
  maintenance: number;
}

/**
 * Purchase against maintenance, one stacked bar per asset.
 *
 * The table gives three numbers per row and leaves the reader to divide them.
 * The comparison this page exists to support -- which assets have cost more to
 * keep than to buy -- is a shape, so draw it. Only the rows on screen are
 * charted; the totals above cover the whole filtered set.
 */
export function TCOCompositionChart({
  points,
  currencyCode = 'LKR',
  className,
}: {
  points: TCOCompositionPoint[];
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
          Purchase against maintenance
        </CardTitle>
        <p
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textXsRegular,
            'text-muted-foreground'
          )}
        >
          The {points.length} assets on this page. A tall orange band is an
          asset costing more to keep than it did to buy.
        </p>
      </CardHeader>
      <CardContent className="h-56 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={1}>
          <BarChart
            data={points}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            aria-label="Purchase and maintenance cost per asset"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="assetId"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
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
              cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
              contentStyle={{
                borderRadius: '6px',
                fontSize: '11px',
                border: '1px solid var(--color-border)',
                padding: '4px 8px',
                backgroundColor: 'var(--color-popover)',
                color: 'var(--color-popover-foreground)',
              }}
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
            <Bar
              name="Purchase"
              dataKey="purchase"
              stackId="tco"
              fill="var(--color-primary)"
            />
            <Bar
              name="Maintenance"
              dataKey="maintenance"
              stackId="tco"
              fill="var(--color-chart-4)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
