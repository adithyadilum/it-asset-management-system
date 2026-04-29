"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
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
    dateCreated: asset.returnedDate ? asset.returnedDate.toLocaleDateString("en-GB") : "-",
    updatedAt: asset.returnedDate ? asset.returnedDate.toLocaleDateString("en-GB") : "-",
    warranty: "-",
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

  const filteredAssetRows = useMemo(() => {
    if (!appliedCategoryFilter) {
      return assetRows;
    }

    return assetRows.filter((row) => {
      const matches = row.category === appliedCategoryFilter.value;
      return appliedCategoryFilter.operator === "is" ? matches : !matches;
    });
  }, [assetRows, appliedCategoryFilter]);

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

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("panel");
    params.delete("id");
    params.delete("animate");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[320px]">
          <Input
            type="search"
            placeholder="Search assets..."
            className="h-8 rounded-lg border-slate-200 bg-white pl-8 text-sm focus-visible:ring-[#00145a]"
          />
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

      {appliedCategoryFilter ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-700">
              {categoryFilterLabel}
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={clearCategoryFilter}
              >
                ×
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
        </div>
        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverAnchor asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => setIsFilterPopoverOpen((currentOpen) => !currentOpen)}
            >
              Filters <ChevronDown className="ml-1 size-4" />
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
                  ×
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
      <div className="min-h-0 flex-1 overflow-auto p-3 md:p-4">
        <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-slate-200 bg-white p-3">
          <h1 className="mb-4 shrink-0 text-[32px] font-semibold leading-10 text-slate-900">
            Asset Assignments and Returns
          </h1>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ModuleNavigationTabs tabs={tabs} defaultTab="available-assets">
              <TabsContent value="available-assets" className="mt-0 focus-visible:outline-none">
                {renderTable(filteredAvailableRows, selectionActions)}
              </TabsContent>

              <TabsContent value="assigned-assets" className="mt-0 focus-visible:outline-none">
                {renderTable(filteredAssignedRows)}
              </TabsContent>

              <TabsContent value="returned-assets" className="mt-0 focus-visible:outline-none">
                {renderTable(filteredReturnedRows)}
              </TabsContent>
            </ModuleNavigationTabs>
          </div>
        </div>
      </div>

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