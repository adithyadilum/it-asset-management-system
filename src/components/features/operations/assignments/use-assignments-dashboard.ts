'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { RowSelectionState } from '@tanstack/react-table';
import {
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction,
  cancelAssignmentAction,
} from '@/actions/assignments';
import type {
  AppliedFilter,
  FilterFieldConfig,
} from '@/components/shared/filter-bar';
import type { DataTableSelectionAction } from '@/components/shared/data-table';
import type {
  AssignmentsDashboardData,
  AssignmentsDashboardRow,
} from '@/lib/data/operations-assignments-repo';
import type { AssetAssignmentRow } from './assignments-table';
import type { MultiAssetAssignmentItem } from './multi-asset-assignment-modal';

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function useAssignmentsDashboard(data: AssignmentsDashboardData) {
  const [searchValue, setSearchValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [isMultiAssignModalOpen, setIsMultiAssignModalOpen] = useState(false);
  const [multiAssignAssets, setMultiAssignAssets] = useState<
    MultiAssetAssignmentItem[]
  >([]);

  const mapRow = useCallback(
    (asset: AssignmentsDashboardRow): AssetAssignmentRow => ({
      assetId: asset.id,
      assetName: asset.name ?? asset.assetTag,
      serialNumber: asset.serialNumber ?? '-',
      category: asset.category,
      status: asset.status,
      model: '-',
      brand: '-',
      owner: '-',
      group: asset.pillar,
      assignedTo: asset.assignedTo ?? '-',
      department: asset.pillar,
      assignedDate: formatDate(asset.assignedDate),
      expectedReturnDate: formatDate(asset.expectedReturnDate),
      dateCreated: formatDate(asset.createdAt),
      updatedAt: formatDate(asset.updatedAt),
      warranty: '-',
      lastRepaired: '-',
      note: asset.location ?? '-',
      assetTag: asset.assetTag,
      state: asset.state,
      assignmentId: asset.assignmentId ?? undefined,
    }),
    []
  );

  const availableRows = useMemo(
    () => data.available.map(mapRow),
    [data.available, mapRow]
  );
  const assignedRows = useMemo(
    () => data.assigned.map(mapRow),
    [data.assigned, mapRow]
  );
  const returnedRows = useMemo(
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

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    for (const row of assetRows) {
      if (row.state && row.state.trim().length > 0) {
        statuses.add(row.state);
      }
    }
    return [...statuses].sort((left, right) => left.localeCompare(right));
  }, [assetRows]);

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(
    () => [
      { value: 'Category', label: 'Category', options: categoryOptions },
      { value: 'Status', label: 'Status', options: statusOptions },
    ],
    [categoryOptions, statusOptions]
  );

  const searchedAssetRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return assetRows;

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
    if (appliedFilters.length === 0) return searchedAssetRows;

    return searchedAssetRows.filter((row) => {
      return appliedFilters.every((filter) => {
        if (filter.field === 'Category') {
          const matches = row.category === filter.value;
          return filter.operator === 'is' ? matches : !matches;
        }
        if (filter.field === 'Status') {
          const matches = row.state === filter.value;
          return filter.operator === 'is' ? matches : !matches;
        }
        return true;
      });
    });
  }, [searchedAssetRows, appliedFilters]);

  const filteredAvailableRows = useMemo(
    () =>
      filteredAssetRows.filter((row) =>
        availableRows.some(
          (availableRow) => availableRow.assetId === row.assetId
        )
      ),
    [availableRows, filteredAssetRows]
  );

  const filteredAssignedRows = useMemo(
    () =>
      filteredAssetRows.filter((row) =>
        assignedRows.some((assignedRow) => assignedRow.assetId === row.assetId)
      ),
    [assignedRows, filteredAssetRows]
  );

  const filteredReturnedRows = useMemo(
    () =>
      filteredAssetRows.filter((row) =>
        returnedRows.some((returnedRow) => returnedRow.assetId === row.assetId)
      ),
    [filteredAssetRows, returnedRows]
  );

  const selectedAssignedRows = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((index) => filteredAssignedRows[Number(index)])
      .filter(Boolean);
  }, [rowSelection, filteredAssignedRows]);

  const hasReminderCandidates = useMemo(
    () =>
      selectedAssignedRows.some((r) =>
        ['pending approval', 'overdue'].includes(r.state)
      ),
    [selectedAssignedRows]
  );
  const hasCancelCandidates = useMemo(
    () => selectedAssignedRows.some((r) => r.state === 'pending approval'),
    [selectedAssignedRows]
  );
  const hasMarkReceivedCandidates = useMemo(
    () =>
      selectedAssignedRows.some((r) =>
        ['requested', 'overdue'].includes(r.state)
      ),
    [selectedAssignedRows]
  );
  const hasRequestAgainCandidates = useMemo(
    () => selectedAssignedRows.some((r) => r.state === 'requested'),
    [selectedAssignedRows]
  );
  const hasReturnCandidates = useMemo(
    () => selectedAssignedRows.some((r) => r.state === 'assigned'),
    [selectedAssignedRows]
  );

  const selectionActionsAvailable = useMemo<
    DataTableSelectionAction<AssetAssignmentRow>[]
  >(
    () => [
      {
        id: 'assign-assets',
        label: 'Assign Assets',
        tone: 'primary',
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

  const selectionActionsAssigned = useMemo<
    DataTableSelectionAction<AssetAssignmentRow>[]
  >(() => {
    const actions: DataTableSelectionAction<AssetAssignmentRow>[] = [];

    if (hasMarkReceivedCandidates) {
      actions.push({
        id: 'mark-received',
        label: 'Returned',
        tone: 'secondary',
        onClick: async (selectedRows) => {
          const ids = selectedRows
            .filter((r) => ['requested', 'overdue'].includes(r.state))
            .map((r) => r.assignmentId)
            .filter((id): id is number => id !== undefined);

          if (ids.length === 0) return;

          const result = await markAssetReceivedAction(ids);
          if (result.success) {
            toast.success(`${ids.length} assets marked as returned`);
            setRowSelection({});
          } else {
            toast.error(result.error || 'Failed to mark as returned');
          }
        },
      });
    }

    if (hasRequestAgainCandidates) {
      actions.push({
        id: 'request-again',
        label: 'Request Again',
        tone: 'secondary',
        onClick: async (selectedRows) => {
          const ids = selectedRows
            .filter((r) => r.state === 'requested')
            .map((r) => r.assignmentId)
            .filter((id): id is number => id !== undefined);

          if (ids.length === 0) return;

          const result = await requestAssetReturnAction(ids);
          if (result.success) {
            toast.success(`Return re-requested for ${ids.length} assets`);
            setRowSelection({});
          } else {
            toast.error(result.error || 'Failed to re-request return');
          }
        },
      });
    }

    if (hasReminderCandidates) {
      actions.push({
        id: 'send-reminder',
        label: 'Send Reminder',
        tone: 'primary',
        onClick: async (selectedRows) => {
          const reminderIds = selectedRows
            .filter((r) => ['pending approval', 'overdue'].includes(r.state))
            .map((r) => r.assignmentId)
            .filter((id): id is number => id !== undefined);

          if (reminderIds.length === 0) return;

          const result = await sendAssignmentReminderAction(reminderIds);
          if (result.success) {
            toast.success(`Reminder sent for ${reminderIds.length} assets`);
            setRowSelection({});
          } else {
            toast.error(result.error || 'Failed to send reminders');
          }
        },
      });
    }

    if (hasCancelCandidates) {
      actions.push({
        id: 'cancel-assignment',
        label: 'Cancel Assignment',
        tone: 'destructive',
        onClick: async (selectedRows) => {
          // Only pending rows can be withdrawn; anything already acknowledged
          // has to go through the return flow instead.
          const cancelIds = selectedRows
            .filter((r) => r.state === 'pending approval')
            .map((r) => r.assignmentId)
            .filter((id): id is number => id !== undefined);

          if (cancelIds.length === 0) return;

          const results = await Promise.all(
            cancelIds.map((id) => cancelAssignmentAction(id))
          );
          const failed = results.filter((r) => !r.success);

          if (failed.length === 0) {
            toast.success(
              cancelIds.length === 1
                ? 'Assignment cancelled'
                : `${cancelIds.length} assignments cancelled`
            );
            setRowSelection({});
          } else {
            toast.error(
              failed[0].error ||
                `Failed to cancel ${failed.length} of ${cancelIds.length} assignments`
            );
          }
        },
      });
    }

    if (hasReturnCandidates) {
      actions.push({
        id: 'request-return',
        label: 'Request Return',
        tone: 'primary',
        onClick: async (selectedRows) => {
          const returnIds = selectedRows
            .filter((r) => r.state === 'assigned')
            .map((r) => r.assignmentId)
            .filter((id): id is number => id !== undefined);

          if (returnIds.length === 0) return;

          const result = await requestAssetReturnAction(returnIds);
          if (result.success) {
            toast.success(`Return requested for ${returnIds.length} assets`);
            setRowSelection({});
          } else {
            toast.error(result.error || 'Failed to request return');
          }
        },
      });
    }

    return actions;
  }, [
    hasReminderCandidates,
    hasCancelCandidates,
    hasMarkReceivedCandidates,
    hasRequestAgainCandidates,
    hasReturnCandidates,
  ]);

  const applyFilter = useCallback((nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter(
        (f) => f.field !== nextFilter.field
      );
      return [...withoutCurrentField, nextFilter];
    });
  }, []);

  const clearFilter = useCallback((field: string) => {
    setAppliedFilters((currentFilters) =>
      currentFilters.filter((f) => f.field !== field)
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setAppliedFilters([]);
  }, []);

  return {
    searchValue,
    setSearchValue,
    appliedFilters,
    rowSelection,
    setRowSelection,
    applyFilter,
    clearFilter,
    clearAllFilters,
    filterFieldConfigs,
    assetRows,
    filteredAvailableRows,
    filteredAssignedRows,
    filteredReturnedRows,
    returnedRows,
    selectionActionsAvailable,
    selectionActionsAssigned,
    isMultiAssignModalOpen,
    setIsMultiAssignModalOpen,
    multiAssignAssets,
    setMultiAssignAssets,
  };
}
