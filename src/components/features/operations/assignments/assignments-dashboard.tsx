"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction
} from "@/actions/assignments";
import { AssignmentsPanels } from "./assignments-panels";
import {
  MultiAssetAssignmentModal,
  type MultiAssetAssignmentItem,
} from "./multi-asset-assignment-modal";
import { ModuleNavigationTabs } from "@/components/shared/module-navigation-tabs";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableSelectionAction,
} from "@/components/shared/data-table";
import { FilterBar, type AppliedFilter, type FilterFieldConfig } from "@/components/shared/filter-bar";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { TabsContent } from "@/components/ui/tabs";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
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
  department?: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  dateCreated: string;
  updatedAt: string;
  warranty: string;
  note: string;
  assetTag: string;
  state: string;
  assignmentId?: number;
  lastRepaired?: string;
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
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 1. Panel State from URL (following the Registry Pattern)
  const activeAssetId = searchParams.get("id") || "";
  const currentPanel = searchParams.get("panel");
  const isPanelOpen = currentPanel === "record" && activeAssetId !== "";

  // 2. Data Mapping
  const mapRow = useCallback((asset: AssignmentsDashboardRow): AssetAssignmentRow => ({
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
    department: asset.pillar,
    assignedDate: formatDate(asset.assignedDate),
    expectedReturnDate: formatDate(asset.expectedReturnDate),
    dateCreated: formatDate(asset.createdAt),
    updatedAt: formatDate(asset.updatedAt),
    warranty: "-",
    lastRepaired: "-",
    note: asset.location ?? "-",
    assetTag: asset.assetTag,
    state: asset.state,
    assignmentId: asset.assignmentId ?? undefined,
  }), []);

  const availableRows = useMemo<AssetAssignmentRow[]>(
    () => data.available.map(mapRow),
    [data.available, mapRow]
  );

  const assignedRows = useMemo<AssetAssignmentRow[]>(
    () => data.assigned.map(mapRow),
    [data.assigned, mapRow]
  );

  const returnedRows = useMemo<AssetAssignmentRow[]>(
    () => data.returned.map(mapRow),
    [data.returned, mapRow]
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

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(() => [
    { value: 'Category', label: 'Category', options: categoryOptions },
  ], [categoryOptions]);

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
    if (appliedFilters.length === 0) {
      return searchedAssetRows;
    }

    return searchedAssetRows.filter((row) => {
      return appliedFilters.every((filter) => {
        if (filter.field === 'Category') {
          const matches = row.category === filter.value;
          return filter.operator === "is" ? matches : !matches;
        }
        return true;
      });
    });
  }, [searchedAssetRows, appliedFilters]);

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

  const selectedAssignedRows = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((index) => filteredAssignedRows[Number(index)])
      .filter(Boolean);
  }, [rowSelection, filteredAssignedRows]);

  const hasReminderCandidates = useMemo(() => {
    return selectedAssignedRows.some(
      (r) => ["pending approval", "overdue", "requested"].includes(r.state)
    );
  }, [selectedAssignedRows]);

  const hasMarkReceivedCandidates = useMemo(() => {
    return selectedAssignedRows.some(
      (r) => ["requested", "overdue", "assigned"].includes(r.state)
    );
  }, [selectedAssignedRows]);

  const applyFilter = (nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter((f) => f.field !== nextFilter.field);
      return [...withoutCurrentField, nextFilter];
    });
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((currentFilters) => currentFilters.filter((f) => f.field !== field));
  };

  const clearAllFilters = () => {
    setAppliedFilters([]);
  };

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("panel");
    params.delete("id");
    params.delete("animate");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedAsset = useMemo(
    () => assetRows.find((a) => a.assetTag === activeAssetId || a.assetId === activeAssetId) ?? null,
    [assetRows, activeAssetId]
  );

  const selectionActionsAvailable = useMemo<DataTableSelectionAction<AssetAssignmentRow>[]>(
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

  const selectionActionsAssigned = useMemo<DataTableSelectionAction<AssetAssignmentRow>[]>(
    () => {
      const actions: DataTableSelectionAction<AssetAssignmentRow>[] = [];

      if (hasMarkReceivedCandidates) {
        actions.push({
          id: "mark-received",
          label: "Received",
          tone: "secondary",
          onClick: async (selectedRows) => {
            const ids = selectedRows
              .filter((r) => ["requested", "overdue", "assigned"].includes(r.state))
              .map((r) => r.assignmentId)
              .filter((id): id is number => id !== undefined);

            if (ids.length === 0) return;

            const result = await markAssetReceivedAction(ids);
            if (result.success) {
              toast.success(`${ids.length} assets marked as received`);
              setRowSelection({});
            } else {
              toast.error(result.error || "Failed to mark as received");
            }
          },
        });
      }

      if (hasReminderCandidates || selectedAssignedRows.some(r => r.state === "assigned")) {
        actions.push({
          id: "reminder-or-return",
          label: hasReminderCandidates ? "Send Reminder" : "Request Return",
          tone: "primary",
          onClick: async (selectedRows) => {
            const ids = selectedRows
              .map((r) => r.assignmentId)
              .filter((id): id is number => id !== undefined);

            if (ids.length === 0) return;

            if (hasReminderCandidates) {
              const reminderIds = selectedRows
                .filter((r) => ["pending approval", "overdue", "requested"].includes(r.state))
                .map((r) => r.assignmentId)
                .filter((id): id is number => id !== undefined);

              const result = await sendAssignmentReminderAction(reminderIds);
              if (result.success) {
                toast.success(`Reminder sent for ${reminderIds.length} assets`);
                setRowSelection({});
              } else {
                toast.error(result.error || "Failed to send reminders");
              }
            } else {
              const returnIds = selectedRows
                .filter((r) => r.state === "assigned")
                .map((r) => r.assignmentId)
                .filter((id): id is number => id !== undefined);

              const result = await requestAssetReturnAction(returnIds);
              if (result.success) {
                toast.success(`Return requested for ${returnIds.length} assets`);
                setRowSelection({});
              } else {
                toast.error(result.error || "Failed to request return");
              }
            }
          },
        });
      }

      return actions;
    },
    [selectedAssignedRows, hasReminderCandidates, hasMarkReceivedCandidates]
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
    {
      accessorKey: "state",
      header: "Status",
      cell: ({ row }) => {
        const state = row.original.state;
        const colors: Record<string, string> = {
          'pending approval': "bg-amber-50 text-amber-700 border-amber-200",
          'assigned': "bg-emerald-50 text-emerald-700 border-emerald-200",
          'overdue': "bg-rose-50 text-rose-700 border-rose-200",
          'requested': "bg-blue-50 text-blue-700 border-blue-200",
          'returned': "bg-slate-50 text-slate-700 border-slate-200",
        };
        const colorClass = colors[state] || "bg-slate-50 text-slate-700 border-slate-200";

        return (
          <Badge variant="outline" className={`h-5 rounded-full px-2 text-[11px] font-medium capitalize ${colorClass}`}>
            {state}
          </Badge>
        );
      },
    },
  ], []);

  // 4. Handlers to trigger the Slide Panel via URL
  const handleRowClick = (row: AssetAssignmentRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("panel", "record");
    params.set("id", row.assetTag);
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
    actions?: DataTableSelectionAction<AssetAssignmentRow>[],
    showStatusColumn = false
  ) => {
    const tableColumns = showStatusColumn
      ? columns
      : columns.filter((col) => !("accessorKey" in col) || col.accessorKey !== "state");

    return (
      <div className="flex flex-1 flex-col min-h-0 gap-4">
        <FilterBar
          searchQuery={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search assets..."
          fields={filterFieldConfigs}
          appliedFilters={appliedFilters}
          onApplyFilter={applyFilter}
          onClearFilter={clearFilter}
          onClearAllFilters={clearAllFilters}
        />

        <DataTable<AssetAssignmentRow, unknown>
          columns={tableColumns}
          data={rows}
          onRowClick={handleRowClick}
          initialPageSize={10}
          className="rounded-lg border-slate-200"
          selectionActions={actions}
          selectionLabel={(count) => `${count} Assets Selected`}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-6">
          <div className="mb-4 shrink-0">
            <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
              Assignments and Returns
            </h1>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ModuleNavigationTabs
              tabs={tabs}
              defaultTab="available-assets"
              onTabChange={() => {
                setRowSelection({});
                if (isPanelOpen) {
                  handleClosePanel();
                }
              }}
              containerClassName="flex flex-1 flex-col overflow-hidden [&>div.mt-4]:flex [&>div.mt-4]:min-h-0 [&>div.mt-4]:flex-1 [&>div.mt-4]:flex-col [&>div.mt-4]:overflow-hidden"
            >
              <TabsContent value="available-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredAvailableRows, selectionActionsAvailable, false)}
              </TabsContent>

              <TabsContent value="assigned-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredAssignedRows, selectionActionsAssigned, true)}
              </TabsContent>

              <TabsContent value="returned-assets" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                {renderTable(filteredReturnedRows, undefined, false)}
              </TabsContent>
            </ModuleNavigationTabs>
          </div>
        </main>
      </div>

      <AssignmentsPanels
        isOpen={isPanelOpen}
        disableTransition={searchParams.get("animate") === "0"}
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