'use client';

import {
  ChevronDown,
  Plus,
  Upload,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect, useTransition } from 'react';
import { } from '@/lib/constants';
import { getCustomStatuses, type CustomStatusRow } from '@/actions/statuses';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { bulkUpdateAssets, getAssetsByPillar, getAllAssetsUnified } from '@/actions/asset-registry';
import { BulkImportWizard } from '@/components/features/bulk-import/bulk-import-wizard';
import { PrintConfigurationModal } from '@/components/features/asset-registry/tags/print-configuration-modal';
import { generateAndPrintTagPdf } from '@/lib/utils/tag-print';
import {
  type RegistryViewConfig,
  type RegistryFilterField,
} from '@/components/features/asset-registry/registry-config';
import {
  DataTable,
  type DataTableSelectionAction,
} from '@/components/shared/data-table';
import { DisposeAssetsRequestDialog } from '@/components/features/disposals/dispose-assets-request-dialog';
import { BulkTransferDialog } from '@/components/features/asset-registry/bulk-transfer-dialog';
import { AssetPillarSelectionDialog } from '@/components/shared/asset-pillar-selection-dialog';
import { FilterBar, type AppliedFilter as FilterBarAppliedFilter, type FilterFieldConfig } from '@/components/shared/filter-bar';
import { tiqriToast } from '@/components/shared/sonner';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useAssetColumns, type ManualStatus } from './use-asset-columns';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FilterField = RegistryFilterField;

type AssetRegistryCategory = {
  id: number;
  name: string;
  prefix: string;
  pillar: string;
};

export type AssetRegistryRow = {
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
  // SAM fields
  totalSeats?: number | null;
  availableSeats?: number | null;
  expiryDate?: string | null;
  licenseType?: string | null;
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
  operator: 'is' | 'is not';
  value: string;
};

type CategoryOption = {
  id?: number;
  name: string;
  isAll?: boolean;
};

const DEFAULT_STATUS_OPTIONS = [
  'Available',
  'Assigned',
  'In Repair',
  'Defective',
  'Lost',
  'Retired',
  'Pending Disposal',
  'Disposed',
  'New',
];

const BULK_FETCH_PAGE_SIZE = 200;

function normalizeCategoryLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }

  return value;
}

interface AssetRegistryClientProps {
  config: RegistryViewConfig;
  initialCategories: AssetRegistryCategory[];
  initialResult: AssetRegistryResult;
  currentPanel?: string;
  manualStatuses?: ManualStatus[];
  onStatusUpdateRef?: React.MutableRefObject<(assetId: string, nextStatus: string) => void>;
  onRefreshRef?: React.MutableRefObject<() => void>;
  canManage?: boolean;
}

export function AssetRegistryClient({
  config,
  initialCategories,
  initialResult,
  currentPanel,
  manualStatuses = [],
  onStatusUpdateRef,
  onRefreshRef,
  canManage = false,
}: AssetRegistryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleStatusUpdate = useCallback((assetId: string, nextStatus: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === assetId) {
          return {
            ...row,
            status: nextStatus,
            assignedTo: null, // Manual override always clears current assignment
          };
        }
        return row;
      })
    );
    setRefreshNonce((n) => n + 1);
  }, []);

  // Expose the status update handler via ref so detail panel can call it
  useEffect(() => {
    if (onStatusUpdateRef) {
      onStatusUpdateRef.current = handleStatusUpdate;
    }
  }, [handleStatusUpdate, onStatusUpdateRef]);

  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = () => setRefreshNonce((n) => n + 1);
    }
  }, [onRefreshRef]);

  const isPanelOpen = Boolean(currentPanel);
  const activeRecordId =
    currentPanel === 'record' ? searchParams.get('id') : null;

  const [isPillarDialogOpen, setIsPillarDialogOpen] = useState(false);

  const [rows, setRows] = useState<AssetRegistryRow[]>(initialResult.data);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState(
    config.defaultCategoryLabel
  );
  const [isPending, startTransition] = useTransition();
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSelectionRows, setTransferSelectionRows] = useState<AssetRegistryRow[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelectionRows, setPrintSelectionRows] = useState<AssetRegistryRow[]>([]);
  const [isMutating, setIsMutating] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [customStatuses, setCustomStatuses] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getCustomStatuses();
        if (!mounted) return;
        setCustomStatuses(rows.map((r: CustomStatusRow) => r.name));
      } catch {
        // ignore non-fatal
      }
    })();

    return () => { mounted = false; };
  }, []);

  // disposal request dialog states
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [disposalSelectionRows, setDisposalSelectionRows] = useState<AssetRegistryRow[]>([]);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);

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
  }, [
    config.allCategoryLabel,
    config.defaultCategoryLabel,
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
  const conditionFilter = appliedFilters.find((filter) => filter.field === 'Condition');
  const locationFilter = appliedFilters.find((filter) => filter.field === 'Location');
  const modelFilter = appliedFilters.find((filter) => filter.field === 'Model');
  const assignedToFilter = appliedFilters.find((filter) => filter.field === 'Assigned To');
  const pillarFilter = appliedFilters.find((filter) => filter.field === 'Pillar');
  const categoryFilter = appliedFilters.find((filter) => filter.field === 'Category');

  const backendStatusFilter =
    statusFilter?.operator === 'is' ? statusFilter.value : undefined;
  //hide disposed assets from registry by default, unless user explicitly filters for it.
  const shouldHideDisposedByDefault = backendStatusFilter !== 'Disposed';



  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    setErrorMessage(null);

    const loadRows = async () => {
      try {
        const requestParams = {
          pillar: config.pillar,
          query: debouncedQuery,
          categoryId: selectedCategoryId,
          status: backendStatusFilter,
        };

        const fetchFn = config.view === 'unified' ? getAllAssetsUnified : getAssetsByPillar;

        const firstPage = await fetchFn({
          ...requestParams,
          page: 1,
          pageSize: BULK_FETCH_PAGE_SIZE,
        });

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        let aggregatedRows = [...firstPage.data];

        for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
          const nextPage = await fetchFn({
            ...requestParams,
            page,
            pageSize: BULK_FETCH_PAGE_SIZE,
          });

          if (requestSequence !== requestSequenceRef.current) {
            return;
          }

          aggregatedRows = aggregatedRows.concat(nextPage.data);
        }

        startTransition(() => {
          setRows(aggregatedRows);
        });
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        startTransition(() => {
          setRows([]);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load assets.');
        });
      }
    };

    startTransition(() => {
      void loadRows();
    });
  }, [
    backendStatusFilter,
    config.pillar,
    config.view,
    debouncedQuery,
    refreshNonce,
    selectedCategoryId,
  ]);

  const filteredRows = useMemo(() => {
    let nextRows = rows;

    // DEFAULT hide from registry
    if (shouldHideDisposedByDefault) {
      nextRows = nextRows.filter((row) => row.status !== 'Disposed');
    }

    if (!selectedCategoryOption.isAll && !selectedCategoryOption.id) {
      const selectedCategoryToken = normalizeCategoryLabel(selectedCategoryOption.name);

      nextRows = nextRows.filter((row) => {
        const rowCategoryToken = normalizeCategoryLabel(row.category);
        return rowCategoryToken === selectedCategoryToken;
      });
    }

    if (statusFilter?.operator === 'is not') {
      nextRows = nextRows.filter((row) => row.status !== statusFilter.value);
    }

    if (conditionFilter) {
      nextRows = nextRows.filter((row) => {
        const condition = row.condition ?? '-';
        return conditionFilter.operator === 'is not'
          ? condition !== conditionFilter.value
          : condition === conditionFilter.value;
      });
    }

    if (locationFilter) {
      nextRows = nextRows.filter((row) => {
        const location = row.location ?? '-';
        return locationFilter.operator === 'is not'
          ? location !== locationFilter.value
          : location === locationFilter.value;
      });
    }

    if (modelFilter) {
      nextRows = nextRows.filter((row) => {
        return modelFilter.operator === 'is not'
          ? row.model !== modelFilter.value
          : row.model === modelFilter.value;
      });
    }

    if (assignedToFilter) {
      nextRows = nextRows.filter((row) => {
        const assignedTo = row.assignedTo ?? '-';
        return assignedToFilter.operator === 'is not'
          ? assignedTo !== assignedToFilter.value
          : assignedTo === assignedToFilter.value;
      });
    }

    if (pillarFilter) {
      nextRows = nextRows.filter((row) => {
        return pillarFilter.operator === 'is not'
          ? row.pillar !== pillarFilter.value
          : row.pillar === pillarFilter.value;
      });
    }

    if (categoryFilter) {
      nextRows = nextRows.filter((row) => {
        return categoryFilter.operator === 'is not'
          ? row.category !== categoryFilter.value
          : row.category === categoryFilter.value;
      });
    }

    return nextRows;
  }, [
    rows,
    selectedCategoryOption,
    statusFilter,
    conditionFilter,
    locationFilter,
    modelFilter,
    assignedToFilter,
    pillarFilter,
    categoryFilter,
    shouldHideDisposedByDefault,
  ]);

  const visibleRows = filteredRows;

  const locationOptions = useMemo(() => {
    const merged = new Map<number, string>();

    for (const row of rows) {
      if (row.locationId && row.location) {
        merged.set(row.locationId, row.location);
      }
    }

    return [...merged.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(() => {
    return config.filterFieldOptions.map((opt) => {
      let options: string[] = [];
      switch (opt.value) {
        case 'Status': {
          const statuses = new Set<string>([...DEFAULT_STATUS_OPTIONS, ...customStatuses]);
          for (const row of rows) statuses.add(row.status);
          options = [...statuses];
          break;
        }
        case 'Condition': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.condition ?? '-');
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
        case 'Location': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.location ?? '-');
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
        case 'Model': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.model);
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
        case 'Assigned To': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.assignedTo ?? '-');
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
        case 'Pillar': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.pillar);
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
        case 'Category': {
          const set = new Set<string>();
          for (const row of rows) set.add(row.category);
          options = [...set].sort((a, b) => a.localeCompare(b));
          break;
        }
      }
      return { value: opt.value, label: opt.label, options };
    });
  }, [config.filterFieldOptions, rows, customStatuses]);

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    setIsCategoryPopoverOpen(false);
  };

  const setOrReplaceFilter = (nextFilter: FilterBarAppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter(
        (currentFilter) => currentFilter.field !== nextFilter.field
      );
      return [...withoutCurrentField, nextFilter as AppliedFilter];
    });
  };

  const clearFilter = (field: string) => {
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
      setErrorMessage(error instanceof Error ? error.message : 'Bulk status update failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const performBulkTransfer = async (targetLocationId: number) => {
    const selectedAssetIds = transferSelectionRows.map((selectedRow) => selectedRow.id);

    if (selectedAssetIds.length === 0 || !targetLocationId) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const result = await bulkUpdateAssets({
        assetIds: selectedAssetIds,
        updates: {
          locationId: targetLocationId,
        },
        actionType: 'BULK_TRANSFER',
      });

      if (!result.success) {
        setErrorMessage(result.error ?? 'Bulk transfer failed.');
        return;
      }

      setIsTransferDialogOpen(false);
      setTransferSelectionRows([]);
      setRefreshNonce((currentNonce) => currentNonce + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bulk transfer failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const tableColumns = useAssetColumns(config.view, manualStatuses);

  const selectionActions: DataTableSelectionAction<AssetRegistryRow>[] = [
    {
      id: 'print-qr',
      label: 'Print Asset Tags',
      disabled: isMutating,
      onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
        setPrintSelectionRows(selectedRowsForAction);
        setIsPrintModalOpen(true);
      },
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
              selectedRowsForAction.every((selectedRow) => selectedRow.status === 'Assigned');

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
          hidden: (selectedRows) => config.view === 'unified' && selectedRows.some(row => row.pillar === 'Software'),
          onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
            setTransferSelectionRows(selectedRowsForAction);
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
      onClick: (selectedRowsForAction: AssetRegistryRow[]) => {
        setDisposalSelectionRows(selectedRowsForAction);
        setIsDisposalDialogOpen(true);
      },
    },
  ];

  const selectionActionsToDisplay = canManage ? selectionActions : [];

  const tableSkeletonColumnWidths =
    config.view === 'software'
      ? ['w-[26%]', 'w-[22%]', 'w-[17%]', 'w-[17%]', 'w-[18%]']
      : config.view === 'furniture'
        ? ['w-[18%]', 'w-[26%]', 'w-[16%]', 'w-[20%]', 'w-[20%]']
        : config.view === 'office-electronics'
          ? ['w-[16%]', 'w-[20%]', 'w-[14%]', 'w-[16%]', 'w-[18%]', 'w-[16%]']
          : ['w-[14%]', 'w-[24%]', 'w-[16%]', 'w-[14%]', 'w-[16%]', 'w-[16%]'];

  const openRegistrationPanel = useCallback(() => {
    if (config.view === 'unified') {
      setIsPillarDialogOpen(true);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'registration');
    params.set('animate', isPanelOpen ? '0' : '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [config.view, isPanelOpen, pathname, router, searchParams]);

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6">
      <div className="mb-4">
        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-2 ${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
            >
              <span>{selectedCategoryOption.name}</span>
              <ChevronDown className="size-5 text-foreground mt-1" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={10}
            className="w-fit rounded-lg border border-border p-2 shadow-xl"
          >
            <div className="w-max space-y-1">
              {categoryOptions.map((categoryOption) => (
                <button
                  key={categoryOption.name}
                  type="button"
                  className="flex w-full items-center whitespace-nowrap rounded-md px-2 py-1 text-left text-sm font-semibold leading-5 text-foreground hover:bg-muted"
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
        <FilterBar
          searchQuery={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={config.searchPlaceholder}
          fields={filterFieldConfigs}
          appliedFilters={appliedFilters}
          onApplyFilter={setOrReplaceFilter}
          onClearFilter={clearFilter}
          onClearAllFilters={clearAllFilters}
        >
          {config.view !== 'unified' && canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {config.addAssetLabel}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openRegistrationPanel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Single Asset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </FilterBar>

        {errorMessage ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {isPending ? (
            <div className="overflow-hidden rounded-lg border border-border bg-background p-3">
              <TableSkeleton rowCount={8} columnWidths={tableSkeletonColumnWidths} />
            </div>
          ) : (
            <DataTable<AssetRegistryRow, unknown>
              columns={tableColumns}
              data={visibleRows}
              pageSizeOptions={config.rowsPerPageOptions}
              initialPageSize={config.defaultPageSize}
              defaultSorting={
                searchParams.get('sort')
                  ? [{ id: searchParams.get('sort')!, desc: searchParams.get('desc') === 'true' }]
                  : [{ id: 'assetTag', desc: true }]
              }
              selectionActions={selectionActionsToDisplay}
              selectionLabel={(selectedCount) => `${selectedCount} Assets Selected`}
              emptyState={{
                title: 'No assets found',
                description: 'Add your first asset to start managing this registry.',
                action: canManage ? {
                  label: 'Add Asset',
                  onClick: openRegistrationPanel,
                } : undefined,
              }}
              isRowActive={(row) => Boolean(activeRecordId && row.assetTag === activeRecordId)}
              onRowClick={(row) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('panel', 'record');
                params.set('id', row.assetTag);
                params.set('animate', isPanelOpen ? '0' : '1');
                router.push(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              className="rounded-lg border-border"
            />
          )}
        </div>

        <DisposeAssetsRequestDialog
          open={isDisposalDialogOpen}
          onOpenChange={(open) => {
            setIsDisposalDialogOpen(open);
            if (!open) setDisposalSelectionRows([]);
          }}
          selectedAssets={disposalSelectionRows.map((row) => ({
            id: row.id,
            assetTag: row.assetTag,
            assetName: toCellText(row.name),
          }))}
          onSubmitted={({ inserted, skipped }) => {
            setIsDisposalDialogOpen(false);
            setDisposalSelectionRows([]);
            setRefreshNonce((current) => current + 1);

            if (skipped > 0) {
              tiqriToast.warning(
                `Submitted ${inserted} request(s). Skipped ${skipped} already pending.`
              );
            } else {
              tiqriToast.success(`Submitted ${inserted} disposal request(s).`);
            }
          }}
        />

        <BulkTransferDialog
          open={isTransferDialogOpen}
          onOpenChange={(open) => {
            setIsTransferDialogOpen(open);
            if (!open) setTransferSelectionRows([]);
          }}
          selectedAssets={transferSelectionRows}
          locationOptions={locationOptions}
          onConfirm={performBulkTransfer}
          isMutating={isMutating}
        />

        <BulkImportWizard
          isOpen={isBulkImportOpen}
          onOpenChange={(open) => {
            setIsBulkImportOpen(open);
            if (!open) setRefreshNonce((n) => n + 1);
          }}
          categories={initialCategories}
        />

        <PrintConfigurationModal
          isOpen={isPrintModalOpen}
          onOpenChange={(open) => {
            setIsPrintModalOpen(open);
            if (!open) setPrintSelectionRows([]);
          }}
          selectedCount={printSelectionRows.length}
          onGenerate={async (format) => {
            const assetIds = printSelectionRows.map((row) => row.assetTag);
            const modelNames: Record<string, string> = {};
            for (const row of printSelectionRows) {
              modelNames[row.assetTag] = row.model || 'Standard Model';
            }

            try {
              await generateAndPrintTagPdf({ assetIds, format, modelNames });
            } catch {
              tiqriToast.error('Failed to generate PDF for printing.');
            }
          }}
        />

        <AssetPillarSelectionDialog
          open={isPillarDialogOpen}
          onOpenChange={setIsPillarDialogOpen}
          onSelect={(slug) => {
            setIsPillarDialogOpen(false);
            router.push(`/assets/${slug}?panel=registration`);
          }}
        />
      </div>
    </main>
  );
}