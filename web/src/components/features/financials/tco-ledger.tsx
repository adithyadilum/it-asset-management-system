'use client';

import { useState, useMemo } from "react";
import { Download, Search, ChevronDown, DollarSign, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { ColumnDef } from "@tanstack/react-table";
import type { TCOLedgerRecord } from "@/types/financials";
import { format } from "date-fns";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { convertCurrencyAmount, formatMoneyByCurrency, type SupportedCurrency } from "@/lib/currency";

interface TCOLedgerProps {
  initialData: TCOLedgerRecord[];
}

export function TCOLedger({ initialData }: TCOLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterCost, setFilterCost] = useState<string>("All");

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

      // 3. Cost Threshold Filter
      let costMatch = true;
      if (filterCost !== "All") {
        if (filterCost === "High Value (>$1000)") costMatch = item.totalTCO > 1000;
        else if (filterCost === "Medium Value ($500-$1000)") costMatch = item.totalTCO >= 500 && item.totalTCO <= 1000;
        else if (filterCost === "Low Value (<$500)") costMatch = item.totalTCO < 500;
      }

      return searchMatch && categoryMatch && costMatch;
    });
  }, [initialData, searchTerm, filterCategory, filterCost]);

  const activeFilterCount = (filterCategory !== "All" ? 1 : 0) + (filterCost !== "All" ? 1 : 0);

  const clearFilters = () => {
    setFilterCategory("All");
    setFilterCost("All");
    setIsFilterOpen(false);
  };

  const exportToCSV = () => {
    const headers = [
      "Asset ID",
      "Category",
      "Purchase Date",
      `Original Purchase Price (${currency})`,
      `Total Repair Costs (${currency})`,
      `Total TCO (${currency})`,
    ];

    const csvRows = filteredData.map((row) => [
      row.assetId,
      row.category,
      row.purchaseDate ? format(new Date(row.purchaseDate), "MM/dd/yyyy") : "N/A",
      convertCurrencyAmount(row.originalPrice, 'USD', currency).toFixed(2),
      convertCurrencyAmount(row.totalRepairCosts, 'USD', currency).toFixed(2),
      convertCurrencyAmount(row.totalTCO, 'USD', currency).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Total_Cost_Of_Ownership_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<TCOLedgerRecord>[] = [
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
      accessorKey: "totalRepairCosts",
      header: "Total Repair Costs",
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {formatMoneyByCurrency(convertCurrencyAmount(row.original.totalRepairCosts, 'USD', currency), currency)}
        </span>
      ),
    },
    {
      accessorKey: "totalTCO",
      header: "Total TCO",
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
          {formatMoneyByCurrency(convertCurrencyAmount(row.original.totalTCO, 'USD', currency), currency)}
        </span>
      ),
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

          {/* Filters Dropdown */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverAnchor asChild>
              <Button 
              variant="outline" 
              className={`bg-background text-foreground ${TYPOGRAPHY_CLASSNAMES.textSmMedium} relative`} 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center z-10 shadow-sm">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverAnchor>
            <PopoverContent align="end" className="w-64 p-4 bg-background border-border shadow-md rounded-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Filter TCO</span>
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
                <label className={`${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-muted-foreground`}>Total Cost (TCO)</label>
                <select 
                  className={`w-full h-9 rounded-md border border-input bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
                  value={filterCost}
                  onChange={(e) => setFilterCost(e.target.value)}
                >
                  <option value="All">All Values</option>
                  <option value="High Value (>$1000)">High Value (&gt;$1000)</option>
                  <option value="Medium Value ($500-$1000)">Medium Value ($500-$1000)</option>
                  <option value="Low Value (<$500)">Low Value (&lt;$500)</option>
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