'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AssetDetailsPanel } from '@/components/features/asset-registry/panels/asset-details-panel';
import { AssetAssignmentModal } from './asset-assignment-modal';
import { AddSoftwareUsersModal } from '@/components/features/asset-registry/panels/add-software-users-modal';
import {
  getAssetDetailsByIdAction,
  getAssetMaintenanceByIdAction,
} from '@/actions/asset-registry-panels';
import {
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction,
  cancelAssignmentAction,
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
  /**
   * Opens the Process Return modal, which lives on the dashboard because the
   * returned-assets table opens it too. Distinct from marking an asset
   * received: processing a return records the condition it came back in.
   */
  onProcessReturn?: (asset: AssignmentPanelAsset) => void;
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
}

/**
 * The asset panel, opened from the operations assignments grid.
 *
 * This used to render its own panel component, a near-copy of the registry's
 * that had drifted: it missed the model image, printed '-' for fields the
 * registry showed, and labelled a location assignment "Assigned to". Both
 * paths now render `AssetDetailsPanel` over the same `getAssetDetailsByIdAction`
 * payload, so a fix to one is a fix to both. The lifecycle actions this path
 * needs -- reminder, cancel, receive -- live in `asset-action-config.ts` and
 * are chosen from the assignment state.
 */
export function AssignmentsPanels({
  isOpen,
  disableTransition,
  selectedAsset,
  onClose,
  onProcessReturn,
}: AssignmentsPanelsProps) {
  const router = useRouter();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAllocateSoftwareModalOpen, setIsAllocateSoftwareModalOpen] =
    useState(false);
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

  const details = fetchedData?.details ?? null;

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

  const handleCancelAssignment = async () => {
    if (!cachedAsset.assignmentId) return;
    const result = await cancelAssignmentAction(cachedAsset.assignmentId);
    if (result.success) {
      toast.success('Assignment cancelled');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to cancel assignment');
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
    // Was a bare `return`. Returned rows carried no assignmentId, so the
    // button reported nothing at all when it could not act.
    if (!cachedAsset.assignmentId) {
      toast.error('This asset has no open assignment to close.');
      return;
    }
    const result = await markAssetReceivedAction([cachedAsset.assignmentId]);
    if (result.success) {
      toast.success('Asset marked as received');
      onClose();
    } else {
      toast.error(result.error || 'Failed to mark as received');
    }
  };

  const lastCompletedRepair = fetchedData?.maintenance?.find(
    (event: MaintenanceEvent) => event.status === 'COMPLETED'
  )?.actualCompletionDate;

  return (
    <>
      <AssetDetailsPanel
        isOpen={isOpen}
        disableTransition={disableTransition}
        isLoading={isLoading}
        onClose={onClose}
        assetId={cachedAsset.assetId ?? ''}
        assetTag={cachedAsset.assetTag ?? '-'}
        assetName={details?.asset.name ?? cachedAsset.assetName}
        assetCategory={
          details?.model.category.pillar ?? cachedAsset.group ?? ''
        }
        pillar={details?.model.category.pillar ?? cachedAsset.group ?? ''}
        model={details?.model?.name ?? cachedAsset.model ?? ''}
        // The details fetch above already carries the model image; the old
        // panel never passed it on, so it always showed the placeholder.
        imageUrl={details?.model?.imageUrl ?? ''}
        brand={details?.model?.brand?.name ?? cachedAsset.brand ?? ''}
        serialNumber={details?.asset.serialNumber ?? cachedAsset.serialNumber}
        owner={details?.owner?.companyName ?? cachedAsset.owner ?? ''}
        // A location assignment has no user; falling through to '-' made an
        // assigned asset look unassigned.
        assignedTo={
          details?.assignment?.assignedToUser?.name ??
          details?.assignment?.assignedToLocation?.name ??
          cachedAsset.assignedTo ??
          ''
        }
        assignedDate={
          formatDisplayDate(details?.assignment?.assignedDate) ||
          cachedAsset.assignedDate
        }
        expectedReturnDate={
          formatDisplayDate(details?.assignment?.expectedReturnDate) ||
          cachedAsset.expectedReturnDate
        }
        location={details?.location?.name ?? ''}
        condition={details?.asset.condition ?? ''}
        group={cachedAsset.group ?? ''}
        dateCreated={cachedAsset.dateCreated ?? ''}
        updatedAt={cachedAsset.updatedAt ?? ''}
        warranty={
          formatDisplayDate(details?.purchase?.warrantyExpiry) ||
          (cachedAsset.warranty ?? '')
        }
        lastRepaired={
          formatDisplayDate(lastCompletedRepair) ||
          (cachedAsset.lastRepaired ?? '')
        }
        note={details?.assignment?.notes ?? cachedAsset.note ?? ''}
        status={details?.asset.status ?? cachedAsset.status ?? 'Available'}
        assignmentState={details?.assignment?.state ?? cachedAsset.state}
        specs={{
          ...(details?.model?.technicalDetails as Record<
            string,
            string | number | undefined
          >),
          ...(details?.asset?.instanceAttributes as Record<
            string,
            string | number | undefined
          >),
        }}
        purchaseDate={formatDisplayDate(details?.purchase?.purchaseDate)}
        basePrice={details?.purchase?.basePrice ?? ''}
        shippingCost={details?.purchase?.shippingCost ?? ''}
        tax={details?.purchase?.tax ?? ''}
        totalCost={String(details?.purchase?.totalCost ?? '')}
        currency={details?.purchase?.currencyCode}
        sourceCurrency={details?.purchase?.currencyCode}
        invoiceUrl={details?.purchase?.invoiceUrl ?? ''}
        vendorInfo={
          details?.vendor
            ? {
                vendorId: String(details.vendor.id),
                vendorCode: details.vendor.vendorCode ?? undefined,
                vendorName: details.vendor.companyName,
                contactNumber: details.vendor.phone ?? undefined,
                email: details.vendor.email ?? undefined,
                website: details.vendor.website ?? undefined,
              }
            : undefined
        }
        totalSeats={details?.softwareLicense?.totalSeats}
        availableSeats={details?.softwareLicense?.availableSeats}
        expiryDate={formatDisplayDate(details?.softwareLicense?.expiryDate)}
        licenseType={details?.softwareLicense?.licenseType}
        maintenanceEvents={fetchedData?.maintenance ?? []}
        onAssign={() => setIsAssignmentModalOpen(true)}
        onActionButtonClick={() => {
          const pillar =
            details?.model.category.pillar ?? cachedAsset.group ?? '';
          if (pillar === 'Software') {
            setIsAllocateSoftwareModalOpen(true);
          } else {
            setIsAssignmentModalOpen(true);
          }
        }}
        onRemindReturn={handleSendReminder}
        onRequestReturn={handleRequestReturn}
        onMarkReturned={handleMarkReceived}
        onProcessReturn={
          onProcessReturn && cachedAsset
            ? () => onProcessReturn(cachedAsset)
            : undefined
        }
        onCancelAssignment={handleCancelAssignment}
      />

      <AssetAssignmentModal
        isOpen={isAssignmentModalOpen}
        assetId={cachedAsset.assetId ?? ''}
        assetLabel={assetLabel}
        assetGroup={cachedAsset.group ?? ''}
        onOpenChange={setIsAssignmentModalOpen}
      />

      {/* ---- Software: Allocate Software License Modal ---- */}
      {(details?.model.category.pillar ?? cachedAsset.group) === 'Software' && (
        <AddSoftwareUsersModal
          isOpen={isAllocateSoftwareModalOpen}
          onClose={(didAllocate) => {
            setIsAllocateSoftwareModalOpen(false);
            if (didAllocate) {
              router.refresh();
            }
          }}
          assetId={cachedAsset.assetId ?? ''}
          availableSeats={details?.softwareLicense?.availableSeats ?? 0}
          existingAllocations={[]}
        />
      )}
    </>
  );
}
