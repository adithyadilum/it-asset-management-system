'use client';

import { useCallback, useState } from 'react';

import { fetchReportPreview } from '@/actions/standard-reports';
import {
  DEFAULT_FILTER_STATE,
  TEMPLATE_PRESETS,
  type FilterState,
  type ReportPreviewRow,
} from './standard-reports-types';
import { StandardReportsConfigPanel } from './standard-reports-config-panel';
import { StandardReportsPreviewPanel } from './standard-reports-preview-panel';

interface StandardReportsShellProps {
  filterOptions: {
    categories: string[];
    locations: string[];
    statuses: string[];
  };
}

export function StandardReportsShell({ filterOptions }: StandardReportsShellProps) {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [showDataGrid, setShowDataGrid] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch report data using the current filter state
  const loadPreview = useCallback(async (filters: FilterState) => {
    setIsLoading(true);
    try {
      const data = await fetchReportPreview({
        category: filters.category,
        location: filters.location,
        status: filters.status,
      });
      setPreviewData(data);
      setShowDataGrid(true);
    } catch (error) {
      console.error('Failed to fetch report preview:', error);
      setPreviewData([]);
      setShowDataGrid(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Called when a template card's "Preview report" button is clicked
  const handleTemplatePreview = useCallback(
    (templateTitle: string) => {
      const preset = TEMPLATE_PRESETS[templateTitle];
      if (!preset) return;

      const nextFilterState: FilterState = {
        ...DEFAULT_FILTER_STATE,
        source: preset.source ?? DEFAULT_FILTER_STATE.source,
        category: preset.category ?? DEFAULT_FILTER_STATE.category,
        location: preset.location ?? DEFAULT_FILTER_STATE.location,
        status: preset.status ?? DEFAULT_FILTER_STATE.status,
      };

      setFilterState(nextFilterState);
      void loadPreview(nextFilterState);
    },
    [loadPreview]
  );

  // Called when the sidebar's "Preview report" footer button is clicked
  const handleManualPreview = useCallback(() => {
    void loadPreview(filterState);
  }, [filterState, loadPreview]);

  // Called when the "Clear filters" button is clicked
  const handleClearFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
    setShowDataGrid(false);
    setPreviewData([]);
  }, []);

  // Called when any individual filter changes
  const handleFilterChange = useCallback(
    (field: keyof FilterState, value: string) => {
      setFilterState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <div className="flex h-full flex-1 flex-col gap-6 overflow-hidden bg-muted p-1">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[524px_minmax(0,1fr)]">
        <StandardReportsConfigPanel
          filterState={filterState}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onTemplatePreview={handleTemplatePreview}
          onManualPreview={handleManualPreview}
          onClearFilters={handleClearFilters}
          isLoading={isLoading}
        />
        <StandardReportsPreviewPanel
          showDataGrid={showDataGrid}
          previewData={previewData}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
