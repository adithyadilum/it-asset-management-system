'use client';

import { useMemo, useState, useEffect } from 'react';
import { AssetAssignmentDetailsPanel } from '@/components/features/asset-registry/panels/asset-assignment-panel';
import { AssetAssignmentModal } from './asset-assignment-modal';
import {
  getAssetDetailsByIdAction,
  getAssetMaintenanceByIdAction,
} from '@/actions/asset-registry-panels';
import {
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction,
} from '@/actions/assignments';
import { toast } from 'sonner';
import {
  type AssetDetailsData,
  type MaintenanceEvent,
} from '@/lib/data/asset-details-repo';

type AssignmentPanelAsset = {
  assetId: string;
  assetName?: string;
  assetTag: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  department?: string;
  group: string;
  dateCreated: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  updatedAt: string;
  warranty: string;
  lastRepaired?: string;
  note: string;
  status: string;
  state: string;
  assignmentId?: number;
};

interface AssignmentsPanelsProps {
  isOpen: boolean;
  disableTransition?: boolean;
  selectedAsset: AssignmentPanelAsset | null;
  onClose: () => void;
}

export function AssignmentsPanels({
  isOpen,
  disableTransition,
  selectedAsset,
  onClose,
}: AssignmentsPanelsProps) {
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [cachedAsset, setCachedAsset] = useState<AssignmentPanelAsset | null>(
    selectedAsset
  );
  const [fetchedData, setFetchedData] = useState<{
    details: AssetDetailsData | null;
    maintenance: MaintenanceEvent[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);

  if (selectedAsset && selectedAsset !== cachedAsset) {
    setCachedAsset(selectedAsset);
  }

  if (isOpen && (cachedAsset?.assetId ?? null) !== prevRecordId) {
    setPrevRecordId(cachedAsset?.assetId ?? null);
    setIsLoading(true);
  }

  useEffect(() => {
    if (isOpen && cachedAsset?.assetId) {
      let isMounted = true;
      Promise.all([
        getAssetDetailsByIdAction(cachedAsset.assetId),
        getAssetMaintenanceByIdAction(cachedAsset.assetId),
      ]).then(([detailsRes, maintenanceRes]) => {
        if (isMounted) {
          setFetchedData({
            details: detailsRes.success ? detailsRes.data : null,
            maintenance: maintenanceRes.success ? maintenanceRes.data : [],
          });
          setIsLoading(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, cachedAsset?.assetId]);

  const assetLabel = useMemo(() => {
    if (!cachedAsset) {
      return 'Selected Asset';
    }

    if (
      cachedAsset.model &&
      cachedAsset.model.trim().length > 0 &&
      cachedAsset.model !== '-'
    ) {
      return cachedAsset.model;
    }

    if (cachedAsset.assetName && cachedAsset.assetName.trim().length > 0) {
      return cachedAsset.assetName;
    }

    return cachedAsset.assetId;
  }, [cachedAsset]);

  if (!cachedAsset) {
    return null;
  }

  const handleSendReminder = async () => {
    if (!cachedAsset.assignmentId) return;
    const result = await sendAssignmentReminderAction([
      cachedAsset.assignmentId,
    ]);
    if (result.success) {
      toast.success('Reminder sent successfully');
    } else {
      toast.error(result.error || 'Failed to send reminder');
    }
  };

  const handleRequestReturn = async () => {
    if (!cachedAsset.assignmentId) return;
    const result = await requestAssetReturnAction([cachedAsset.assignmentId]);
    if (result.success) {
      toast.success('Return requested successfully');
    } else {
      toast.error(result.error || 'Failed to request return');
    }
  };

  const handleMarkReceived = async () => {
    if (!cachedAsset.assignmentId) return;
    const result = await markAssetReceivedAction([cachedAsset.assignmentId]);
    if (result.success) {
      toast.success('Asset marked as received');
      onClose();
    } else {
      toast.error(result.error || 'Failed to mark as received');
    }
  };

  return (
    <>
      <AssetAssignmentDetailsPanel
        isOpen={isOpen}
        disableTransition={disableTransition}
        isLoading={isLoading}
        onClose={onClose}
        assetId={cachedAsset.assetId ?? ''}
        assetTag={cachedAsset.assetTag ?? '-'}
        assetName={cachedAsset.assetName}
        category={cachedAsset.category ?? ''}
        model={fetchedData?.details?.model?.name ?? cachedAsset.model ?? ''}
        brand={
          fetchedData?.details?.model?.brand?.name ?? cachedAsset.brand ?? ''
        }
        serialNumber={cachedAsset.serialNumber ?? ''}
        owner={
          fetchedData?.details?.owner?.companyName ?? cachedAsset.owner ?? ''
        }
        assignedTo={cachedAsset.assignedTo ?? ''}
        department={cachedAsset.department ?? ''}
        assignedDate={cachedAsset.assignedDate ?? ''}
        expectedReturnDate={cachedAsset.expectedReturnDate ?? ''}
        group={cachedAsset.group ?? ''}
        dateCreated={cachedAsset.dateCreated ?? ''}
        updatedAt={cachedAsset.updatedAt ?? ''}
        warranty={
          fetchedData?.details?.purchase?.warrantyExpiry
            ? new Date(
                fetchedData.details.purchase.warrantyExpiry
              ).toLocaleDateString('en-GB')
            : (cachedAsset.warranty ?? '')
        }
        lastRepaired={
          fetchedData?.maintenance?.find(
            (m: MaintenanceEvent) => m.status === 'COMPLETED'
          )?.actualCompletionDate
            ? new Date(
                fetchedData.maintenance.find(
                  (m: MaintenanceEvent) => m.status === 'COMPLETED'
                )!.actualCompletionDate!
              ).toLocaleDateString('en-GB')
            : (cachedAsset.lastRepaired ?? '')
        }
        note={cachedAsset.note ?? ''}
        status={cachedAsset.status ?? 'Available'}
        state={cachedAsset.state}
        maintenanceEvents={fetchedData?.maintenance ?? []}
        onEdit={() => {}}
        onAssign={() => setIsAssignmentModalOpen(true)}
        onSendReminder={handleSendReminder}
        onRequestReturn={handleRequestReturn}
        onMarkReceived={handleMarkReceived}
      />

      <AssetAssignmentModal
        isOpen={isAssignmentModalOpen}
        assetId={cachedAsset.assetId ?? ''}
        assetLabel={assetLabel}
        assetGroup={cachedAsset.group ?? ''}
        onOpenChange={setIsAssignmentModalOpen}
      />
    </>
  );
}
