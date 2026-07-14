'use client';

import { ChevronDown, Plus, Upload } from 'lucide-react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { BulkImportWizard } from '@/components/features/bulk-import/bulk-import-wizard';
import { PrintConfigurationModal } from '@/components/features/asset-registry/tags/print-configuration-modal';
import { generateAndPrintTagPdf } from '@/lib/utils/tag-print';
import { type RegistryViewConfig } from '@/components/features/asset-registry/registry-config';
import { DataTable } from '@/components/shared/data-table';
import { DisposeAssetsRequestDialog } from '@/components/features/disposals/dispose-assets-request-dialog';
import { BulkTransferDialog } from '@/components/features/asset-registry/bulk-transfer-dialog';
import { AssetPillarSelectionDialog } from '@/components/shared/asset-pillar-selection-dialog';
import {
  FilterBar,
  type AppliedFilter as FilterBarAppliedFilter,
  type FilterFieldConfig,
} from '@/components/shared/filter-bar';
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

import type {
  AssetRegistryCategory,
  AssetRegistryResult,
  AssetRegistryRow,
  AppliedFilter,
} from './asset-registry.types';
import {
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
import { useAssetRegistryData } from './use-asset-registry-data';
import { useAssetMutations } from './use-asset-mutations';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AssetRegistryClientProps {
  config: RegistryViewConfig;
  initialCategories: AssetRegistryCategory[];
  initialResult: AssetRegistryResult;
  currentPanel?: string;
  manualStatuses?: ManualStatus[];
  onStatusUpdateRef?: React.MutableRefObject<
    (assetId: string, nextStatus: string) => void
  >;
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
  // Search & filter state
  // -------------------------------------------------------------------------

  const [searchValue, setSearchValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState(
    config.defaultCategoryLabel
  );
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // -------------------------------------------------------------------------
  // Dialog visibility state
  // -------------------------------------------------------------------------

  const [isPillarDialogOpen, setIsPillarDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSelectionRows, setTransferSelectionRows] = useState<
    AssetRegistryRow[]
  >([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelectionRows, setPrintSelectionRows] = useState<
    AssetRegistryRow[]
  >([]);
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [disposalSelectionRows, setDisposalSelectionRows] = useState<
    AssetRegistryRow[]
  >([]);

  // -------------------------------------------------------------------------
  // Derived filter values
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
      categoryOptions.find(
        (categoryOption) => categoryOption.name === selectedCategoryName
      ) ??
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

  const statusFilter = appliedFilters.find(
    (filter) => filter.field === 'Status'
  );
  const backendStatusFilter =
    statusFilter?.operator === 'is' ? statusFilter.value : undefined;

  // Debounce search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedQuery(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer);
  }, [searchValue]);

  // -------------------------------------------------------------------------
  // Data Fetching & Mutations
  // -------------------------------------------------------------------------

  const {
    rows,
    isPending,
    errorMessage,
    setErrorMessage,
    customStatuses,
    manuallyUpdateRowStatus,
  } = useAssetRegistryData({
    initialResult,
    view: config.view,
    pillar: config.pillar,
    debouncedQuery,
    selectedCategoryId,
    backendStatusFilter,
    refreshNonce,
  });

  const { isMutating, performBulkStatusChange, performBulkTransfer } =
    useAssetMutations({
      setErrorMessage,
      onSuccess: () => setRefreshNonce((n) => n + 1),
      onTransferSuccess: () => {
        setIsTransferDialogOpen(false);
        setTransferSelectionRows([]);
      },
    });

  // -------------------------------------------------------------------------
  // Local Filtering & Formatting
  // -------------------------------------------------------------------------

  const filteredRows = useAssetFiltering(
    rows,
    appliedFilters,
    selectedCategoryOption
  );
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

  const handleStatusUpdate = useCallback(
    (assetId: string, nextStatus: string) => {
      manuallyUpdateRowStatus(assetId, nextStatus);
      setRefreshNonce((n) => n + 1);
    },
    [manuallyUpdateRowStatus]
  );

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

  const clearAllFilters = () => setAppliedFilters([]);

  // -------------------------------------------------------------------------
  // Event handlers — navigation & print
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

  const navigateToRecord = useCallback(
    (row: AssetRegistryRow) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('panel', 'record');
      params.set('id', row.assetTag);
      params.set('animate', isPanelOpen ? '0' : '1');
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [isPanelOpen, pathname, router, searchParams]
  );

  const handlePrintGenerate = useCallback(
    async (format: 'a4' | 'thermal') => {
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
    },
    [printSelectionRows]
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Popover
          open={isCategoryPopoverOpen}
          onOpenChange={setIsCategoryPopoverOpen}
        >
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
              <TableSkeleton
                rowCount={8}
                columnWidths={tableSkeletonColumnWidths}
              />
            </div>
          ) : (
            <DataTable<AssetRegistryRow, unknown>
              columns={tableColumns}
              data={filteredRows}
              pageSizeOptions={config.rowsPerPageOptions}
              initialPageSize={config.defaultPageSize}
              defaultSorting={
                searchParams.get('sort')
                  ? [
                      {
                        id: searchParams.get('sort')!,
                        desc: searchParams.get('desc') === 'true',
                      },
                    ]
                  : [{ id: 'assetTag', desc: true }]
              }
              selectionActions={selectionActionsToDisplay}
              selectionLabel={(selectedCount) =>
                `${selectedCount} Assets Selected`
              }
              emptyState={{
                title: 'No assets found',
                description:
                  'Add your first asset to start managing this registry.',
                action: canManage
                  ? {
                      label: 'Add Asset',
                      onClick: openRegistrationPanel,
                    }
                  : undefined,
              }}
              isRowActive={(row) =>
                Boolean(activeRecordId && row.assetTag === activeRecordId)
              }
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
          onConfirm={(targetLocationId) =>
            performBulkTransfer(
              targetLocationId,
              transferSelectionRows.map((r) => r.id)
            )
          }
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
