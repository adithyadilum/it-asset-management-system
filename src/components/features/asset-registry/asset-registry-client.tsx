'use client';

import {
  ChevronDown,
  Plus,
  Upload,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect, useTransition } from 'react';
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
} from '@/components/shared/data-table';
import { DisposeAssetsRequestDialog } from '@/components/features/disposals/dispose-assets-request-dialog';
import { BulkTransferDialog } from '@/components/features/asset-registry/bulk-transfer-dialog';
import { AssetPillarSelectionDialog } from '@/components/shared/asset-pillar-selection-dialog';
import { FilterBar, type AppliedFilter as FilterBarAppliedFilter, type FilterFieldConfig } from '@/components/shared/filter-bar';
import { tiqriToast } from '@/components/shared/sonner';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { useAssetColumns, type ManualStatus } from './use-asset-columns';
import { useAssetFiltering } from './use-asset-filtering';
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

import {
  BULK_FETCH_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  DEFAULT_MODEL_FALLBACK,
  SKELETON_COLUMN_WIDTHS,
} from './asset-registry-constants';
import {
  toCellText,
  collectFilterOptions,
  buildCategoryOptions,
  buildSelectionActions,
} from './asset-registry-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type AppliedFilter = {
  field: FilterField;
  operator: 'is' | 'is not';
  value: string;
};

export type CategoryOption = {
  id?: number;
  name: string;
  isAll?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Core data state
  // -------------------------------------------------------------------------

  const [rows, setRows] = useState<AssetRegistryRow[]>(initialResult.data);
  const [isPending, startTransition] = useTransition();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // -------------------------------------------------------------------------
  // Search & filter state
  // -------------------------------------------------------------------------

  const [searchValue, setSearchValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState(
    config.defaultCategoryLabel
  );
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // Dialog visibility state
  // -------------------------------------------------------------------------

  const [isPillarDialogOpen, setIsPillarDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSelectionRows, setTransferSelectionRows] = useState<AssetRegistryRow[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelectionRows, setPrintSelectionRows] = useState<AssetRegistryRow[]>([]);
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [disposalSelectionRows, setDisposalSelectionRows] = useState<AssetRegistryRow[]>([]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const isPanelOpen = Boolean(currentPanel);
  const activeRecordId =
    currentPanel === 'record' ? searchParams.get('id') : null;

  const categoryOptions = useMemo(
    () => buildCategoryOptions(config, initialCategories),
    [config, initialCategories]
  );

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
  const backendStatusFilter =
    statusFilter?.operator === 'is' ? statusFilter.value : undefined;

  const filteredRows = useAssetFiltering(rows, appliedFilters, selectedCategoryOption);
  const tableColumns = useAssetColumns(config.view, manualStatuses);
  const tableSkeletonColumnWidths = SKELETON_COLUMN_WIDTHS[config.view];

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
    return config.filterFieldOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
      options: collectFilterOptions(opt.value, rows, customStatuses),
    }));
  }, [config.filterFieldOptions, rows, customStatuses]);

  // -------------------------------------------------------------------------
  // Ref synchronisation (parent ↔ child communication)
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Data fetching effects
  // -------------------------------------------------------------------------

  // Fetch custom statuses once on mount
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

  // Debounce search input
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedQuery(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchValue]);

  // Load asset rows whenever filters/search/category change
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

  // -------------------------------------------------------------------------
  // Event handlers — filtering
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Event handlers — bulk mutations
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Event handlers — navigation
  // -------------------------------------------------------------------------

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

  const navigateToRecord = useCallback((row: AssetRegistryRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'record');
    params.set('id', row.assetTag);
    params.set('animate', isPanelOpen ? '0' : '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [isPanelOpen, pathname, router, searchParams]);

  // -------------------------------------------------------------------------
  // Event handlers — print
  // -------------------------------------------------------------------------

  const handlePrintGenerate = useCallback(async (format: 'a4' | 'thermal') => {
    const assetIds = printSelectionRows.map((row) => row.assetTag);
    const modelNames: Record<string, string> = {};
    for (const row of printSelectionRows) {
      modelNames[row.assetTag] = row.model || DEFAULT_MODEL_FALLBACK;
    }

    try {
      await generateAndPrintTagPdf({ assetIds, format, modelNames });
    } catch {
      tiqriToast.error('Failed to generate PDF for printing.');
    }
  }, [printSelectionRows]);

  // -------------------------------------------------------------------------
  // Selection actions
  // -------------------------------------------------------------------------

  const selectionActions = useMemo(
    () =>
      buildSelectionActions(config, isMutating, {
        onPrintTags: (selectedRowsForAction) => {
          setPrintSelectionRows(selectedRowsForAction);
          setIsPrintModalOpen(true);
        },
        onBulkStatusChange: (status, ids) => {
          void performBulkStatusChange(status, ids);
        },
        onBulkTransfer: (selectedRowsForAction) => {
          setTransferSelectionRows(selectedRowsForAction);
          setIsTransferDialogOpen(true);
        },
        onDispose: (selectedRowsForAction) => {
          setDisposalSelectionRows(selectedRowsForAction);
          setIsDisposalDialogOpen(true);
        },
      }),
    [config, isMutating]
  );

  const selectionActionsToDisplay = canManage ? selectionActions : [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6">
      {/* Category selector header */}
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
        {/* Filter bar with optional add-asset dropdown */}
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

        {/* Error banner */}
        {errorMessage ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {/* Data table / loading skeleton */}
        <div className="flex min-h-0 flex-1 flex-col">
          {isPending ? (
            <div className="overflow-hidden rounded-lg border border-border bg-background p-3">
              <TableSkeleton rowCount={8} columnWidths={tableSkeletonColumnWidths} />
            </div>
          ) : (
            <DataTable<AssetRegistryRow, unknown>
              columns={tableColumns}
              data={filteredRows}
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
              onRowClick={navigateToRecord}
              className="rounded-lg border-border"
            />
          )}
        </div>

        {/* Dialogs & Modals */}
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
          onGenerate={handlePrintGenerate}
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