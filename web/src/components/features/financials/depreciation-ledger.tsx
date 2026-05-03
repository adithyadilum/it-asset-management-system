'use client';

import { useState, useMemo } from "react";
import { Download, Search, ChevronDown, DollarSign, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { ColumnDef } from "@tanstack/react-table";
import type { DepreciationLedgerRecord } from "@/types/financials";
import { format } from "date-fns";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";

type CurrencyCode = 'USD' | 'LKR' | 'NOK';

const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  LKR: 305.50,
  NOK: 10.85,
};

const formatCurrency = (value: number, currency: CurrencyCode) => {
  const convertedValue = value * EXCHANGE_RATES[currency];
  return new Intl.NumberFormat(currency === 'LKR' ? 'en-LK' : currency === 'NOK' ? 'no-NO' : 'en-US', {
    style: "currency",
    currency: currency,
  }).format(convertedValue);
};

interface DepreciationLedgerProps {
  initialData: DepreciationLedgerRecord[];
}

export function DepreciationLedger({ initialData }: DepreciationLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterAge, setFilterAge] = useState<string>("All");

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(initialData.map(item => item.category))).sort();
  }, [initialData]);

  // Combined Search & Filter Logic
  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      // 1. Search
      const searchMatch = !searchTerm || 
        item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Category Filter
      const categoryMatch = filterCategory === "All" || item.category === filterCategory;

      // 3. Age Filter
      let ageMatch = true;
      if (filterAge !== "All" && item.purchaseDate) {
        const purchaseYear = new Date(item.purchaseDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - purchaseYear;
        
        if (filterAge === "This Year") ageMatch = age === 0;
        else if (filterAge === "Last Year") ageMatch = age === 1;
        else if (filterAge === "Older than 3 Years") ageMatch = age > 3;
      } else if (filterAge !== "All" && !item.purchaseDate) {
        ageMatch = false; // Exclude items with no date if an age filter is active
      }

      return searchMatch && categoryMatch && ageMatch;
    });
  }, [initialData, searchTerm, filterCategory, filterAge]);

  const activeFilterCount = (filterCategory !== "All" ? 1 : 0) + (filterAge !== "All" ? 1 : 0);

  const clearFilters = () => {
    setFilterCategory("All");
    setFilterAge("All");
    setIsFilterOpen(false);
  };

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
      (row.originalPrice * EXCHANGE_RATES[currency]).toFixed(2),
      row.expectedLifespan,
      (row.currentBookValue * EXCHANGE_RATES[currency]).toFixed(2),
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
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{formatCurrency(row.original.originalPrice, currency)}</span>,
    },
    {
      accessorKey: "expectedLifespan",
      header: "Expected Lifespan",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.expectedLifespan}</span>,
    },
    {
      accessorKey: "currentBookValue",
      header: "Current Book Value",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{formatCurrency(row.original.currentBookValue, currency)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <div className="flex items-center justify-between shrink-0">
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
                {(['USD', 'LKR', 'NOK'] as CurrencyCode[]).map((c) => (
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

          {/* Filters Dropdown */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverAnchor asChild>
              <Button 
              variant="outline" 
              className={`bg-background text-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium} `} 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverAnchor>
            <PopoverContent align="end" className="w-64 p-4 bg-background border-border shadow-md rounded-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Filter Ledger</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground" onClick={() => setIsFilterOpen(false)}><X className="h-4 w-4"/></Button>
              </div>
              
              <div className="space-y-1">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-muted-foreground`}>Asset Category</label>
                <select 
                  className={`w-full h-9 rounded-md border border-input bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-muted-foreground`}>Purchase Age</label>
                <select 
                  className={`w-full h-9 rounded-md border border-input bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
                  value={filterAge}
                  onChange={(e) => setFilterAge(e.target.value)}
                >
                  <option value="All">All Time</option>
                  <option value="This Year">Purchased This Year</option>
                  <option value="Last Year">Purchased Last Year</option>
                  <option value="Older than 3 Years">Older than 3 Years</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>Clear</Button>
                <Button size="sm" onClick={() => setIsFilterOpen(false)} className={`bg-primary text-primary-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={exportToCSV} className={`bg-primary hover:bg-primary/90 text-primary-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}>
            <Download className="mr-2 h-4 w-4" />
            Export Log
          </Button>
        </div>
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