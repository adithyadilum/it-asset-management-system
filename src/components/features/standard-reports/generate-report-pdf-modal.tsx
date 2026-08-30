'use client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, TriangleAlert } from 'lucide-react';

import { fetchReportPreview } from '@/actions/standard-reports';
import { tiqriToast } from '@/components/shared/sonner';
import { StandardModal } from '@/components/ui/standard-modal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type {
  FilterState,
  ReportPdfData,
  ReportPreviewRow,
} from '@/types/standard-reports';
import { generateAndOpenReportPdf } from '@/lib/utils/report-print';
import { logReportExportAction } from '@/actions/standard-reports';

interface GenerateReportPdfModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: ReportPreviewRow[];
  headers: string[];
  filterState: FilterState;
  source: string;
  generatedBy: string;
  templateName?: string;
  reportDescription?: string;
}

type ExportScope = 'preview' | 'all';

const LARGE_EXPORT_THRESHOLD = 5000;
const MAX_EXPORT_PAGE_SIZE = 5000;

function formatFilterValue(value: string | undefined) {
  return value && value.trim().length > 0 ? value : 'All';
}

function buildFiltersApplied(filterState: FilterState) {
  const parts = [
    `Source: ${formatFilterValue(filterState.source)}`,
    `Asset Type: ${formatFilterValue(filterState.assetType)}`,
    `Category: ${formatFilterValue(filterState.category)}`,
    `Location: ${formatFilterValue(filterState.location)}`,
    `Status: ${formatFilterValue(filterState.status)}`,
    `Record Type: ${formatFilterValue(filterState.masterDataType)}`,
  ];

  if (filterState.dateFrom || filterState.dateTo) {
    parts.push(
      `Date Range: ${formatFilterValue(filterState.dateFrom)} to ${formatFilterValue(filterState.dateTo)}`
    );
  }

  return parts.join(' | ');
}

function buildFilterDetails(filterState: FilterState) {
  const details = [
    { label: 'Source', value: formatFilterValue(filterState.source) },
    { label: 'Asset Type', value: formatFilterValue(filterState.assetType) },
    { label: 'Category', value: formatFilterValue(filterState.category) },
    { label: 'Location', value: formatFilterValue(filterState.location) },
    { label: 'Status', value: formatFilterValue(filterState.status) },
    {
      label: 'Record Type',
      value: formatFilterValue(filterState.masterDataType),
    },
  ];

  if (filterState.dateFrom || filterState.dateTo) {
    details.push({
      label: 'Date Range',
      value: `${formatFilterValue(filterState.dateFrom)} to ${formatFilterValue(filterState.dateTo)}`,
    });
  }

  return details;
}

function buildReportTitle(source: string, templateName?: string) {
  if (templateName && templateName.trim().length > 0) {
    return templateName;
  }

  return source ? `${source} Report` : 'Report';
}

function buildReportDescription(
  reportDescription?: string,
  source?: string,
  templateName?: string
) {
  if (reportDescription && reportDescription.trim().length > 0) {
    return reportDescription.trim();
  }

  if (templateName && templateName.trim().length > 0) {
    return `Generated from the ${templateName} report template for ${source || 'the selected'} data set.`;
  }

  return `Generated for ${source || 'the selected'} data set using the current filters.`;
}

export function GenerateReportPdfModal({
  isOpen,
  onOpenChange,
  previewData,
  headers,
  filterState,
  source,
  generatedBy,
  templateName,
  reportDescription,
}: GenerateReportPdfModalProps) {
  const [exportScope, setExportScope] = useState<ExportScope>('preview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLargeWarning, setShowLargeWarning] = useState(false);
  const [largeExportTotalRows, setLargeExportTotalRows] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rowCount = previewData.length;

  const resetState = useCallback(() => {
    setExportScope('preview');
    setIsGenerating(false);
    setShowLargeWarning(false);
    setLargeExportTotalRows(0);
    setErrorMessage(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  const assembleAndPrint = useCallback(
    async (rows: ReportPreviewRow[]) => {
      const reportData: ReportPdfData = {
        title: buildReportTitle(source, templateName),
        description: buildReportDescription(
          reportDescription,
          source,
          templateName
        ),
        generatedBy,
        generatedAt: new Date().toISOString(),
        filtersApplied: buildFiltersApplied(filterState),
        filterDetails: buildFilterDetails(filterState),
        dataSource: source || 'Report',
        summary: {
          totalRecords: rows.length,
        },
        headers,
        rows,
      };

      await generateAndOpenReportPdf(reportData);

      // Same reasoning as the CSV path: the PDF is assembled in the browser, so
      // nothing on the server would otherwise record that it left.
      void logReportExportAction({
        source,
        format: 'PDF',
        rowCount: rows.length,
        templateName,
      });

      handleOpenChange(false);
    },
    [
      filterState,
      generatedBy,
      handleOpenChange,
      headers,
      reportDescription,
      source,
      templateName,
    ]
  );

  const handleGenerate = useCallback(
    async (allowLargeProceed = false) => {
      setErrorMessage(null);
      setIsGenerating(true);

      try {
        if (exportScope === 'preview') {
          await assembleAndPrint(previewData);
          return;
        }

        const result = await fetchReportPreview({
          ...filterState,
          page: 0,
          pageSize: MAX_EXPORT_PAGE_SIZE,
        });

        if (result.totalRows > LARGE_EXPORT_THRESHOLD && !allowLargeProceed) {
          setLargeExportTotalRows(result.totalRows);
          setShowLargeWarning(true);
          return;
        }

        await assembleAndPrint(result.data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to generate PDF report.';
        setErrorMessage(message);
        tiqriToast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [assembleAndPrint, exportScope, filterState, previewData]
  );

  const proceedLabel = useMemo(
    () =>
      `This report contains ${largeExportTotalRows} rows and may take a while to generate. Do you want to proceed?`,
    [largeExportTotalRows]
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="Generate PDF Report"
      description="Choose whether to print just the current page or all matching records."
      footer={
        showLargeWarning ? (
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowLargeWarning(false);
                setLargeExportTotalRows(0);
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleGenerate(true)}
              disabled={isGenerating}
            >
              Proceed Anyway
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
          >
            Generate
          </Button>
        )
      }
    >
      {isGenerating ? (
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>Preparing report…</span>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
              <input
                type="radio"
                name="export-scope"
                className="mt-1 size-4 accent-primary"
                checked={exportScope === 'preview'}
                onChange={() => {
                  setExportScope('preview');
                  setShowLargeWarning(false);
                  setLargeExportTotalRows(0);
                }}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Current Page (Preview)
                </span>
                <span className="block text-sm text-muted-foreground">
                  Export just the {rowCount} rows visible on this page.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
              <input
                type="radio"
                name="export-scope"
                className="mt-1 size-4 accent-primary"
                checked={exportScope === 'all'}
                onChange={() => {
                  setExportScope('all');
                  setShowLargeWarning(false);
                  setLargeExportTotalRows(0);
                }}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  All Matching Records
                </span>
                <span className="block text-sm text-muted-foreground">
                  Export all matching records using the current filters.
                </span>
              </span>
            </label>
          </div>

          {showLargeWarning && (
            <Alert variant="destructive">
              <TriangleAlert className="size-4" />
              <AlertTitle>Large export warning</AlertTitle>
              <AlertDescription>{proceedLabel}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Unable to generate PDF</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </StandardModal>
  );
}
