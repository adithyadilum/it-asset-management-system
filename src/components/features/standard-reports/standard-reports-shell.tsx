'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PaginationState } from '@tanstack/react-table';

import { fetchReportPreview } from '@/actions/standard-reports';
import { deleteReportTemplate } from '@/actions/report-templates';
import {
  DEFAULT_FILTER_STATE,
  type FilterState,
  type ReportPreviewRow,
  type ReportTemplateData,
} from '@/types/standard-reports';
import { StandardReportsConfigPanel } from './standard-reports-config-panel';
import { StandardReportsPreviewPanel } from './standard-reports-preview-panel';

interface StandardReportsShellProps {
  filterOptions: {
    assetTypes: string[];
    categories: { name: string; pillar: string }[];
    locations: string[];
    statuses: string[];
  };
  templates: ReportTemplateData[];
}

export function StandardReportsShell({ filterOptions, templates }: StandardReportsShellProps) {
  const router = useRouter();

  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [resetKey, setResetKey] = useState(0);
  const [showDataGrid, setShowDataGrid] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState<number>(1);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });

  // Fetch report data using the current filter state
  // loadPreview requires an explicit pagination context to avoid
  // triggering server actions during render (see useEffect below).
  const loadPreview = useCallback(
    async (filters: FilterState, pageCtx: PaginationState) => {
      // debug: log when fetching preview
      console.debug('loadPreview called', { filters, pageCtx });
      setIsLoading(true);
      setErrorMessage(null);

      const pIndex = pageCtx?.pageIndex ?? 0;
      const pSize = pageCtx?.pageSize ?? 16;

      try {
        const result = await fetchReportPreview({
          source: filters.source,
          assetType: filters.assetType,
          category: filters.category,
          location: filters.location,
          status: filters.status,
          masterDataType: filters.masterDataType,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          page: pIndex,
          pageSize: pSize,
        });
        setPreviewData(result.data);
        setPageCount(result.pageCount);
        setShowDataGrid(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch report preview';
        setErrorMessage(message);
        console.error('Failed to fetch report preview:', error);
        setPreviewData([]);
        setShowDataGrid(true);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Called when a template card's "Preview report" button is clicked
  const handleTemplatePreview = useCallback(
    (templateId: number) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      // Map template filters to FilterState
      const nextFilterState: FilterState = {
        ...DEFAULT_FILTER_STATE,
        source: template.dataSource,
        category: template.filters?.category ?? DEFAULT_FILTER_STATE.category,
        location: template.filters?.location ?? DEFAULT_FILTER_STATE.location,
        status: template.filters?.status ?? DEFAULT_FILTER_STATE.status,
        assetType: template.filters?.assetType ?? DEFAULT_FILTER_STATE.assetType,
        masterDataType: template.filters?.masterDataType ?? DEFAULT_FILTER_STATE.masterDataType,
      };

      setSelectedFields(template.fields || []);
      setFilterState(nextFilterState);
      setPagination((old) => ({ ...old, pageIndex: 0 }));
      setShowDataGrid(true);
    },
    [templates]
  );

  // Called when the sidebar's "Preview report" footer button is clicked
  const handleManualPreview = useCallback(() => {
    setSelectedFields([]); // Clear template-specific fields for manual preview
    setPagination((old) => ({ ...old, pageIndex: 0 }));
    setShowDataGrid(true);
  }, []);

  // Called when the "Clear filters" button is clicked
  const handleClearFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
    setResetKey((prev) => prev + 1);
    setPagination({ pageIndex: 0, pageSize: 16 });
    setShowDataGrid(false);
    setPreviewData([]);
    setErrorMessage(null);
  }, []);

  // Called when any individual filter changes
  const handleFilterChange = useCallback(
    (field: keyof FilterState, value: string) => {
      setFilterState((prev) => {
        const next = { ...prev, [field]: value };
        
        // Dependent logic: If Asset Type changes, clear Category
        if (field === 'assetType') {
          next.category = '';
        }

        // Reset filters when source changes
        if (field === 'source') {
          next.assetType = '';
          next.category = '';
          next.location = '';
          next.status = '';
          next.masterDataType = '';
        }

        return next;
      });

      setPagination((old) => ({ ...old, pageIndex: 0 }));
    },
    []
  );

  // Called when a template is deleted
  const handleTemplateDelete = useCallback(
    async (templateId: number) => {
      try {
        const result = await deleteReportTemplate(templateId);
        if (result.success) {
          // Re-fetch triggers implicitly due to revalidatePath in action
          router.refresh();
        } else {
          setErrorMessage(result.message || 'Failed to delete template');
        }
      } catch {
        setErrorMessage('An unexpected error occurred while deleting the template.');
      }
    },
    [router]
  );

  // Called after a new template is created — refresh server data
  const handleTemplateCreated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handlePaginationChange = useCallback(
    (updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => {
      setPagination((old) => {
        const next = typeof updaterOrValue === 'function' ? updaterOrValue(old) : updaterOrValue;
        console.debug('pagination change', { old, next });
        return next;
      });
    },
    []
  );

  // Fetch when pagination or filters change, but only if preview panel is visible
  // This avoids invoking server actions during render.
  useEffect(() => {
    if (!showDataGrid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch and set state when pagination/filters change
    void loadPreview(filterState, pagination);
  }, [filterState, pagination, showDataGrid, loadPreview]);

  return (
    <div className="flex h-full flex-1 flex-col gap-6 overflow-hidden bg-muted p-1">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[524px_minmax(0,1fr)]">
        <StandardReportsConfigPanel
          resetKey={resetKey}
          filterState={filterState}
          filterOptions={filterOptions}
          templates={templates}
          onFilterChange={handleFilterChange}
          onTemplatePreview={handleTemplatePreview}
          onTemplateDelete={handleTemplateDelete}
          onManualPreview={handleManualPreview}
          onClearFilters={handleClearFilters}
          onTemplateCreated={handleTemplateCreated}
          isLoading={isLoading}
        />
        <StandardReportsPreviewPanel
          showDataGrid={showDataGrid}
          previewData={previewData}
          isLoading={isLoading}
          errorMessage={errorMessage}
          selectedFields={selectedFields}
          source={filterState.source}
          pagination={pagination}
          setPagination={handlePaginationChange}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
