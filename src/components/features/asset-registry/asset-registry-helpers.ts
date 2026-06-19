import type { RegistryFilterField, RegistryViewConfig } from './registry-config';
import type { DataTableSelectionAction } from '@/components/shared/data-table';
import type { AssetRegistryRow, CategoryOption, AssetRegistryCategory } from './asset-registry.types';
import { DEFAULT_STATUS_OPTIONS } from './asset-registry-constants';

// ---------------------------------------------------------------------------
// Cell display
// ---------------------------------------------------------------------------

/**
 * Returns a dash placeholder when the value is null, undefined, or blank.
 * Used across the registry to keep empty cells visually consistent.
 */
export function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }

  return value;
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

/**
 * Derives unique filter option values for a given filter field from the
 * current row data.  Extracted from the component body so the `useMemo`
 * callback stays focused on orchestration, and this logic can be unit
 * tested independently.
 */
export function collectFilterOptions(
  field: RegistryFilterField,
  rows: AssetRegistryRow[],
  customStatuses: string[]
): string[] {
  switch (field) {
    case 'Status': {
      const statuses = new Set<string>([...DEFAULT_STATUS_OPTIONS, ...customStatuses]);
      for (const row of rows) statuses.add(row.status);
      return [...statuses];
    }
    case 'Condition': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.condition ?? '-');
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    case 'Location': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.location ?? '-');
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    case 'Model': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.model);
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    case 'Assigned To': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.assignedTo ?? '-');
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    case 'Pillar': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.pillar);
      return [...set].sort((a, b) => a.localeCompare(b));
    }
    case 'Category': {
      const set = new Set<string>();
      for (const row of rows) set.add(row.category);
      return [...set].sort((a, b) => a.localeCompare(b));
    }
  }
}

// ---------------------------------------------------------------------------
// Category options
// ---------------------------------------------------------------------------

/**
 * Builds the category option list from server-provided categories and
 * the view configuration.  Extracted so the derivation logic is testable
 * in isolation and the component body stays declarative.
 */
export function buildCategoryOptions(
  config: RegistryViewConfig,
  initialCategories: AssetRegistryCategory[]
): CategoryOption[] {
  const options: CategoryOption[] = [];

  if (config.showAllCategoryOption) {
    options.push({
      name: config.allCategoryLabel,
      isAll: true,
    });
  }

  for (const category of initialCategories) {
    options.push({
      id: category.id,
      name: category.name,
    });
  }

  if (options.length === 0) {
    options.push({
      name: config.defaultCategoryLabel,
      isAll: true,
    });
  }

  return options;
}

// ---------------------------------------------------------------------------
// Selection actions
// ---------------------------------------------------------------------------

/**
 * Builds the selection actions array for the DataTable based on the
 * current view and mutation state.  Extracted from the component body
 * to reduce the cognitive load of the main render function and improve
 * readability of the action definitions.
 */
export function buildSelectionActions(
  config: RegistryViewConfig,
  isMutating: boolean,
  callbacks: {
    onPrintTags: (rows: AssetRegistryRow[]) => void;
    onBulkStatusChange: (status: 'Available' | 'Assigned', ids: string[]) => void;
    onBulkTransfer: (rows: AssetRegistryRow[]) => void;
    onDispose: (rows: AssetRegistryRow[]) => void;
  }
): DataTableSelectionAction<AssetRegistryRow>[] {
  const actions: DataTableSelectionAction<AssetRegistryRow>[] = [
    {
      id: 'print-qr',
      label: 'Print Asset Tags',
      disabled: isMutating,
      onClick: callbacks.onPrintTags,
    },
  ];

  if (config.view === 'hardware') {
    actions.push({
      id: 'assign-or-return',
      label: 'Assign / Return',
      disabled: isMutating,
      onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
        const allSelectedAssigned =
          selectedRowsForAction.length > 0 &&
          selectedRowsForAction.every((selectedRow) => selectedRow.status === 'Assigned');

        const nextStatus = allSelectedAssigned ? 'Available' : 'Assigned';

        callbacks.onBulkStatusChange(
          nextStatus,
          selectedRowsForAction.map((selectedRow) => selectedRow.id)
        );
      },
    });
  }

  if (config.view !== 'software') {
    actions.push({
      id: 'bulk-transfer',
      label: 'Bulk Transfer',
      disabled: isMutating,
      hidden: (selectedRows) =>
        config.view === 'unified' && selectedRows.some(row => row.pillar === 'Software'),
      onClick: callbacks.onBulkTransfer,
    } as DataTableSelectionAction<AssetRegistryRow>);
  }

  actions.push({
    id: 'dispose',
    label: 'Dispose',
    tone: 'destructive',
    disabled: isMutating,
    onClick: callbacks.onDispose,
  });

  return actions;
}
