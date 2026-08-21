import { useState } from 'react';
import { bulkUpdateAssets } from '@/actions/asset-registry';

interface UseAssetMutationsProps {
  setErrorMessage: (message: string | null) => void;
  onSuccess: () => void;
  onTransferSuccess: () => void;
}

export function useAssetMutations({
  setErrorMessage,
  onSuccess,
  onTransferSuccess,
}: UseAssetMutationsProps) {
  const [isMutating, setIsMutating] = useState(false);

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

      onSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Bulk status update failed.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const performBulkTransfer = async (
    targetLocationId: number,
    selectedAssetIds: string[]
  ) => {
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

      onTransferSuccess();
      onSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Bulk transfer failed.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  return {
    isMutating,
    performBulkStatusChange,
    performBulkTransfer,
  };
}
