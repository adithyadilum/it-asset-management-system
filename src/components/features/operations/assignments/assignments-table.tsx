"use client";

import {
  DataTable,
  type DataTableSelectionAction,
} from "@/components/shared/data-table";
import { FilterBar, type AppliedFilter, type FilterFieldConfig } from "@/components/shared/filter-bar";
import type { ColumnDef, RowSelectionState, OnChangeFn } from "@tanstack/react-table";

export type AssetAssignmentRow = {
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

interface AssignmentsTableProps {
  rows: AssetAssignmentRow[];
  columns: ColumnDef<AssetAssignmentRow>[];
  selectionActions?: DataTableSelectionAction<AssetAssignmentRow>[];
  showStatusColumn?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterFieldConfigs: FilterFieldConfig[];
  appliedFilters: AppliedFilter[];
  onApplyFilter: (filter: AppliedFilter) => void;
  onClearFilter: (field: string) => void;
  onClearAllFilters: () => void;
  onRowClick: (row: AssetAssignmentRow, rowIndex: number) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  disableSelectionHeader?: boolean;
}

export function AssignmentsTable({
  rows,
  columns,
  selectionActions,
  showStatusColumn = false,
  searchValue,
  onSearchChange,
  filterFieldConfigs,
  appliedFilters,
  onApplyFilter,
  onClearFilter,
  onClearAllFilters,
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  disableSelectionHeader = false,
}: AssignmentsTableProps) {
  const tableColumns = showStatusColumn
    ? columns
    : columns.filter((col) => !("accessorKey" in col) || col.accessorKey !== "state");

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0 mt-1">
      <FilterBar
        searchQuery={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search assets..."
        fields={filterFieldConfigs}
        appliedFilters={appliedFilters}
        onApplyFilter={onApplyFilter}
        onClearFilter={onClearFilter}
        onClearAllFilters={onClearAllFilters}
      />

      <DataTable<AssetAssignmentRow, unknown>
        columns={tableColumns}
        data={rows}
        onRowClick={onRowClick}
        initialPageSize={10}
        className="flex-1 min-h-0 rounded-lg border border-border"
        selectionActions={selectionActions}
        selectionLabel={(count) => `${count} Assets Selected`}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        disableSelectionHeader={disableSelectionHeader}
      />
    </div>
  );
}
