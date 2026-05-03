'use client';

import { useState, useMemo } from "react";
import { Download, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { DepreciationLedgerRecord } from "@/types/financials";
import { format } from "date-fns";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";

// US-22.2 Localized Currency Formatter
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

interface DepreciationLedgerProps {
  initialData: DepreciationLedgerRecord[];
}

export function DepreciationLedger({ initialData }: DepreciationLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Search filter logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return initialData;
    const lowerSearch = searchTerm.toLowerCase();
    return initialData.filter(
      (item) =>
        item.assetId.toLowerCase().includes(lowerSearch) ||
        item.category.toLowerCase().includes(lowerSearch)
    );
  }, [initialData, searchTerm]);

  // CSV Export Engine
  const exportToCSV = () => {
    const headers = [
      "Asset ID",
      "Category",
      "Purchase Date",
      "Original Purchase Price",
      "Expected Lifespan",
      "Current Book Value",
    ];

    const csvRows = filteredData.map((row) => [
      row.assetId,
      row.category,
      row.purchaseDate ? format(new Date(row.purchaseDate), "MM/dd/yyyy") : "N/A",
      row.originalPrice,
      row.expectedLifespan,
      row.currentBookValue,
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
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{formatCurrency(row.original.originalPrice)}</span>,
    },
    {
      accessorKey: "expectedLifespan",
      header: "Expected Lifespan",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.expectedLifespan}</span>,
    },
    {
      accessorKey: "currentBookValue",
      header: "Current Book Value",
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{formatCurrency(row.original.currentBookValue)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      {/* Toolbar */}
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
          <Button variant="outline" className="bg-background text-foreground" disabled>
            Filters <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={exportToCSV} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Download className="mr-2 h-4 w-4" />
            Export Log (CSV)
          </Button>
        </div>
      </div>

      {/* Data Grid */}
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