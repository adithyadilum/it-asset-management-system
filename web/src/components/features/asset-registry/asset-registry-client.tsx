'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarDays,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  bulkUpdateAssets,
  getAssetsByPillar,
} from '@/actions/asset-registry';
import {
  type RegistryViewConfig,
} from '@/components/features/asset-registry/registry-config';
import {
  DataTable,
  type DataTableSelectionAction,
} from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

type FilterField = 'Status' | 'User';
type FilterOperator = 'is' | 'is not';

type AssetRegistryCategory = {
  id: number;
  name: string;
  prefix: string;
  pillar: string;
};

type AssetRegistryRow = {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  categoryId: number;
  category: string;
  pillar: string;
  model: string;
  locationId: number | null;
  location: string | null;
  assignedTo: string | null;
  instanceAttributes: Record<string, unknown> | null;
  updatedAt: Date | string;
};

type AssetRegistryResult = {
  data: AssetRegistryRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

type AppliedFilter = {
  field: FilterField;
  operator: FilterOperator;
  value: string;
};

type CategoryOption = {
  id?: number;
  name: string;
  isAll?: boolean;
};

const STATUS_OPTIONS = [
  'Available',
  'Assigned',
  'In Repair',
  'Defective',
  'Lost',
  'Retired',
  'Disposed',
  'New',
];

const ELECTRONICS_CONDITION_STYLES: Record<string, string> = {
  Active: 'border border-green-300 bg-green-50 text-green-700',
  'Inspection Due': 'border border-blue-300 bg-blue-50 text-blue-700',
  'Under Maintenance': 'border border-orange-300 bg-orange-50 text-orange-700',
  Scheduled: 'border border-slate-300 bg-slate-50 text-slate-700',
};

const BULK_FETCH_PAGE_SIZE = 200;

function normalizeCategoryLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

function toCategoryDisplayLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (trimmed.endsWith('s')) {
    return trimmed;
  }

  return `${trimmed}s`;
}

function toHardwareDisplayStatus(row: AssetRegistryRow) {
  // Status column must always represent the persisted asset status from DB.
  return row.status;
}

function toElectronicsDisplayCondition(row: AssetRegistryRow) {
  if (row.condition) {
    return row.condition;
  }

  if (row.status === 'Available') {
    return 'Active';
  }

  if (row.status === 'Assigned') {
    return 'Scheduled';
  }

  if (row.status === 'In Repair') {
    return 'Under Maintenance';
  }

  if (row.status === 'Defective') {
    return 'Inspection Due';
  }

  return 'Scheduled';
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }

  return value;
}

function renderCategoryBadge(category: string) {
  return (
    <Badge
      variant="outline"
      className="h-5 rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-normal text-slate-500"
    >
      {category}
    </Badge>
  );
}

function renderElectronicsConditionBadge(condition: string) {
  const className =
    ELECTRONICS_CONDITION_STYLES[condition] ??
    'border border-slate-300 bg-slate-50 text-slate-700';

  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${className}`}
    >
      {condition}
    </span>
  );
}


interface AssetRegistryClientProps {
  config: RegistryViewConfig;
  initialCategories: AssetRegistryCategory[];
  initialResult: AssetRegistryResult;
  currentPanel?: string;
}

export function AssetRegistryClient({
  config,
  initialCategories,
  initialResult,
  currentPanel,
}: AssetRegistryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPanelOpen = Boolean(currentPanel);

  const [rows, setRows] = useState<AssetRegistryRow[]>(initialResult.data);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState(
    config.defaultCategoryLabel
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSelectionRows, setTransferSelectionRows] = useState<AssetRegistryRow[]>([]);
  const [isMutating, setIsMutating] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [draftField, setDraftField] = useState<FilterField>('Status');
  const [draftOperator, setDraftOperator] = useState<FilterOperator>('is');
  const [draftValue, setDraftValue] = useState('');

  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(
    null
  );
  const [transferDate, setTransferDate] = useState('');

  const requestSequenceRef = useRef(0);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedQuery(searchValue.trim());
    }, 250);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchValue]);

  const categoryOptions = useMemo(() => {
    const merged = new Map<string, CategoryOption>();

    if (config.showAllCategoryOption) {
      merged.set(config.allCategoryLabel, {
        name: config.allCategoryLabel,
        isAll: true,
      });
    }

    for (const category of initialCategories) {
      const displayName = toCategoryDisplayLabel(category.name);
      merged.set(displayName, {
        id: category.id,
        name: displayName,
      });
    }

    for (const fallbackCategory of config.fallbackCategories) {
      if (!merged.has(fallbackCategory)) {
        merged.set(fallbackCategory, { name: fallbackCategory });
      }
    }

    if (!merged.has(config.defaultCategoryLabel)) {
      merged.set(config.defaultCategoryLabel, {
        name: config.defaultCategoryLabel,
        isAll: config.defaultCategoryLabel === config.allCategoryLabel,
      });
    }

    return [...merged.values()];
  }, [
    config.allCategoryLabel,
    config.defaultCategoryLabel,
    config.fallbackCategories,
    config.showAllCategoryOption,
    initialCategories,
  ]);

  const selectedCategoryOption = useMemo(() => {
    return (
      categoryOptions.find((categoryOption) => categoryOption.name === selectedCategoryName) ??
      categoryOptions[0] ?? {
        name: config.defaultCategoryLabel,
        isAll: true,
      }
    );
  }, [categoryOptions, config.defaultCategoryLabel, selectedCategoryName]);

  const selectedCategoryId =
    typeof selectedCategoryOption.id === 'number'
      ? selectedCategoryOption.id
      : undefined;

  const statusFilter = appliedFilters.find((filter) => filter.field === 'Status');
  const userFilter = appliedFilters.find((filter) => filter.field === 'User');

  const backendStatusFilter =
    statusFilter?.operator === 'is' ? statusFilter.value : undefined;

  const hasLocalFiltering =
    Boolean(userFilter) ||
    statusFilter?.operator === 'is not' ||
    Boolean(
      selectedCategoryOption.name &&
        !selectedCategoryOption.isAll &&
        !selectedCategoryOption.id
    );

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    const loadRows = async () => {
      try {
        const requestParams = {
          pillar: config.pillar,
          query: debouncedQuery,
          categoryId: selectedCategoryId,
          status: backendStatusFilter,
        };

        const firstPage = await getAssetsByPillar({
          ...requestParams,
          page: 1,
          pageSize: BULK_FETCH_PAGE_SIZE,
        });

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        let aggregatedRows = [...firstPage.data];

        for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
          const nextPage = await getAssetsByPillar({
            ...requestParams,
            page,
            pageSize: BULK_FETCH_PAGE_SIZE,
          });

          if (requestSequence !== requestSequenceRef.current) {
            return;
          }

          aggregatedRows = aggregatedRows.concat(nextPage.data);
        }

        setRows(aggregatedRows);
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        setRows([]);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load assets.'
        );
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setIsLoading(false);
        }
      }
    };

    void loadRows();
  }, [
    backendStatusFilter,
    config.pillar,
    debouncedQuery,
    refreshNonce,
    selectedCategoryId,
  ]);

  const filteredRows = useMemo(() => {
    let nextRows = rows;

    if (!selectedCategoryOption.isAll && !selectedCategoryOption.id) {
      const selectedCategoryToken = normalizeCategoryLabel(
        selectedCategoryOption.name
      );

      nextRows = nextRows.filter((row) => {
        const rowCategoryToken = normalizeCategoryLabel(row.category);
        return rowCategoryToken === selectedCategoryToken;
      });
    }

    if (statusFilter?.operator === 'is not') {
      nextRows = nextRows.filter((row) => row.status !== statusFilter.value);
    }

    if (userFilter) {
      nextRows = nextRows.filter((row) => {
        const assignedTo = row.assignedTo ?? '-';

        if (userFilter.operator === 'is not') {
          return assignedTo !== userFilter.value;
        }

        return assignedTo === userFilter.value;
      });
    }

    return nextRows;
  }, [rows, selectedCategoryOption, statusFilter, userFilter]);

  const visibleRows = hasLocalFiltering ? filteredRows : rows;

  const locationOptions = useMemo(() => {
    const merged = new Map<number, string>();

    for (const row of rows) {
      if (row.locationId && row.location) {
        merged.set(row.locationId, row.location);
      }
    }

    return [...merged.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const uniqueSelectedLocations = useMemo(() => {
    const merged = new Set<string>();

    for (const row of transferSelectionRows) {
      merged.add(row.location ?? '-');
    }

    return [...merged];
  }, [transferSelectionRows]);

  const filterValueOptions = useMemo(() => {
    if (draftField === 'User') {
      const users = new Set<string>();

      for (const row of rows) {
        users.add(row.assignedTo ?? '-');
      }

      return [...users].sort((a, b) => a.localeCompare(b));
    }

    const statuses = new Set<string>(STATUS_OPTIONS);

    for (const row of rows) {
      statuses.add(row.status);
    }

    return [...statuses];
  }, [draftField, rows]);

  useEffect(() => {
    if (filterValueOptions.length === 0) {
      setDraftValue('');
      return;
    }

    if (!filterValueOptions.includes(draftValue)) {
      setDraftValue(filterValueOptions[0]);
    }
  }, [draftValue, filterValueOptions]);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    setIsCategoryPopoverOpen(false);
  };

  const setOrReplaceFilter = (nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter(
        (currentFilter) => currentFilter.field !== nextFilter.field
      );

      return [...withoutCurrentField, nextFilter];
    });

    setIsFilterPopoverOpen(false);
  };

  const clearFilter = (field: FilterField) => {
    setAppliedFilters((currentFilters) =>
      currentFilters.filter((currentFilter) => currentFilter.field !== field)
    );
  };

  const clearAllFilters = () => {
    setAppliedFilters([]);
  };

  const performBulkStatusChange = async (
    status:
      | 'Available'
      | 'Assigned'
      | 'In Repair'
      | 'Defective'
      | 'Lost'
      | 'Retired'
      | 'Disposed',
    selectedAssetIds: string[]
  ) => {
    if (selectedAssetIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const result = await bulkUpdateAssets({
        assetIds: selectedAssetIds,
        updates: {
          status,
        },
        actionType: 'BULK_STATUS_UPDATE',
      });

      if (!result.success) {
        setErrorMessage(result.error ?? 'Bulk status update failed.');
        return;
      }

      setRefreshNonce((currentNonce) => currentNonce + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Bulk status update failed.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const performBulkTransfer = async () => {
    const selectedAssetIds = transferSelectionRows.map(
      (selectedRow) => selectedRow.id
    );

    if (selectedAssetIds.length === 0 || !destinationLocationId) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const result = await bulkUpdateAssets({
        assetIds: selectedAssetIds,
        updates: {
          locationId: destinationLocationId,
        },
        actionType: 'BULK_TRANSFER',
      });

      if (!result.success) {
        setErrorMessage(result.error ?? 'Bulk transfer failed.');
        return;
      }

      setIsTransferDialogOpen(false);
      setTransferSelectionRows([]);
      setDestinationLocationId(null);
      setRefreshNonce((currentNonce) => currentNonce + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Bulk transfer failed.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const tableColumns = useMemo<ColumnDef<AssetRegistryRow>[]>(() => {
    if (config.view === 'furniture') {
      return [
        {
          accessorKey: 'assetTag',
          header: 'Asset ID',
        },
        {
          accessorKey: 'name',
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'location',
          header: 'Location',
          cell: ({ row }) => toCellText(row.original.location),
        },
        {
          accessorKey: 'condition',
          header: 'Condition',
          cell: ({ row }) => (
            <StatusBadge value={row.original.condition ?? 'New'} showIcon />
          ),
        },
      ];
    }

    if (config.view === 'office-electronics') {
      return [
        {
          accessorKey: 'assetTag',
          header: 'Asset ID',
        },
        {
          accessorKey: 'name',
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'location',
          header: 'Location',
          cell: ({ row }) => toCellText(row.original.location),
        },
        {
          id: 'ipOrMacAddress',
          header: 'IP/MAC Address',
          cell: ({ row }) => String(row.original.instanceAttributes?.['IP/MAC Address'] ?? '-'),
          enableSorting: false,
        },
        {
          id: 'electronicsCondition',
          header: 'Condition',
          cell: ({ row }) =>
            renderElectronicsConditionBadge(
              toElectronicsDisplayCondition(row.original)
            ),
          enableSorting: false,
        },
      ];
    }

    if (config.view === 'software') {
      return [
        {
          accessorKey: 'name',
          header: 'Software Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'serialNumber',
          header: 'License Key',
          cell: ({ row }) => {
            const serialNumber = row.original.serialNumber;

            return serialNumber
              ? `${serialNumber.slice(0, 4)}-${serialNumber.slice(-4)}`
              : 'XXXX-XXXX';
          },
        },
        {
          id: 'totalSeats',
          header: 'Total Seats',
          cell: ({ row }) => String(row.original.instanceAttributes?.['Total Seats'] ?? '-'),
          enableSorting: false,
        },
        {
          id: 'availableSeats',
          header: 'Available Seats',
          cell: ({ row }) => String(row.original.instanceAttributes?.['Available Seats'] ?? '-'),
          enableSorting: false,
        },
        {
          id: 'expirationDate',
          header: 'Expiration Date',
          cell: ({ row }) => String(row.original.instanceAttributes?.['Expiration Date'] ?? '-'),
          enableSorting: false,
        },
      ];
    }

    return [
      {
        accessorKey: 'assetTag',
        header: 'Asset ID',
      },
      {
        accessorKey: 'name',
        header: 'Asset Name',
        cell: ({ row }) => toCellText(row.original.name),
      },
      {
        accessorKey: 'serialNumber',
        header: 'Serial Number',
        cell: ({ row }) => toCellText(row.original.serialNumber),
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned to',
        cell: ({ row }) => toCellText(row.original.assignedTo),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge value={toHardwareDisplayStatus(row.original)} showIcon />
        ),
      },
    ];
  }, [config.view]);

  const selectionActions: DataTableSelectionAction<AssetRegistryRow>[] = [
    {
      id: 'print-qr',
      label: 'Print QR code',
      disabled: isMutating,
    },
    ...(config.view === 'hardware'
      ? [
          {
            id: 'assign-or-return',
            label: 'Assign / Return',
            disabled: isMutating,
            onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
              const allSelectedAssigned =
                selectedRowsForAction.length > 0 &&
                selectedRowsForAction.every(
                  (selectedRow) => selectedRow.status === 'Assigned'
                );

              const nextStatus = allSelectedAssigned ? 'Available' : 'Assigned';

              void performBulkStatusChange(
                nextStatus,
                selectedRowsForAction.map((selectedRow) => selectedRow.id)
              );
            },
          } as DataTableSelectionAction<AssetRegistryRow>,
        ]
      : []),
    ...(config.view !== 'software'
      ? [
          {
            id: 'bulk-transfer',
            label: 'Bulk Transfer',
            disabled: isMutating,
            onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
              setTransferSelectionRows(selectedRowsForAction);
              setDestinationLocationId(null);
              setTransferDate('');
              setIsTransferDialogOpen(true);
            },
          } as DataTableSelectionAction<AssetRegistryRow>,
        ]
      : []),
    {
      id: 'dispose',
      label: 'Dispose',
      tone: 'destructive',
      disabled: isMutating,
      onClick: (selectedRowsForAction: AssetRegistryRow[]) =>
        void performBulkStatusChange(
          'Disposed',
          selectedRowsForAction.map((selectedRow) => selectedRow.id)
        ),
    },
  ];

  const tableSkeletonColumnWidths =
    config.view === 'software'
      ? ['w-[26%]', 'w-[22%]', 'w-[17%]', 'w-[17%]', 'w-[18%]']
      : config.view === 'furniture'
        ? ['w-[18%]', 'w-[26%]', 'w-[16%]', 'w-[20%]', 'w-[20%]']
        : config.view === 'office-electronics'
          ? ['w-[16%]', 'w-[20%]', 'w-[14%]', 'w-[16%]', 'w-[18%]', 'w-[16%]']
          : ['w-[14%]', 'w-[24%]', 'w-[16%]', 'w-[14%]', 'w-[16%]', 'w-[16%]'];

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-6">
      <div className="mb-4">
        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-2 ${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}
            >
              <span>{selectedCategoryOption.name}</span>
              <ChevronDown className="size-5 text-slate-700 mt-1" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={10}
            className="w-fit rounded-lg border border-slate-200 p-2 shadow-xl"
          >
            <div className="w-max space-y-1">
              {categoryOptions
                .map((categoryOption) => (
                  <button
                    key={categoryOption.name}
                    type="button"
                    className="flex w-full items-center whitespace-nowrap rounded-md px-2 py-1 text-left text-sm font-semibold leading-5 text-slate-800 hover:bg-slate-100"
                    onClick={() => handleCategorySelect(categoryOption.name)}
                  >
                    {categoryOption.name}
                  </button>
                ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-[545px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={config.searchPlaceholder}
              className="h-9 pl-9"
            />
          </div>

        <div className="flex items-center gap-2">
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
              className="w-[245px] rounded-lg border border-slate-200 p-0 shadow-xl"
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
                <select
                  value={draftField}
                  onChange={(event) => setDraftField(event.target.value as FilterField)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
                >
                  {config.filterFieldOptions.map((filterFieldOption) => (
                    <option key={filterFieldOption.value} value={filterFieldOption.value}>
                      {filterFieldOption.label}
                    </option>
                  ))}
                </select>

                <div className="space-y-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={draftOperator === 'is'}
                      onChange={() => setDraftOperator('is')}
                    />
                    is
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={draftOperator === 'is not'}
                      onChange={() => setDraftOperator('is not')}
                    />
                    is not
                  </label>
                </div>

                <select
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
                >
                  {filterValueOptions.map((filterValueOption) => (
                    <option key={filterValueOption} value={filterValueOption}>
                      {filterValueOption}
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
                    if (draftValue) {
                      setOrReplaceFilter({
                        field: draftField,
                        operator: draftOperator,
                        value: draftValue,
                      });
                    }
                  }}
                >
                  Apply Filter
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg bg-[#0B1D74] px-3 text-sm text-white hover:bg-[#0A175C]"
          >
            <span className="inline-flex size-4 items-center justify-center rounded-full border border-white/60 text-xs">
              +
            </span>
            {config.addAssetLabel}
          </Button>
        </div>
      </div>

      {appliedFilters.length > 0 ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {appliedFilters.map((appliedFilter) => (
              <span
                key={appliedFilter.field}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-700"
              >
                {`${appliedFilter.field} ${appliedFilter.operator} ${appliedFilter.value}`}
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => clearFilter(appliedFilter.field)}
                >
                  <X className="size-4" />
                </button>
              </span>
            ))}

            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg text-xl text-slate-600 hover:bg-slate-100"
              onClick={() => setIsFilterPopoverOpen(true)}
            >
              +
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700"
            onClick={clearAllFilters}
          >
            Clear Filters
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-h-0">
        {isLoading ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
            <TableSkeleton
              rowCount={8}
              columnWidths={tableSkeletonColumnWidths}
            />
          </div>
        ) : (
          <DataTable<AssetRegistryRow, unknown>
            columns={tableColumns}
            data={visibleRows}
            pageSizeOptions={config.rowsPerPageOptions}
            initialPageSize={config.defaultPageSize}
            selectionActions={selectionActions}
            selectionLabel={(selectedCount) => `${selectedCount} Assets Selected`}
            onRowClick={(row) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('panel', 'record');
              params.set('id', row.id);
              params.set('animate', isPanelOpen ? '0' : '1');
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="rounded-lg border-slate-200"
          />
        )}
      </div>

      <Dialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);

          if (!open) {
            setTransferSelectionRows([]);
            setDestinationLocationId(null);
            setTransferDate('');
          }
        }}
      >
        <DialogContent className="max-w-[360px] rounded-xl border border-slate-200 bg-white p-0">
          <DialogTitle className="sr-only">Transfer assets</DialogTitle>
          <DialogDescription className="sr-only">
            Transfer selected assets to a destination location.
          </DialogDescription>

          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-2xl font-semibold text-slate-900">
              Transfer {transferSelectionRows.length} Assets
            </h3>
          </div>

          <div className="space-y-3 px-4 py-3">
            <ScrollArea className="max-h-24 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="space-y-1">
                {transferSelectionRows.map((selectedRow) => (
                  <div
                    key={selectedRow.id}
                    className="grid grid-cols-[88px_1fr] gap-2 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-800">
                      {selectedRow.assetTag}
                    </span>
                    <span className="truncate">{toCellText(selectedRow.name)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Current Location</label>
              <Input
                value={
                  uniqueSelectedLocations.length === 0
                    ? '-'
                    : uniqueSelectedLocations.length === 1
                    ? uniqueSelectedLocations[0]
                    : 'Multiple locations'
                }
                disabled
                className="h-9 rounded-lg border-slate-200 bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Destination Location
              </label>
              <select
                value={destinationLocationId ?? ''}
                onChange={(event) => {
                  const parsedValue = Number(event.target.value);
                  setDestinationLocationId(
                    Number.isInteger(parsedValue) && parsedValue > 0
                      ? parsedValue
                      : null
                  );
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
              >
                <option value="">Select destination</option>
                {locationOptions.map((locationOption) => (
                  <option key={locationOption.id} value={locationOption.id}>
                    {locationOption.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Transfer Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(event) => setTransferDate(event.target.value)}
                  className="h-9 rounded-lg border-slate-200 pr-9"
                />
                <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-slate-200 px-3 text-sm"
              onClick={() => {
                setIsTransferDialogOpen(false);
                setTransferSelectionRows([]);
                setDestinationLocationId(null);
                setTransferDate('');
              }}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg bg-[#0B1D74] px-3 text-sm text-white hover:bg-[#0A175C]"
              onClick={() => void performBulkTransfer()}
              disabled={
                !destinationLocationId ||
                transferSelectionRows.length === 0 ||
                isMutating
              }
            >
              Confirm Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </main>
  );
}
