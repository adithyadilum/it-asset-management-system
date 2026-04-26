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

  // 1. Panel State from URL (following the Registry Pattern)
  const activeAssetId = searchParams.get("id") || "";
  const currentPanel = searchParams.get("panel");
  const isPanelOpen = currentPanel === "record" && activeAssetId !== "";

  // 2. Data Mapping
  const assetRows = useMemo<AssetAssignmentRow[]>(() => {
    const mapRow = (asset: AssignmentsDashboardRow) => ({
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

    return [
      ...data.available.map(mapRow),
      ...data.assigned.map(mapRow),
      ...data.returned.map(mapRow),
    ];
  }, [data]);
  
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
              assetName: row.assetName,
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
      cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.assetId}</span>,
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      <div className="min-h-0 flex-1 overflow-auto p-3 md:p-4">
        <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-slate-200 bg-white p-3">
          <h1 className="mb-4 shrink-0 text-[32px] font-semibold leading-10 text-slate-900">
            Asset Assignments and Returns
          </h1>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ModuleNavigationTabs tabs={tabs} defaultTab="available-assets">
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-[320px]">
                    <Input
                      type="search"
                      placeholder="Search assets..."
                      className="h-8 rounded-lg border-slate-200 bg-white pl-8 text-sm focus-visible:ring-[#00145a]"
                    />
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50">
                    Filters <ChevronDown className="ml-1 size-4" />
                  </Button>
                </div>

                {/* Main Data Table */}
                <DataTable<AssetAssignmentRow, unknown>
                  columns={columns}
                  data={assetRows}
                  onRowClick={handleRowClick}
                  initialPageSize={10}
                  className="rounded-lg border-slate-200"
                  selectionActions={selectionActions}
                  selectionLabel={(count) => `${count} Assets Selected`}
                />
              </div>
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