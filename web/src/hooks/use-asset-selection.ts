'use client';

import { useState, useCallback } from 'react';
import { 
  getAssetDetails, 
  getAssetHistory, 
  getAssetMaintenance,
  type AssetDetailsData,
  type HistoryEvent,
  type MaintenanceEvent
} from '@/actions/assets';

interface UseAssetSelectionReturn {
  selectedAssetId: string | null;
  assetData: {
    details: AssetDetailsData;
    history: HistoryEvent[];
    maintenance: MaintenanceEvent[];
  } | null;
  isLoading: boolean;
  error: string | null;
  selectAsset: (assetTag: string) => Promise<void>;
  clearSelection: () => void;
}

export function useAssetSelection(): UseAssetSelectionReturn {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<{
    details: AssetDetailsData;
    history: HistoryEvent[];
    maintenance: MaintenanceEvent[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectAsset = useCallback(async (assetTag: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedAssetId(assetTag);

      // Fetch all data in parallel
      const [details, history, maintenance] = await Promise.all([
        getAssetDetails(assetTag),
        getAssetHistory(assetTag),
        getAssetMaintenance(assetTag),
      ]);

      if (!details) {
        setError('Asset not found');
        setSelectedAssetId(null);
        setAssetData(null);
        return;
      }

      setAssetData({ details, history, maintenance });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch asset details';
      setError(errorMessage);
      setSelectedAssetId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAssetId(null);
    setAssetData(null);
    setError(null);
  }, []);

  return {
    selectedAssetId,
    assetData,
    isLoading,
    error,
    selectAsset,
    clearSelection,
  };
}