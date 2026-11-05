'use client';

import { LedgerSummary } from './ledger-summary';
import { Card } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatMoneyByCurrency } from '@/lib/currency';
import type { getPerHeadCostLedger } from '@/actions/per-head-costs';

type Report = Awaited<ReturnType<typeof getPerHeadCostLedger>>;
const money = (value: number) => formatMoneyByCurrency(value, 'LKR');
const compact = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
const month = (value: string) =>
  new Date(`${value}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });

export function PerHeadOverview({
  summary,
  trend,
  personal,
}: {
  summary: Report['summary'];
  trend: Report['trend'];
  personal: boolean;
}) {
  const costs = [
    { name: 'Equipment', value: summary.breakdown.equipment, color: '#37308d' },
    { name: 'Software', value: summary.breakdown.software, color: '#0d9488' },
    {
      name: 'Maintenance',
      value: summary.breakdown.maintenance,
      color: '#d97706',
    },
  ];
  return (
    <div className="space-y-6">
      <LedgerSummary
        stats={[
          {
            label: 'Total usage cost',
            value: summary.allocatedCost,
            currencyCode: 'LKR',
            hint: 'Equipment, software and maintenance',
          },
          {
            label: 'Cost per person',
            value: summary.averageCost,
            currencyCode: 'LKR',
            hint: 'Average across the selected period',
          },
          {
            label: 'People included',
            value: summary.peopleCount.toLocaleString(),
            hint: 'People using company assets',
          },
          {
            label: 'Assigned asset value',
            value: summary.currentBookValue,
            currencyCode: 'LKR',
            hint: `Purchased for ${money(summary.currentAcquisitionValue)}`,
          },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <Card className="min-w-0 gap-0 border-border p-4 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Cost over time</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {personal
                  ? 'Spending for the selected people'
                  : 'How company asset costs are shared each month'}
              </p>
            </div>
            <div className="flex gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                People
              </span>
              {!personal && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Overhead
                </span>
              )}
            </div>
          </div>
          <div className="h-60 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart
                data={trend}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="28%"
                accessibilityLayer
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={month}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  dy={8}
                />
                <YAxis
                  tickFormatter={compact}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  labelFormatter={(v) =>
                    new Date(`${v}-01T12:00:00Z`).toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })
                  }
                  formatter={(v) => money(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="allocated"
                  name="Allocated to people"
                  stackId="cost"
                  fill="#37308d"
                  maxBarSize={44}
                  isAnimationActive={false}
                  radius={personal ? [4, 4, 0, 0] : undefined}
                />
                {!personal && (
                  <Bar
                    dataKey="overhead"
                    name="Unallocated overhead"
                    stackId="cost"
                    fill="#fbbf24"
                    maxBarSize={44}
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!personal && (
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>Unallocated overhead {money(summary.overheadCost)}</span>
              <span>
                Unused software seats {money(summary.unusedSoftwareCost)}
              </span>
            </div>
          )}
        </Card>
        <Card className="gap-0 border-border p-4 shadow-sm">
          <h2 className="font-semibold">Where the cost goes</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A breakdown of allocated usage costs
          </p>
          <div className="relative mx-auto mt-2 h-44 w-full max-w-56">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <PieChart accessibilityLayer>
                <Pie
                  data={
                    summary.allocatedCost > 0
                      ? costs
                      : [{ name: 'No spending', value: 1, color: '#e5e7eb' }]
                  }
                  dataKey="value"
                  isAnimationActive={false}
                  innerRadius="66%"
                  outerRadius="88%"
                  strokeWidth={3}
                  paddingAngle={summary.allocatedCost > 0 ? 3 : 0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {(summary.allocatedCost > 0
                    ? costs
                    : [{ name: 'No spending', value: 1, color: '#e5e7eb' }]
                  ).map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tabular-nums">
                {compact(summary.allocatedCost)}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                LKR allocated
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-3">
            {costs.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
                <span className="font-medium tabular-nums">
                  {money(c.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
