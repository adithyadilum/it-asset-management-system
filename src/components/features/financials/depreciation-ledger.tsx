'use client';

import { useState, useMemo, useEffect, useTransition, useRef } from 'react';
import { Download, ChevronDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import {
  FilterBar,
  type AppliedFilter,
  type FilterFieldConfig,
} from '@/components/shared/filter-bar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ColumnDef } from '@tanstack/react-table';
import type { DepreciationLedgerRecord } from '@/types/financials';
import { format } from 'date-fns';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import {
  convertCurrencyAmount,
  formatMoneyByCurrency,
  SUMMARY_CURRENCY,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/lib/currency';
import {
  getDepreciationLedger,
  type FinancialsFilterOptions,
} from '@/actions/financials';
import { BookValueChart } from '@/components/features/financials/book-value-chart';
import { LedgerSummary } from '@/components/features/financials/ledger-summary';
import { Progress } from '@/components/ui/progress';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useCurrency } from '@/components/providers/currency-provider';

interface DepreciationLedgerProps {
  initialData: DepreciationLedgerRecord[];
  initialPageCount?: number;
  /** Full option lists, read from the tables rather than the current page. */
  filterOptions?: FinancialsFilterOptions;
  initialSummary: DepreciationLedgerSummary;
}

export type DepreciationLedgerSummary = Awaited<
  ReturnType<typeof getDepreciationLedger>
>['summary'];

export function DepreciationLedger({
  initialData,
  initialPageCount = 1,
  filterOptions,
  initialSummary,
}: DepreciationLedgerProps) {
  // Data & Pagination State - Initialize from initialData to avoid empty flash
  const [data, setData] = useState<DepreciationLedgerRecord[]>(initialData);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 16 });
  // The summary and chart live here rather than on the page so that narrowing
  // the filters narrows them too -- a header that ignored the filters under it
  // would be worse than no header.
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();
  const canReuseInitialDataRef = useRef(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { currency, setCurrency } = useCurrency();
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);

  const tableSkeletonColumnWidths = [
    'w-[16%]',
    'w-[16%]',
    'w-[16%]',
    'w-[20%]',
    'w-[16%]',
    'w-[16%]',
  ];

  // Derived from the loaded rows only when the server list is unavailable --
  // one page of rows can never offer the categories it does not contain.
  const uniqueCategories = useMemo(() => {
    if (filterOptions?.categories.length) return filterOptions.categories;
    return Array.from(new Set(initialData.map((item) => item.category))).sort();
  }, [filterOptions, initialData]);

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(
    () => [
      {
        value: 'Asset Category',
        label: 'Asset Category',
        options: uniqueCategories,
      },
      {
        value: 'Purchase Age',
        label: 'Purchase Age',
        options: ['This Year', 'Last Year', 'Older than 3 Years'],
      },
      {
        value: 'Asset Pillar',
        label: 'Asset Pillar',
        options: filterOptions?.pillars ?? [],
      },
      {
        value: 'Location',
        label: 'Location',
        options: filterOptions?.locations ?? [],
      },
    ],
    [uniqueCategories, filterOptions]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // The Server Fetcher - Skip first fetch if no filters/search on page 0
  useEffect(() => {
    const matchesInitialRequest =
      pagination.pageIndex === 0 &&
      pagination.pageSize === 16 &&
      debouncedSearch === '' &&
      appliedFilters.length === 0;
    if (matchesInitialRequest && canReuseInitialDataRef.current) {
      return;
    }
    if (!matchesInitialRequest) canReuseInitialDataRef.current = false;
    startTransition(async () => {
      const categoryFilter = appliedFilters.find(
        (f) => f.field === 'Asset Category' && f.operator === 'is'
      )?.value;
      const ageFilter = appliedFilters.find(
        (f) => f.field === 'Purchase Age' && f.operator === 'is'
      )?.value;
      const pillarFilter = appliedFilters.find(
        (f) => f.field === 'Asset Pillar' && f.operator === 'is'
      )?.value;
      const locationFilter = appliedFilters.find(
        (f) => f.field === 'Location' && f.operator === 'is'
      )?.value;

      const response = await getDepreciationLedger({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
        category: categoryFilter,
        ageFilter: ageFilter,
        pillar: pillarFilter,
        location: locationFilter,
      });

      setData(response.data as unknown as DepreciationLedgerRecord[]);
      setPageCount(response.meta.totalPages);
      setSummary(response.summary);
    });
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    appliedFilters,
  ]);

  const applyFilter = (nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter(
        (f) => f.field !== nextFilter.field
      );
      return [...withoutCurrentField, nextFilter];
    });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((currentFilters) =>
      currentFilters.filter((f) => f.field !== field)
    );
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const clearAllFilters = () => {
    setAppliedFilters([]);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const exportToCSV = async () => {
    const categoryFilter = appliedFilters.find(
      (f) => f.field === 'Asset Category' && f.operator === 'is'
    )?.value;
    const ageFilter = appliedFilters.find(
      (f) => f.field === 'Purchase Age' && f.operator === 'is'
    )?.value;
    const pillarFilter = appliedFilters.find(
      (f) => f.field === 'Asset Pillar' && f.operator === 'is'
    )?.value;
    const locationFilter = appliedFilters.find(
      (f) => f.field === 'Location' && f.operator === 'is'
    )?.value;

    const response = await getDepreciationLedger({
      page: 1,
      pageSize: 5000,
      search: debouncedSearch,
      category: categoryFilter,
      ageFilter: ageFilter,
      pillar: pillarFilter,
      location: locationFilter,
    });

    const headers = [
      'Asset ID',
      'Category',
      'Purchase Date',
      `Original Purchase Price (${currency})`,
      'Expected Lifespan',
      `Current Book Value (${currency})`,
    ];

    const csvRows = response.data.map((row) => [
      row.assetId,
      row.category,
      row.purchaseDate
        ? format(new Date(row.purchaseDate), 'MM/dd/yyyy')
        : 'N/A',
      convertCurrencyAmount(
        row.originalPrice,
        (row.currencyCode as SupportedCurrency) || 'USD',
        currency
      ).toFixed(2),
      row.expectedLifespan,
      convertCurrencyAmount(
        row.currentBookValue,
        (row.currencyCode as SupportedCurrency) || 'USD',
        currency
      ).toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Depreciation_Ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<DepreciationLedgerRecord>[] = [
    {
      accessorKey: 'assetId',
      header: 'Asset ID',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
        >
          {row.original.assetId}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'purchaseDate',
      header: 'Purchase Date',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {row.original.purchaseDate
            ? format(new Date(row.original.purchaseDate), 'MM/dd/yyyy')
            : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'originalPrice',
      header: 'Original Purchase Price',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {formatMoneyByCurrency(
            convertCurrencyAmount(
              row.original.originalPrice,
              (row.original.currencyCode as SupportedCurrency) || 'USD',
              currency
            ),
            currency
          )}
        </span>
      ),
    },
    {
      accessorKey: 'expectedLifespan',
      header: 'Life Remaining',
      cell: ({ row }) => {
        // The column used to print the life and leave the reader to work out
        // how much of it was left against the purchase date two columns over.
        const { lifeMonths, monthsElapsed, expectedLifespan } = row.original;
        const used = lifeMonths > 0 ? (monthsElapsed / lifeMonths) * 100 : 0;
        const remaining = Math.max(0, lifeMonths - monthsElapsed);

        return (
          <div className="flex min-w-[120px] flex-col gap-1">
            <Progress
              value={Math.min(100, used)}
              className="h-1.5"
              aria-label={`${Math.round(used)}% of useful life elapsed`}
            />
            <span
              className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}
            >
              {remaining === 0
                ? `Fully depreciated · ${expectedLifespan}`
                : `${remaining} of ${lifeMonths} months left`}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'currentBookValue',
      header: 'Current Book Value',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
        >
          {formatMoneyByCurrency(
            convertCurrencyAmount(
              row.original.currentBookValue,
              (row.original.currencyCode as SupportedCurrency) || 'USD',
              currency
            ),
            currency
          )}
        </span>
      ),
    },
  ];

  const inDisplayCurrency = (value: number) =>
    convertCurrencyAmount(value, SUMMARY_CURRENCY, currency);

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <LedgerSummary
        asOf={summary.asOf}
        stats={[
          {
            label: 'Assets tracked',
            value: summary.assetCount.toLocaleString(),
            hint: `${summary.fullyDepreciated.toLocaleString()} fully depreciated`,
          },
          {
            label: 'Original cost',
            value: inDisplayCurrency(summary.totalCost),
            currencyCode: currency,
          },
          {
            label: 'Current book value',
            value: inDisplayCurrency(summary.totalBookValue),
            currencyCode: currency,
            tone: 'positive',
          },
          {
            label: 'Accumulated depreciation',
            value: inDisplayCurrency(summary.accumulatedDepreciation),
            currencyCode: currency,
            tone: 'warning',
          },
        ]}
      />

      <BookValueChart
        series={summary.bookValueSeries.map((point) => ({
          month: point.month,
          bookValue: inDisplayCurrency(point.bookValue),
        }))}
        currencyCode={currency}
      />

      <FilterBar
        searchQuery={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        searchPlaceholder="Search..."
        fields={filterFieldConfigs}
        appliedFilters={appliedFilters}
        onApplyFilter={applyFilter}
        onClearFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
      >
        {/* Currency Switcher */}
        <Popover open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`bg-background text-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
            >
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
              {currency} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-40 p-2 bg-background border-border shadow-md rounded-lg"
          >
            <div className="flex flex-col gap-1">
              {(SUPPORTED_CURRENCIES as unknown as SupportedCurrency[]).map(
                (c) => (
                  <Button
                    key={c}
                    variant={currency === c ? 'secondary' : 'ghost'}
                    className={`justify-start ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
                    onClick={() => {
                      setCurrency(c);
                      setIsCurrencyOpen(false);
                    }}
                  >
                    {c === 'USD' ? '🇺🇸' : c === 'NOK' ? '🇳🇴' : '🇱🇰'} {c}
                  </Button>
                )
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          onClick={() => void exportToCSV()}
          className={`bg-primary hover:bg-primary/90 text-primary-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Log
        </Button>
      </FilterBar>

      <div className="min-h-0 flex-1 flex flex-col">
        {isPending ? (
          <div className="flex-1 overflow-hidden rounded-lg border border-border bg-background p-4">
            <TableSkeleton
              rowCount={10}
              columnWidths={tableSkeletonColumnWidths}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            pageSizeOptions={[16, 24, 32, 48]}
            initialPageSize={16}
            enableRowSelection={false}
            className="bg-background border-border flex-1 min-h-0"
            manualPagination={true}
            pageCount={pageCount}
            paginationState={pagination}
            onPaginationChange={setPagination}
          />
        )}
      </div>
    </div>
  );
}
