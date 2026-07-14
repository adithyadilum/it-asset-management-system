import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { getCustomStatuses, type CustomStatusRow } from '@/actions/statuses';
import {
  getAssetsByPillar,
  getAllAssetsUnified,
} from '@/actions/asset-registry';
import { BULK_FETCH_PAGE_SIZE } from './asset-registry-constants';
import type { RegistryView } from './registry-config';
import type { RegistryPillar } from '@/lib/data/asset-registry-repo';
import type {
  AssetRegistryRow,
  AssetRegistryResult,
} from './asset-registry.types';

interface UseAssetRegistryDataProps {
  initialResult: AssetRegistryResult;
  view: RegistryView;
  pillar: RegistryPillar | undefined;
  debouncedQuery: string;
  selectedCategoryId?: number;
  backendStatusFilter?: string;
  refreshNonce: number;
}

export function useAssetRegistryData({
  initialResult,
  view,
  pillar,
  debouncedQuery,
  selectedCategoryId,
  backendStatusFilter,
  refreshNonce,
}: UseAssetRegistryDataProps) {
  const [rows, setRows] = useState<AssetRegistryRow[]>(initialResult.data);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);

  const requestSequenceRef = useRef(0);

  // Fetch custom statuses once on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getCustomStatuses();
        if (!mounted) return;
        setCustomStatuses(result.map((r: CustomStatusRow) => r.name));
      } catch {
        // ignore non-fatal
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Load asset rows whenever filters/search/category change
  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    setErrorMessage(null);

    const loadRows = async () => {
      try {
        const requestParams = {
          pillar,
          query: debouncedQuery,
          categoryId: selectedCategoryId,
          status: backendStatusFilter,
        };

        const fetchFn =
          view === 'unified' ? getAllAssetsUnified : getAssetsByPillar;

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
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load assets.'
          );
        });
      }
    };

    startTransition(() => {
      void loadRows();
    });
  }, [
    backendStatusFilter,
    pillar,
    view,
    debouncedQuery,
    refreshNonce,
    selectedCategoryId,
  ]);

  const manuallyUpdateRowStatus = useCallback(
    (assetId: string, nextStatus: string) => {
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
    },
    []
  );

  return {
    rows,
    isPending,
    errorMessage,
    setErrorMessage,
    customStatuses,
    manuallyUpdateRowStatus,
  };
}
