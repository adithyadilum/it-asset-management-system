"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AssignmentsPanels } from "./assignments-panels";
import {
  MultiAssetAssignmentModal,
  type MultiAssetAssignmentItem,
} from "./multi-asset-assignment-modal";
import { ModuleNavigationTabs } from "@/components/shared/module-navigation-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  type DataTableSelectionAction,
} from "@/components/shared/data-table";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { TabsContent } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";
import type { AssignmentsDashboardData, AssignmentsDashboardRow } from "@/lib/data/operations-assignments-repo";

// --- Types ---

type AssetAssignmentRow = {
  assetId: string;
  assetName: string;
  serialNumber: string;
  category: string;
  status: string;
  model: string;
  brand: string;
  owner: string;
  group: string;
  assignedTo: string;
  dateCreated: string;
  updatedAt: string;
  warranty: string;
  note: string;
  assetTag: string;
  lastRepaired?: string;
};

type CategoryFilterOperator = "is" | "is not";

type CategoryFilter = {
  operator: CategoryFilterOperator;
  value: string;
};

interface AssignmentsDashboardProps {
  data: AssignmentsDashboardData;
}

const tabs = [
  { id: "available-assets", label: "Available Assets" },
  { id: "assigned-assets", label: "Assigned Assets" },
  { id: "returned-assets", label: "Returned Assets" },
];

// --- Helpers ---

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- Component ---

export function AssignmentsDashboard({ data }: AssignmentsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMultiAssignModalOpen, setIsMultiAssignModalOpen] = useState(false);
  const [multiAssignAssets, setMultiAssignAssets] = useState<MultiAssetAssignmentItem[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState<CategoryFilter | null>(null);
  const [draftOperator, setDraftOperator] = useState<CategoryFilterOperator>("is");
  const [draftCategory, setDraftCategory] = useState("");
  const [searchValue, setSearchValue] = useState("");

  // 1. Panel State from URL (following the Registry Pattern)
  const activeAssetId = searchParams.get("id") || "";
  const currentPanel = searchParams.get("panel");
  const isPanelOpen = currentPanel === "record" && activeAssetId !== "";

  // 2. Data Mapping
  const mapRow = (asset: AssignmentsDashboardRow): AssetAssignmentRow => ({
    assetId: asset.id,
    assetName: asset.name ?? asset.assetTag,
    serialNumber: asset.serialNumber ?? "-",
    category: asset.category,
    status: asset.status,
    model: "-",
    brand: "-",
    owner: "-",
    group: asset.pillar,
    assignedTo: asset.assignedTo ?? "-",
    dateCreated: formatDate(asset.returnedDate),
    updatedAt: formatDate(asset.returnedDate),
    warranty: "-",
    lastRepaired: "-",
    note: asset.location ?? "-",
    assetTag: asset.assetTag,
  });

  const availableRows = useMemo<AssetAssignmentRow[]>(
    () => data.available.map(mapRow),
    [data.available]
  );

  const assignedRows = useMemo<AssetAssignmentRow[]>(
    () => data.assigned.map(mapRow),
    [data.assigned]
  );

  const returnedRows = useMemo<AssetAssignmentRow[]>(
    () => data.returned.map(mapRow),
    [data.returned]
  );

  const assetRows = useMemo(
    () => [...availableRows, ...assignedRows, ...returnedRows],
    [availableRows, assignedRows, returnedRows]
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();

    for (const row of assetRows) {
      if (row.category && row.category.trim().length > 0) {
        categories.add(row.category);
      }
    }

    return [...categories].sort((left, right) => left.localeCompare(right));
  }, [assetRows]);

  const searchedAssetRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return assetRows;
    }

    return assetRows.filter((row) => {
      return [
        row.assetTag,
        row.assetName,
        row.serialNumber,
        row.category,
        row.status,
        row.group,
        row.assignedTo,
        row.note,
      ].some((field) => field.toLowerCase().includes(query));
    });
  }, [assetRows, searchValue]);

  const filteredAssetRows = useMemo(() => {
    if (!appliedCategoryFilter) {
      return searchedAssetRows;
    }

    return searchedAssetRows.filter((row) => {
      const matches = row.category === appliedCategoryFilter.value;
      return appliedCategoryFilter.operator === "is" ? matches : !matches;
    });
  }, [searchedAssetRows, appliedCategoryFilter]);

  const filteredAvailableRows = useMemo(
    () => filteredAssetRows.filter((row) => availableRows.some((availableRow) => availableRow.assetId === row.assetId)),
    [availableRows, filteredAssetRows]
  );

  const filteredAssignedRows = useMemo(
    () => filteredAssetRows.filter((row) => assignedRows.some((assignedRow) => assignedRow.assetId === row.assetId)),
    [assignedRows, filteredAssetRows]
  );

  const filteredReturnedRows = useMemo(
    () => filteredAssetRows.filter((row) => returnedRows.some((returnedRow) => returnedRow.assetId === row.assetId)),
    [filteredAssetRows, returnedRows]
  );

  const categoryFilterLabel = appliedCategoryFilter
    ? `Category ${appliedCategoryFilter.operator} ${appliedCategoryFilter.value}`
    : "Category";

  const clearCategoryFilter = () => {
    setAppliedCategoryFilter(null);
    setDraftOperator("is");
    setDraftCategory("");
  };

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("panel");
    params.delete("id");
    params.delete("animate");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedAsset = useMemo(
    () => assetRows.find((a) => a.assetId === activeAssetId) ?? null,
    [assetRows, activeAssetId]
  );

  const selectionActions = useMemo<DataTableSelectionAction<AssetAssignmentRow>[]>(
    () => [
      {
        id: "assign-assets",
        label: "Assign Assets",
        tone: "primary",
        onClick: (selectedRows) => {
          setMultiAssignAssets(
            selectedRows.map((row) => ({
              assetId: row.assetId,
              assetTag: row.assetTag,
              assetName: row.assetName,
              assetGroup: row.group,
            }))
          );
          setIsMultiAssignModalOpen(true);
        },
      },
    ],
    []
  );

  // 3. Column Definitions for the Hardware Registry View
  const columns = useMemo<ColumnDef<AssetAssignmentRow>[]>(() => [
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.assetTag}</span>,
    },
    {
      accessorKey: "assetName",
      header: "Asset Name",
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
      cell: ({ row }) => <span className="text-slate-500 font-mono">{row.original.serialNumber}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="h-5 rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-500">
          {row.original.category}
        </Badge>
      ),
    },
  ], []);

  // 4. Handlers to trigger the Slide Panel via URL
  const handleRowClick = (row: AssetAssignmentRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("panel", "record");
    params.set("id", row.assetId);
    // Mimic the animation toggle logic from RegistryClient
    params.set("animate", isPanelOpen ? "0" : "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };



  const handleMultiAssignModalOpenChange = (open: boolean) => {
    setIsMultiAssignModalOpen(open);

    if (!open) {
      setMultiAssignAssets([]);
    }
  };

  const renderTable = (
    rows: AssetAssignmentRow[],
    actions?: DataTableSelectionAction<AssetAssignmentRow>[]
  ) => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-136.25">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search assets..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverAnchor asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700"
              onClick={() => setIsFilterPopoverOpen((currentOpen) => !currentOpen)}
            >
              Filters
              <ChevronDown className="size-4" />
            </Button>
          </PopoverAnchor>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={10}
            className="w-61.25 rounded-lg border border-slate-200 p-0 shadow-xl"
          >
            <div className="border-b border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Filter by</h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setIsFilterPopoverOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 px-3 py-3">
              <div className="space-y-2 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={draftOperator === "is"}
                    onChange={() => setDraftOperator("is")}
                  />
                  is
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={draftOperator === "is not"}
                    onChange={() => setDraftOperator("is not")}
                  />
                  is not
                </label>
              </div>

              <select
                value={draftCategory}
                onChange={(event) => setDraftCategory(event.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categoryOptions.map((categoryOption) => (
                  <option key={categoryOption} value={categoryOption}>
                    {categoryOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 px-3 text-sm"
                onClick={() => setIsFilterPopoverOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg bg-[#0B1D74] px-3 text-sm text-white hover:bg-[#0A175C]"
                onClick={() => {
                  if (draftCategory) {
                    setAppliedCategoryFilter({
                      operator: draftOperator,
                      value: draftCategory,
                    });
                  }

                  setIsFilterPopoverOpen(false);
                }}
              >
                Apply Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {appliedCategoryFilter ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-700">
              {categoryFilterLabel}
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={clearCategoryFilter}
              >
                <X className="size-4" />
              </button>
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700"
            onClick={clearCategoryFilter}
          >
            Clear Filters
          </Button>
        </div>
      ) : null}

      <DataTable<AssetAssignmentRow, unknown>
        columns={columns}
        data={rows}
        onRowClick={handleRowClick}
        initialPageSize={10}
        className="rounded-lg border-slate-200"
        selectionActions={actions}
        selectionLabel={(count) => `${count} Assets Selected`}
      />
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-6">
          <div className="mb-4 shrink-0">
            <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
              Assignments and Returns
            </h1>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ModuleNavigationTabs tabs={tabs} defaultTab="available-assets">
              <TabsContent value="available-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredAvailableRows, selectionActions)}
              </TabsContent>

              <TabsContent value="assigned-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredAssignedRows)}
              </TabsContent>

              <TabsContent value="returned-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredReturnedRows)}
              </TabsContent>
            </ModuleNavigationTabs>
          </div>
        </main>

      <AssignmentsPanels
        isOpen={isPanelOpen}
        selectedAsset={selectedAsset}
        onClose={handleClosePanel}
      />

      <MultiAssetAssignmentModal
        isOpen={isMultiAssignModalOpen}
        assets={multiAssignAssets}
        onOpenChange={handleMultiAssignModalOpenChange}
      />
    </div>
  );
}