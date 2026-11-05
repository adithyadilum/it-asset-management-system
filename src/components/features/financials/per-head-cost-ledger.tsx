'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, Settings, Search } from 'lucide-react';
import {
  getPerHeadCostLedger,
  getPersonCostBreakdown,
  exportPerHeadCosts,
} from '@/actions/per-head-costs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LedgerSummary } from './ledger-summary';
import { DataTable } from '@/components/shared/data-table';
import { SlidePanel } from '@/components/shared/slide-panel';
import { formatMoneyByCurrency } from '@/lib/currency';
import type { PersonCostRow } from '@/types/per-head-costs';
import type { PerHeadQuery } from '@/lib/validations/per-head-costs';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Response = Awaited<ReturnType<typeof getPerHeadCostLedger>>;
type Options = Awaited<
  ReturnType<
    typeof import('@/actions/per-head-costs').getPerHeadCostFilterOptions
  >
>;
const amount = (value: number) => formatMoneyByCurrency(value, 'LKR');
const componentLabels = {
  directDepreciation: 'Direct depreciation',
  sharedDepreciation: 'Shared depreciation',
  software: 'Software expense',
  repairs: 'Repair overhead',
};
const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm';

export function PerHeadCostLedger({
  initialData,
  initialQuery,
  filterOptions,
  canConfigure,
}: {
  initialData: Response;
  initialQuery: PerHeadQuery;
  filterOptions: Options;
  canConfigure: boolean;
}) {
  const [result, setResult] = useState(initialData),
    [query, setQuery] = useState(initialQuery);
  const [draft, setDraft] = useState(initialQuery),
    [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getPersonCostBreakdown>
  > | null>(null);
  const [detailOpen, setDetailOpen] = useState(false),
    [detailLoading, setDetailLoading] = useState(false);
  const request = useRef(0),
    detailRequest = useRef(0);
  const load = (next: PerHeadQuery) => {
    const token = ++request.current;
    setError('');
    startTransition(async () => {
      try {
        const response = await getPerHeadCostLedger(next);
        if (token === request.current) {
          setResult(response);
          setQuery(next);
          setDetailOpen(false);
          detailRequest.current++;
        }
      } catch (e) {
        if (token === request.current)
          setError(
            e instanceof Error ? e.message : 'Could not load this report.'
          );
      }
    });
  };
  const showDetail = async (personId: string) => {
    const token = ++detailRequest.current;
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await getPersonCostBreakdown(query, personId);
      if (token === detailRequest.current) setDetail(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load cost details.');
      setDetailOpen(false);
    } finally {
      if (token === detailRequest.current) setDetailLoading(false);
    }
  };
  const download = () =>
    startTransition(async () => {
      try {
        const csv = await exportPerHeadCosts(query);
        const url = URL.createObjectURL(
          new Blob([csv], { type: 'text/csv;charset=utf-8' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `per-head-costs-${query.from}-${query.to}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Export failed.');
      }
    });
  const columns: ColumnDef<PersonCostRow>[] = [
    {
      accessorKey: 'name',
      header: 'Person',
      cell: ({ row }) => (
        <button
          className="text-left font-medium text-primary hover:underline"
          onClick={() => void showDetail(row.original.id)}
        >
          {row.original.name}
          <span className="block text-xs font-normal text-muted-foreground">
            {row.original.email}
          </span>
        </button>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Current department',
      cell: ({ row }) => row.original.department ?? 'Unspecified',
    },
    ...(
      [
        'directDepreciation',
        'sharedDepreciation',
        'software',
        'repairs',
        'totalCost',
        'currentAcquisitionValue',
        'currentBookValue',
      ] as const
    ).map((key, i) => ({
      accessorKey: key,
      header: [
        'Direct depreciation',
        'Shared depreciation',
        'Software expense',
        'Repair overhead',
        'Period usage cost',
        'Current acquisition share',
        'Current book value share',
      ][i],
      cell: ({ row }: { row: { original: PersonCostRow } }) =>
        amount(row.original[key]),
    })),
    {
      id: 'status',
      header: 'Data status',
      cell: ({ row }) =>
        row.original.incomplete
          ? 'Needs review'
          : row.original.eligibleInPeriod
            ? 'Known costs'
            : 'Current assets only',
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Per-head Cost Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usage cost by recorded custody and membership. All amounts are in
            LKR.
          </p>
        </div>
        <div className="flex gap-2">
          {canConfigure && (
            <Button variant="outline" asChild>
              <Link href="/financials/per-head/configuration">
                <Settings className="mr-2 h-4 w-4" />
                Cost configuration
              </Link>
            </Button>
          )}
          <Button onClick={download} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV (LKR)
          </Button>
        </div>
      </div>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load({ ...draft, page: 1 });
        }}
      >
        <label className="space-y-1 text-sm">
          Month
          <Input
            type="month"
            aria-label="Reporting month"
            value={
              draft.from.slice(0, 7) === draft.to.slice(0, 7)
                ? draft.from.slice(0, 7)
                : ''
            }
            onChange={(event) => {
              if (!event.target.value) return;
              const [year, month] = event.target.value.split('-').map(Number);
              setDraft({
                ...draft,
                from: `${event.target.value}-01`,
                to: `${event.target.value}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`,
              });
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          From
          <Input
            aria-label="Period from"
            type="date"
            value={draft.from}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />
        </label>
        <label className="space-y-1 text-sm">
          Through
          <Input
            aria-label="Period through"
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cost group
          <select
            aria-label="Cost group"
            className={selectClass}
            value={draft.groupId ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                groupId: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          >
            <option value="">All groups</option>
            {filterOptions.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Asset pillar
          <select
            aria-label="Asset pillar"
            className={selectClass}
            value={draft.pillar ?? ''}
            onChange={(event) =>
              setDraft({
                ...draft,
                pillar: (event.target.value ||
                  undefined) as PerHeadQuery['pillar'],
                category: undefined,
              })
            }
          >
            <option value="">All pillars</option>
            {[
              'Hardware',
              'Software',
              'Office Furniture',
              'Office Electronics',
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            aria-label="Asset category"
            className={selectClass}
            value={draft.category ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value || undefined })
            }
          >
            <option value="">All categories</option>
            {filterOptions.categories
              .filter((c) => !draft.pillar || c.pillar === draft.pillar)
              .map((c) => (
                <option key={`${c.pillar}:${c.name}`}>{c.name}</option>
              ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Person
          <Input
            aria-label="Search people"
            placeholder="Name or email"
            value={draft.search ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, search: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sort
          <select
            aria-label="Sort people"
            className={selectClass}
            value={draft.sort ?? 'cost'}
            onChange={(event) =>
              setDraft({
                ...draft,
                sort: event.target.value as PerHeadQuery['sort'],
              })
            }
          >
            <option value="cost">Usage cost</option>
            <option value="name">Name</option>
            <option value="value">Assigned value</option>
          </select>
        </label>
        <Button disabled={isPending} type="submit">
          <Search className="mr-2 h-4 w-4" />
          {isPending ? 'Calculating…' : 'Apply'}
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          {error} The last successful report remains below.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Period: {result.metadata.from} through {result.metadata.to} ·{' '}
        {result.metadata.timezone} · Generated{' '}
        {new Date(result.metadata.generatedAt).toLocaleString('en-GB', {
          timeZone: 'Asia/Colombo',
        })}
        . Current asset values are as of that generation time.
      </p>
      <LedgerSummary
        incompleteCosts={result.summary.incompleteRecords}
        stats={[
          {
            label: 'Allocated period usage',
            value: result.summary.allocatedCost,
            currencyCode: 'LKR',
          },
          {
            label: 'Overhead / unallocated',
            value: result.summary.overheadCost,
            currencyCode: 'LKR',
            hint: `Unused software: ${amount(result.summary.unusedSoftwareCost)}`,
          },
          {
            label: 'Average per included person',
            value: result.summary.averageCost,
            currencyCode: 'LKR',
            hint: `${result.summary.peopleCount} ${result.summary.peopleCount === 1 ? 'person' : 'people'} eligible during the period`,
          },
          {
            label: 'Current assigned acquisition share',
            value: result.summary.currentAcquisitionValue,
            currencyCode: 'LKR',
            hint: `Current book share: ${amount(result.summary.currentBookValue)}`,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Source expense: {amount(result.summary.sourceCost)} = shown people{' '}
        {amount(result.summary.allocatedCost)} + other people{' '}
        {amount(result.summary.otherPeopleCost)} + overhead{' '}
        {amount(result.summary.overheadCost)}. Unpriced records are excluded
        from these known totals.
      </p>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 text-base font-medium">
          Monthly usage cost for the asset and group scope
        </h2>
        <div className="h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => Number(v).toLocaleString()} />
              <Tooltip formatter={(v) => amount(Number(v))} />
              <Bar
                dataKey="allocated"
                name="Allocated to people"
                stackId="cost"
                stroke="var(--primary)"
                fill="var(--primary)"
                maxBarSize={60}
              />
              <Bar
                dataKey="overhead"
                name="Overhead"
                stackId="cost"
                stroke="#d97706"
                fill="#d97706"
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Person search changes the table and allocated summary. This chart
          retains the full asset/group scope so allocation shares stay constant.
        </p>
      </div>
      <div aria-busy={isPending} className="flex h-[600px] flex-col">
        <DataTable
          columns={columns}
          data={result.data}
          enableRowSelection={false}
          manualPagination
          pageCount={result.meta.totalPages}
          paginationState={{
            pageIndex: result.meta.page - 1,
            pageSize: result.meta.pageSize,
          }}
          onPaginationChange={(next) => {
            const current = {
              pageIndex: result.meta.page - 1,
              pageSize: result.meta.pageSize,
            };
            const value = typeof next === 'function' ? next(current) : next;
            load({
              ...query,
              page: value.pageIndex + 1,
              pageSize: value.pageSize,
            });
          }}
          pageSizeOptions={[16, 32, 48, 100]}
          initialPageSize={16}
          className="min-h-0 flex-1"
        />
      </div>
      {result.exceptions.length > 0 && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">
            Data requiring review ({result.exceptions.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {result.exceptions.map((e, i) => (
              <li key={`${e.source}:${i}`}>
                <span className="font-medium">{e.source}</span>: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      <SlidePanel
        isOpen={detailOpen}
        onClose={(open) => {
          setDetailOpen(open);
          if (!open) detailRequest.current++;
        }}
        title={detail?.person.name ?? 'Person cost details'}
        content={
          detailLoading ? (
            <p className="p-6">Loading cost details…</p>
          ) : detail ? (
            <div className="space-y-4 p-6">
              <p className="text-sm">
                {detail.person.email} · {detail.metadata.from} through{' '}
                {detail.metadata.to}
              </p>
              <p>
                Period usage: <strong>{amount(detail.person.totalCost)}</strong>
              </p>
              <p>
                Current acquisition share:{' '}
                {amount(detail.person.currentAcquisitionValue)} · Current book
                share: {amount(detail.person.currentBookValue)}
              </p>
              <p className="text-sm text-muted-foreground">
                Currently allocated assets: {detail.person.assetCount}; software
                seats: {detail.person.softwareSeats}.
              </p>
              <h3 className="font-medium">Currently allocated assets</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Allocation</th>
                      <th className="p-2">Acquisition share</th>
                      <th className="p-2">Book share</th>
                      <th className="p-2">Whole asset acquisition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.currentAssets.map((asset) => (
                      <tr className="border-t" key={asset.assetId}>
                        <td className="p-2">{asset.assetTag}</td>
                        <td className="p-2">{asset.kind}</td>
                        <td className="p-2">
                          {asset.acquisitionShare == null
                            ? 'Unpriced'
                            : amount(asset.acquisitionShare)}
                        </td>
                        <td className="p-2">
                          {asset.bookShare == null
                            ? 'Unpriced'
                            : amount(asset.bookShare)}
                        </td>
                        <td className="p-2">
                          {asset.wholeAcquisitionValue == null
                            ? 'Unpriced'
                            : amount(asset.wholeAcquisitionValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="font-medium">Period expense detail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Month</th>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Source</th>
                      <th className="p-2 text-right">LKR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.details.map((d, i) => (
                      <tr className="border-t" key={i}>
                        <td className="p-2">{d.month}</td>
                        <td className="p-2">{d.assetTag}</td>
                        <td className="p-2">{componentLabels[d.component]}</td>
                        <td className="p-2">{d.source}</td>
                        <td className="p-2 text-right">{amount(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.details.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No known expense lines in this period.
                </p>
              )}
            </div>
          ) : null
        }
      />
    </div>
  );
}
