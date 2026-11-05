'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, Settings, ChevronRight } from 'lucide-react';
import {
  getPerHeadCostLedger,
  getPersonCostBreakdown,
  exportPerHeadCosts,
} from '@/actions/per-head-costs';
import { Button } from '@/components/ui/button';
import { FilterBar, type AppliedFilter } from '@/components/shared/filter-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PerHeadOverview } from './per-head-overview';
import {
  addMonths,
  localDate,
  monthStart,
  reportDate,
} from '@/lib/reporting-time';
import { DataTable } from '@/components/shared/data-table';
import { SlidePanel } from '@/components/shared/slide-panel';
import { formatMoneyByCurrency } from '@/lib/currency';
import type { PersonCostRow } from '@/types/per-head-costs';
import type { PerHeadQuery } from '@/lib/validations/per-head-costs';
import type { ColumnDef } from '@tanstack/react-table';

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
  const [preset, setPreset] = useState('sixMonths');
  const [more, setMore] = useState(false);
  const requested = useRef(initialQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    []
  );
  const load = (next: PerHeadQuery) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    requested.current = next;
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
  const change = (patch: Partial<PerHeadQuery>, debounce = false) => {
    const next = { ...requested.current, ...patch, page: 1 };
    requested.current = next;
    setDraft(next);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (debounce)
      searchTimer.current = setTimeout(() => load(requested.current), 300);
    else load(next);
  };
  const selectPeriod = (value: string) => {
    setPreset(value);
    if (value === 'custom') {
      setMore(true);
      return;
    }
    const today = localDate(new Date(initialData.metadata.asOf)),
      start = monthStart(reportDate(today));
    const from =
      value === 'month'
        ? localDate(start)
        : value === 'lastMonth'
          ? localDate(addMonths(start, -1))
          : value === 'year'
            ? `${today.slice(0, 4)}-01-01`
            : localDate(addMonths(start, -5));
    change({
      from,
      to: value === 'lastMonth' ? localDate(start - 86400000) : today,
    });
  };
  const columns: ColumnDef<PersonCostRow>[] = [
    {
      accessorKey: 'name',
      header: 'Person',
      size: 240,
      minSize: 190,
      cell: ({ row }) => (
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => void showDetail(row.original.id)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/7 text-xs font-semibold text-primary">
            {row.original.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </span>
          <span>
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {row.original.department ?? 'Company team'}
            </span>
          </span>
        </button>
      ),
    },
    {
      id: 'equipment',
      header: () => <div className="text-right">Equipment</div>,
      size: 125,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {amount(
            row.original.directDepreciation + row.original.sharedDepreciation
          )}
        </div>
      ),
    },
    {
      accessorKey: 'software',
      header: () => <div className="text-right">Software</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {amount(row.original.software)}
        </div>
      ),
    },
    {
      accessorKey: 'repairs',
      header: () => <div className="text-right">Maintenance</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {amount(row.original.repairs)}
        </div>
      ),
    },
    {
      accessorKey: 'totalCost',
      header: () => <div className="text-right">Usage cost</div>,
      size: 135,
      cell: ({ row }) => (
        <div className="text-right font-semibold tabular-nums text-primary">
          {amount(row.original.totalCost)}
        </div>
      ),
    },
    {
      accessorKey: 'currentBookValue',
      header: () => <div className="text-right">Assigned value</div>,
      size: 140,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {amount(row.original.currentBookValue)}
        </div>
      ),
    },
    {
      id: 'details',
      header: '',
      size: 45,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`View ${row.original.name}'s costs`}
          onClick={() => void showDetail(row.original.id)}
        >
          <ChevronRight className="size-4" />
        </Button>
      ),
    },
  ];
  const groupName = (group?: { name: string }) =>
    group?.name.replace('Location:', 'Workplace:') ?? '';
  const filters: AppliedFilter[] = [
    ...(draft.groupId
      ? [
          {
            field: 'Team or workplace',
            operator: 'is' as const,
            value: groupName(
              filterOptions.groups.find((g) => g.id === draft.groupId)!
            ),
          },
        ]
      : []),
    ...(draft.pillar
      ? [
          {
            field: 'Asset pillar',
            operator: 'is' as const,
            value: draft.pillar,
          },
        ]
      : []),
    ...(draft.category
      ? [
          {
            field: 'Asset category',
            operator: 'is' as const,
            value: draft.category,
          },
        ]
      : []),
  ];
  const apply = (filter: AppliedFilter) => {
    if (filter.field === 'Team or workplace')
      change({
        groupId: filterOptions.groups.find((g) => groupName(g) === filter.value)
          ?.id,
      });
    else if (filter.field === 'Asset pillar')
      change({
        pillar: filter.value as PerHeadQuery['pillar'],
        category: undefined,
      });
    else change({ category: filter.value });
  };
  const clear = (field: string) =>
    change(
      field === 'Team or workplace'
        ? { groupId: undefined }
        : field === 'Asset pillar'
          ? { pillar: undefined, category: undefined }
          : { category: undefined }
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Per-head Cost Analysis</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Understand the cost of equipping your team. All amounts are in LKR.
          </p>
        </div>
        {canConfigure && (
          <Button variant="outline" asChild>
            <Link href="/financials/per-head/configuration">
              <Settings className="mr-2 size-4" />
              Cost settings
            </Link>
          </Button>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div
        className={
          isPending ? 'opacity-65 transition-opacity' : 'transition-opacity'
        }
        aria-busy={isPending}
      >
        <PerHeadOverview
          summary={result.summary}
          trend={result.trend}
          personal={Boolean(query.search || query.groupId)}
        />
      </div>
      <FilterBar
        searchQuery={draft.search ?? ''}
        onSearchChange={(text) => change({ search: text }, true)}
        searchPlaceholder="Search people..."
        searchLabel="Search people"
        allowedOperators={['is']}
        fields={[
          {
            value: 'Team or workplace',
            label: 'Team or workplace',
            options: filterOptions.groups.map(groupName),
          },
          {
            value: 'Asset pillar',
            label: 'Asset pillar',
            options: [
              'Hardware',
              'Software',
              'Office Furniture',
              'Office Electronics',
            ],
          },
          {
            value: 'Asset category',
            label: 'Asset category',
            options: [
              ...new Set(
                filterOptions.categories
                  .filter((c) => !draft.pillar || c.pillar === draft.pillar)
                  .map((c) => c.name)
              ),
            ],
          },
        ]}
        appliedFilters={filters}
        onApplyFilter={apply}
        onClearFilter={clear}
        onClearAllFilters={() =>
          change({ groupId: undefined, pillar: undefined, category: undefined })
        }
      >
        <Select value={preset} onValueChange={selectPeriod}>
          <SelectTrigger
            aria-label="Reporting period"
            className="h-9 w-[160px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sixMonths">Last 6 months</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="lastMonth">Last month</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="custom">Custom dates</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={draft.sort ?? 'cost'}
          onValueChange={(sort) =>
            change({ sort: sort as PerHeadQuery['sort'] })
          }
        >
          <SelectTrigger aria-label="Sort people" className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">Highest cost</SelectItem>
            <SelectItem value="name">Name A to Z</SelectItem>
            <SelectItem value="value">Asset value</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={download} disabled={isPending}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </FilterBar>
      {more && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPreset('custom');
            load({ ...draft, page: 1 });
          }}
        >
          <label className="space-y-1 text-xs text-muted-foreground">
            From
            <Input
              aria-label="Period from"
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft({ ...draft, from: event.target.value })
              }
              required
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Through
            <Input
              aria-label="Period through"
              type="date"
              value={draft.to}
              onChange={(event) =>
                setDraft({ ...draft, to: event.target.value })
              }
              required
            />
          </label>
          <Button size="sm" type="submit" disabled={isPending}>
            Apply dates
          </Button>
        </form>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {new Date(`${result.metadata.from}T12:00:00Z`).toLocaleDateString(
            'en-GB',
            { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
          )}{' '}
          through{' '}
          {new Date(`${result.metadata.to}T12:00:00Z`).toLocaleDateString(
            'en-GB',
            { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
          )}{' '}
          · {result.meta.total} people
        </span>
        <span>Select a person to see their assets and cost breakdown.</span>
      </div>
      <div
        aria-busy={isPending}
        className="flex h-[calc(100vh-11rem)] flex-col pb-6"
      >
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
            const p = typeof next === 'function' ? next(current) : next;
            load({ ...query, page: p.pageIndex + 1, pageSize: p.pageSize });
          }}
          pageSizeOptions={[16, 24, 32, 48]}
          initialPageSize={16}
          className="bg-background border-border min-h-0 flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Usage costs cover the selected dates. Assigned values reflect assets
        held today. Updated{' '}
        {new Date(result.metadata.generatedAt).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Colombo',
        })}
        .
      </p>
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
                            ? '\u2014'
                            : amount(asset.acquisitionShare)}
                        </td>
                        <td className="p-2">
                          {asset.bookShare == null
                            ? '\u2014'
                            : amount(asset.bookShare)}
                        </td>
                        <td className="p-2">
                          {asset.wholeAcquisitionValue == null
                            ? '\u2014'
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
