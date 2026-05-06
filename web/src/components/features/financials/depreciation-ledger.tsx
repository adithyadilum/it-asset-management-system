'use client';

import { useState, useMemo, useEffect } from "react";
import { Download, Search, ChevronDown, DollarSign, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { ColumnDef } from "@tanstack/react-table";
import type { DepreciationLedgerRecord } from "@/types/financials";
import { format } from "date-fns";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { convertCurrencyAmount, formatMoneyByCurrency, type SupportedCurrency } from "@/lib/currency";

type FilterField = 'Asset Category' | 'Purchase Age';
type FilterOperator = 'is' | 'is not';

type AppliedFilter = {
  field: FilterField;
  operator: FilterOperator;
  value: string;
};

interface DepreciationLedgerProps {
  initialData: DepreciationLedgerRecord[];
}

export function DepreciationLedger({ initialData }: DepreciationLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Query Builder Filter State
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [draftField, setDraftField] = useState<FilterField>('Asset Category');
  const [draftOperator, setDraftOperator] = useState<FilterOperator>('is');
  const [draftValue, setDraftValue] = useState('');

  const filterFieldOptions: FilterField[] = ['Asset Category', 'Purchase Age'];

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(initialData.map(item => item.category))).sort();
  }, [initialData]);

  const filterValueOptions = useMemo(() => {
    if (draftField === 'Asset Category') return uniqueCategories;
    if (draftField === 'Purchase Age') return ['This Year', 'Last Year', 'Older than 3 Years'];
    return [];
  }, [draftField, uniqueCategories]);

  useEffect(() => {
    if (filterValueOptions.length === 0) {
      setDraftValue('');
      return;
    }
    if (!filterValueOptions.includes(draftValue)) {
      setDraftValue(filterValueOptions[0]);
    }
  }, [draftValue, filterValueOptions]);

  // Combined Search & Filter Logic
  const filteredData = useMemo(() => {
    let nextRows = initialData.filter((item) => {
      return !searchTerm || 
        item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (appliedFilters.length > 0) {
      nextRows = nextRows.filter((row) => {
        return appliedFilters.every((filter) => {
          let matches = false;

          if (filter.field === 'Asset Category') {
            matches = row.category === filter.value;
          } else if (filter.field === 'Purchase Age') {
            if (!row.purchaseDate) return filter.operator === 'is not'; 
            const age = new Date().getFullYear() - new Date(row.purchaseDate).getFullYear();
            if (filter.value === 'This Year') matches = age === 0;
            else if (filter.value === 'Last Year') matches = age === 1;
            else if (filter.value === 'Older than 3 Years') matches = age > 3;
          }

          return filter.operator === 'is' ? matches : !matches;
        });
      });
    }

    return nextRows;
  }, [initialData, searchTerm, appliedFilters]);

  const applyFilter = () => {
    if (!draftValue) return;
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter((f) => f.field !== draftField);
      return [...withoutCurrentField, { field: draftField, operator: draftOperator, value: draftValue }];
    });
    setIsFilterPopoverOpen(false);
  };

  const clearFilter = (field: FilterField) => {
    setAppliedFilters((currentFilters) => currentFilters.filter((f) => f.field !== field));
  };

  const clearAllFilters = () => setAppliedFilters([]);

  const exportToCSV = () => {
    const headers = [
      "Asset ID",
      "Category",
      "Purchase Date",
      `Original Purchase Price (${currency})`,
      "Expected Lifespan",
      `Current Book Value (${currency})`,
    ];

    const csvRows = filteredData.map((row) => [
      row.assetId,
      row.category,
      row.purchaseDate ? format(new Date(row.purchaseDate), "MM/dd/yyyy") : "N/A",
      convertCurrencyAmount(row.originalPrice, 'USD', currency).toFixed(2),
      row.expectedLifespan,
      convertCurrencyAmount(row.currentBookValue, 'USD', currency).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Depreciation_Ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<DepreciationLedgerRecord>[] = [
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{row.original.assetId}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.category}</span>,
    },
    {
      accessorKey: "purchaseDate",
      header: "Purchase Date",
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {row.original.purchaseDate ? format(new Date(row.original.purchaseDate), "MM/dd/yyyy") : "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "originalPrice",
      header: "Original Purchase Price",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{formatMoneyByCurrency(convertCurrencyAmount(row.original.originalPrice, 'USD', currency), currency)}</span>,
    },
    {
      accessorKey: "expectedLifespan",
      header: "Expected Lifespan",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.expectedLifespan}</span>,
    },
    {
      accessorKey: "currentBookValue",
      header: "Current Book Value",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{formatMoneyByCurrency(convertCurrencyAmount(row.original.currentBookValue, 'USD', currency), currency)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="relative w-[320px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 bg-background ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Currency Switcher */}
            <Popover open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
              <PopoverAnchor asChild>
                <Button variant="outline" className={`bg-background text-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`} onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}>
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  {currency} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverAnchor>
              <PopoverContent align="end" className="w-40 p-2 bg-background border-border shadow-md rounded-lg">
                <div className="flex flex-col gap-1">
                  {(['USD', 'LKR', 'NOK'] as SupportedCurrency[]).map((c) => (
                    <Button
                      key={c}
                      variant={currency === c ? 'secondary' : 'ghost'}
                      className={`justify-start ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
                      onClick={() => { setCurrency(c); setIsCurrencyOpen(false); }}
                    >
                      {c === 'USD' ? '🇺🇸' : c === 'NOK' ? '🇳🇴' : '🇱🇰'} {c}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Query Builder Filter Dropdown */}
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverAnchor asChild>
                <Button 
                variant="outline" 
                className={`bg-background text-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`} 
                onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
                >
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  Filters
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverAnchor>
              <PopoverContent align="end" sideOffset={10} className="w-64 rounded-lg border border-border bg-background p-0 shadow-xl">
                <div className="border-b border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Filter by</h3>
                    <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setIsFilterPopoverOpen(false)}>
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 px-3 py-3">
                  <select
                    value={draftField}
                    onChange={(event) => setDraftField(event.target.value as FilterField)}
                    className={`h-8 w-full rounded-lg border border-border bg-background px-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                  >
                    {filterFieldOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>

                  <div className={`space-y-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={draftOperator === 'is'} onChange={() => setDraftOperator('is')} /> is
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={draftOperator === 'is not'} onChange={() => setDraftOperator('is not')} /> is not
                    </label>
                  </div>

                  <select
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    className={`h-8 w-full rounded-lg border border-border bg-background px-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                  >
                    <option value="" disabled>Select value</option>
                    {filterValueOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-8 rounded-lg border-border bg-secondary px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-secondary-foreground hover:bg-secondary/80`}
                    onClick={() => setIsFilterPopoverOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-8 rounded-lg bg-primary px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-primary-foreground hover:bg-primary/90`}
                    onClick={applyFilter}
                  >
                    Apply Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button onClick={exportToCSV} className={`bg-primary hover:bg-primary/90 text-primary-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}>
              <Download className="mr-2 h-4 w-4" />
              Export Log
            </Button>
          </div>
        </div>

        {/* Applied Filters Badges */}
        {appliedFilters.length > 0 ? (
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {appliedFilters.map((filter) => (
                <span
                  key={filter.field}
                  className={`inline-flex h-8 items-center gap-2 rounded-lg bg-muted/50 px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                >
                  {`${filter.field} ${filter.operator} ${filter.value}`}
                  <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => clearFilter(filter.field)}>
                    <X className="size-4" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg text-xl text-muted-foreground hover:bg-muted/50"
                onClick={() => setIsFilterPopoverOpen(true)}
              >
                +
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`h-8 rounded-lg border-border bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
              onClick={clearAllFilters}
            >
              Clear Filters
            </Button>
          </div>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        pageSizeOptions={[16, 24, 32, 48]}
        initialPageSize={16}
        enableRowSelection={false}
        className="bg-background border-border flex-1 min-h-0"
      />
    </div>
  );
}