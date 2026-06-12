'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Upload,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect, useTransition } from 'react';
import {
} from '@/lib/constants';
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
import { StatusBadge } from '@/components/shared/status-badge';
import { PillarBadge } from '@/components/shared/pillar-badge';
import { SoftwareExpiryStatus } from '@/components/shared/software-expiry-status';
import { AssetPillarSelectionDialog } from '@/components/shared/asset-pillar-selection-dialog';
import { FilterBar, type AppliedFilter as FilterBarAppliedFilter, type FilterFieldConfig } from '@/components/shared/filter-bar';
import { tiqriToast } from '@/components/shared/sonner';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { CopyableField } from '@/components/shared/copyable-field';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';

type FilterField = RegistryFilterField;

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

const ELECTRONICS_CONDITION_STYLES: Record<string, string> = {
  Active: 'border border-green-300 bg-green-50 text-green-700',
  'Inspection Due': 'border border-blue-300 bg-blue-50 text-blue-700',
  'Under Maintenance': 'border border-orange-300 bg-orange-50 text-orange-700',
  Scheduled: 'border border-border bg-muted text-foreground',
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

function renderElectronicsConditionBadge(condition: string) {
  const className =
    ELECTRONICS_CONDITION_STYLES[condition] ??
    'border border-border bg-muted text-foreground';

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
  manualStatuses?: Array<{
    value: string;
    label: string;
    colorTheme?: string;
    iconName?: string;
  }>;
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

  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null);
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

  const uniqueSelectedLocations = useMemo(() => {
    const merged = new Set<string>();

    for (const row of transferSelectionRows) {
      merged.add(row.location ?? '-');
    }

    return [...merged];
  }, [transferSelectionRows]);

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

  const performBulkTransfer = async () => {
    const selectedAssetIds = transferSelectionRows.map((selectedRow) => selectedRow.id);

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
      setErrorMessage(error instanceof Error ? error.message : 'Bulk transfer failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const tableColumns = useMemo<ColumnDef<AssetRegistryRow>[]>(() => {
    if (config.view === 'unified') {
      return [
        { accessorKey: 'assetTag', header: 'Asset ID' },
        {
          accessorKey: 'name',
          header: 'Item Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'category',
          header: 'Category',
          cell: ({ row }) => toCellText(row.original.category),
        },
        {
          accessorKey: 'pillar',
          header: 'Pillar',
          cell: ({ row }) => <PillarBadge pillar={row.original.pillar} />,
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
            if (row.original.pillar === 'Software') {
              return <SoftwareExpiryStatus status={row.original.status} expiryDate={row.original.expiryDate} />;
            }
            return <StatusBadge value={row.original.status} showIcon />;
          },
        },
        {
          id: 'assignment',
          header: 'Assignment',
          cell: ({ row }) => {
            if (row.original.pillar === 'Software') {
              const coreTotal = row.original.totalSeats || 0;
              const attrTotal = parseInt(String(row.original.instanceAttributes?.['total_seats'] ?? row.original.instanceAttributes?.['Total Seats'] ?? row.original.instanceAttributes?.['max_seats'] ?? '0'), 10);
              const total = coreTotal > 0 ? coreTotal : (isNaN(attrTotal) ? 0 : attrTotal);
              const available = coreTotal > 0 ? (row.original.availableSeats ?? 0) : total;
              const assigned = Math.max(0, total - available);
              return (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-muted text-foreground ring-border whitespace-nowrap">
                  {assigned} / {total} Assigned
                </span>
              );
            }
            return toCellText(row.original.assignedTo || row.original.location);
          },
          enableSorting: false,
        },
      ];
    }

    if (config.view === 'furniture') {
      return [
        { accessorKey: 'assetTag', header: 'Asset ID' },
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
        { accessorKey: 'assetTag', header: 'Asset ID' },
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
            renderElectronicsConditionBadge(toElectronicsDisplayCondition(row.original)),
          enableSorting: false,
        },
      ];
    }

    if (config.view === 'software') {
      return [
        {
          accessorKey: 'assetTag',
          header: 'Asset ID',
        },
        {
          accessorKey: 'name',
          header: 'Software Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'serialNumber',
          header: 'License Key',
          cell: ({ row }) => {
            const serialNumber =
              row.original.serialNumber ||
              String(row.original.instanceAttributes?.['license_key'] ?? row.original.instanceAttributes?.['License Key'] ?? '');

            if (!serialNumber || serialNumber === '-') return '-';

            return (
              <div className="flex w-full pr-2">
                <CopyableField
                  value={serialNumber}
                  label="License Key"
                  className="w-full"
                />
              </div>
            );
          },
        },
        {
          id: 'licenseType',
          header: 'License Type',
          cell: ({ row }) => row.original.licenseType ?? '-',
          enableSorting: false,
        },
        {
          id: 'availability',
          header: 'Availability',
          cell: ({ row }) => {
            const coreTotal = row.original.totalSeats || 0;
            const coreAvailable = row.original.availableSeats;

            // Fallbacks from instance attributes
            const attrTotal = parseInt(String(row.original.instanceAttributes?.['total_seats'] ?? row.original.instanceAttributes?.['Total Seats'] ?? row.original.instanceAttributes?.['max_seats'] ?? '0'), 10);

            const total = coreTotal > 0 ? coreTotal : (isNaN(attrTotal) ? 0 : attrTotal);
            // Crude fallback for availability if coreTotal is 0
            const available = coreTotal > 0 ? (coreAvailable ?? 0) : total;

            const isLow = total > 0 && available <= 2;

            if (row.original.pillar !== 'Software') return null;

            return (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${available === 0
                    ? "bg-red-50 text-red-700 ring-red-600/10"
                    : isLow
                      ? "bg-amber-50 text-amber-700 ring-amber-600/10"
                      : "bg-green-50 text-green-700 ring-green-600/10"
                  }`}>
                  {available} / {total} Available
                </span>
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'expirationDate',
          header: 'Expiration Date',
          cell: ({ row }) => {
            const coreExpiry = row.original.expiryDate;
            const attrExpiry = String(row.original.instanceAttributes?.['expiry_date'] ?? row.original.instanceAttributes?.['Expiration Date'] ?? row.original.instanceAttributes?.['license_expiry'] ?? '');

            const expiryStr = coreExpiry || attrExpiry;
            if (!expiryStr || expiryStr === 'null') return '-';

            const expiryDate = new Date(expiryStr);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let colorClass = "text-muted-foreground";
            if (diffDays <= 0) {
              colorClass = "text-red-600 font-medium";
            } else if (diffDays <= 30) {
              colorClass = "text-amber-600 font-medium";
            }

            return (
              <span className={colorClass}>
                {expiryDate.toLocaleDateString()}
              </span>
            );
          },
          enableSorting: false,
        },
      ];
    }

    return [
      { accessorKey: 'assetTag', header: 'Asset ID' },
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
        cell: ({ row }) => {
          const statusConfig = manualStatuses.find(s => s.value === row.original.status);
          return (
            <StatusBadge
              value={row.original.status}
              showIcon
              colorTheme={statusConfig?.colorTheme}
              iconName={statusConfig?.iconName}
            />
          );
        },
      },
    ];
  }, [config.view, manualStatuses]);

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
          <DialogContent className="max-w-90 rounded-xl border border-border bg-background p-0">
            <DialogTitle className="sr-only">Transfer assets</DialogTitle>
            <DialogDescription className="sr-only">
              Transfer selected assets to a destination location.
            </DialogDescription>

            <div className="border-b border-border px-4 py-3">
              <h3 className="text-2xl font-semibold text-foreground">
                Transfer {transferSelectionRows.length} Assets
              </h3>
            </div>

            <div className="space-y-3 px-4 py-3">
              <ScrollArea className="max-h-24 rounded-lg border border-border bg-muted p-2">
                <div className="space-y-1">
                  {transferSelectionRows.map((selectedRow) => (
                    <div
                      key={selectedRow.id}
                      className="grid grid-cols-[88px_1fr] gap-2 text-sm text-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {selectedRow.assetTag}
                      </span>
                      <span className="truncate">{toCellText(selectedRow.name)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Current Location</label>
                <Input
                  value={
                    uniqueSelectedLocations.length === 0
                      ? '-'
                      : uniqueSelectedLocations.length === 1
                        ? uniqueSelectedLocations[0]
                        : 'Multiple locations'
                  }
                  disabled
                  className="h-9 rounded-lg border-border bg-muted"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Destination Location
                </label>
                <select
                  value={destinationLocationId ?? ''}
                  onChange={(event) => {
                    const parsedValue = Number(event.target.value);
                    setDestinationLocationId(
                      Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
                    );
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
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
                <label className="text-sm font-medium text-foreground">Transfer Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={transferDate}
                    onChange={(event) => setTransferDate(event.target.value)}
                    className="h-9 rounded-lg border-border pr-9"
                  />
                  <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-border px-3 text-sm"
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
                className="h-8 rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
                onClick={() => void performBulkTransfer()}
                disabled={!destinationLocationId || transferSelectionRows.length === 0 || isMutating}
              >
                Confirm Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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