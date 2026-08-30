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

export interface SalvageOutcomePoint {
  status: string;
  count: number;
  expected: number;
  realised: number;
}

/**
 * Expected against realised salvage, grouped by disposal outcome.
 *
 * A single estate-wide variance hides which kind of disposal is missing its
 * estimate. Sold assets and scrapped ones are forecast differently, so they are
 * worth seeing apart.
 */
export function SalvageOutcomeChart({
  points,
  currencyCode = 'LKR',
  className,
}: {
  points: SalvageOutcomePoint[];
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
          Salvage by disposal outcome
        </CardTitle>
        <p
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textXsRegular,
            'text-muted-foreground'
          )}
        >
          What each kind of disposal was expected to recover, against what it
          did.
        </p>
      </CardHeader>
      <CardContent className="h-56 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={1}>
          <BarChart
            data={points}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barGap={4}
            aria-label="Expected and realised salvage value by disposal outcome"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="status"
              axisLine={false}
              tickLine={false}
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
              name="Expected"
              dataKey="expected"
              fill="var(--color-muted-foreground)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              name="Realised"
              dataKey="realised"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
