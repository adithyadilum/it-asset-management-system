import { useState, useCallback, useRef, useTransition } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { fetchReportPreview } from '@/actions/standard-reports';
import type { FilterState, ReportPreviewRow } from '@/types/standard-reports';

export function useReportData() {
  const [previewData, setPreviewData] = useState<ReportPreviewRow[]>([]);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isLoading, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestSequenceRef = useRef(0);

  const loadPreview = useCallback(
    async (filters: FilterState, pageCtx: PaginationState) => {
      const requestSequence = ++requestSequenceRef.current;
      setErrorMessage(null);

      const pIndex = pageCtx?.pageIndex ?? 0;
      const pSize = pageCtx?.pageSize ?? 16;

      startTransition(async () => {
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

          if (requestSequence !== requestSequenceRef.current) {
            return;
          }

          setPreviewData(result.data);
          setPageCount(result.pageCount);
        } catch (error) {
          if (requestSequence !== requestSequenceRef.current) {
            return;
          }

          const message = error instanceof Error ? error.message : 'Failed to fetch report preview';
          setErrorMessage(message);
          console.error('Failed to fetch report preview:', error);
          setPreviewData([]);
        }
      });
    },
    []
  );

  const clearData = useCallback(() => {
    requestSequenceRef.current++; // Invalidates any pending requests
    setPreviewData([]);
    setErrorMessage(null);
  }, []);

  return {
    previewData,
    pageCount,
    isLoading,
    errorMessage,
    loadPreview,
    clearData,
    setErrorMessage,
  };
}
