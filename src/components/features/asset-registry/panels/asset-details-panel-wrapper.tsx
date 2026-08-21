'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssetDetailsPanel } from './asset-details-panel';
import { AssetEditForm } from './asset-edit-form';
import { AddSoftwareUsersModal } from './add-software-users-modal';
import { AssetAssignmentModal } from '@/components/features/operations/assignments/asset-assignment-modal';
import { DisposeAssetsRequestDialog } from '@/components/features/disposals/dispose-assets-request-dialog';
import { InitiateRepairDialog } from '@/components/features/maintenance/initiate-repair-dialog';
import { RequestReturnDialog } from '@/components/features/operations/assignments/request-return-dialog';
import { RemindReturnDialog } from '@/components/features/operations/assignments/remind-return-dialog';
import { MarkReturnedDialog } from '@/components/features/operations/assignments/mark-returned-dialog';
import {
  getAssetPanelDataAction,
  getEditDropdownOptionsAction,
} from '@/actions/asset-registry-panels';
import type { AssetFinancialVitals } from '@/lib/data/asset-financial-vitals-repo';
import { getVendors, reportDefectiveFromPanel } from '@/actions/maintenance';
import { revokeSoftwareLicenseAllocationAction } from '@/actions/software';

import { tiqriToast } from '@/components/shared/sonner';
import {
  type AssetDetailsData,
  type HistoryEvent,
  type MaintenanceEvent,
  type AllocationData,
} from '@/lib/data/asset-details-repo';
import type { TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import type { Vendor } from '@/types/maintenance';

type AssetPanelRequest = ReturnType<typeof getAssetPanelDataAction>;
const inFlightPanelRequests = new Map<string, AssetPanelRequest>();

function loadAssetPanelData(recordId: string, refreshNonce: number) {
  const requestKey = `${recordId}:${refreshNonce}`;
  const existingRequest = inFlightPanelRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = getAssetPanelDataAction(recordId);
  inFlightPanelRequests.set(requestKey, request);
  void request.then(
    () => {
      if (inFlightPanelRequests.get(requestKey) === request) {
        inFlightPanelRequests.delete(requestKey);
      }
    },
    () => {
      if (inFlightPanelRequests.get(requestKey) === request) {
        inFlightPanelRequests.delete(requestKey);
      }
    }
  );
  return request;
}

export interface AssetDetailsPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  manualStatuses?: Array<{
    value: string;
    label: string;
    colorTheme?: string;
    iconName?: string;
  }>;
  onStatusUpdateRef?: React.MutableRefObject<
    (assetId: string, nextStatus: string) => void
  >;
  onRefreshRef?: React.MutableRefObject<() => void>;
  hideActions?: boolean;
  additionalTabs?: TabbedPanelTab[];
}

function formatDisplayDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function AssetDetailsPanelWrapper({
  isOpen,
  onClose,
  recordId,
  manualStatuses = [],
  onStatusUpdateRef,
  onRefreshRef,
  hideActions,
  additionalTabs,
}: AssetDetailsPanelWrapperProps) {
  const router = useRouter();
  const [data, setData] = useState<AssetDetailsData | null>(null);
  const [displayCurrencyOverride, setDisplayCurrencyOverride] = useState<
    string | null
  >(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<
    MaintenanceEvent[]
  >([]);
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [financialVitals, setFinancialVitals] =
    useState<AssetFinancialVitals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // ---- Edit Mode State ----
  const [isEditing, setIsEditing] = useState(false);
  const [editDropdownOptions, setEditDropdownOptions] = useState<{
    locations: { value: string; label: string }[];
    owners: { value: string; label: string }[];
  }>({ locations: [], owners: [] });

  // ---- Dialog States ----
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isRequestReturnDialogOpen, setIsRequestReturnDialogOpen] =
    useState(false);
  const [isRemindReturnDialogOpen, setIsRemindReturnDialogOpen] =
    useState(false);
  const [isMarkReturnedDialogOpen, setIsMarkReturnedDialogOpen] =
    useState(false);
  const [repairVendors, setRepairVendors] = useState<Vendor[]>([]);
  const [isRepairLoading, setIsRepairLoading] = useState(false);

  const sourceCurrency = data?.purchase?.currencyCode?.trim() || 'USD';
  const displayCurrency = displayCurrencyOverride ?? sourceCurrency;

  useEffect(() => {
    if (!isOpen || !recordId) return;

    let isMounted = true;

    const fetchData = async () => {
      // Reset UI state at the start of a new fetch cycle
      if (isMounted) {
        setIsLoading(true);
        setDisplayCurrencyOverride(null);
        setIsEditing(false);
      }

      try {
        const result = await loadAssetPanelData(recordId, refreshNonce);

        if (isMounted) {
          if (result.success && result.data) {
            setData(result.data.details);
            setHistoryEvents(result.data.history);
            setMaintenanceEvents(result.data.maintenance);
            setAllocations(result.data.allocations);
            setFinancialVitals(result.data.financial);
          } else {
            tiqriToast.error('Failed to load asset details');
            setData(null);
            setHistoryEvents([]);
            setMaintenanceEvents([]);
            setAllocations([]);
            setFinancialVitals(null);
          }
        }
      } catch {
        if (isMounted) {
          tiqriToast.error('Failed to load asset details');
          setData(null);
          setHistoryEvents([]);
          setMaintenanceEvents([]);
          setAllocations([]);
          setFinancialVitals(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, recordId, refreshNonce]);

  // ---- Edit Mode Handlers ----

  const handleEditClick = useCallback(async () => {
    // Fetch dropdown options for the edit form
    try {
      const result = await getEditDropdownOptionsAction();
      if (result.success && result.data) {
        setEditDropdownOptions(result.data);
      }
    } catch {
      // Non-blocking — dropdowns will just be empty
    }
    setIsEditing(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditSaved = useCallback(() => {
    setIsEditing(false);
    setRefreshNonce((n) => n + 1);
    onRefreshRef?.current?.();
  }, [onRefreshRef]);

  // ---- Action Handlers ----

  const handleAssignClick = useCallback(() => {
    setIsAssignModalOpen(true);
  }, []);

  const handleRequestReturnClick = useCallback(() => {
    setIsRequestReturnDialogOpen(true);
  }, []);

  const handleRemindReturnClick = useCallback(() => {
    setIsRemindReturnDialogOpen(true);
  }, []);

  const handleMarkReturnedClick = useCallback(() => {
    setIsMarkReturnedDialogOpen(true);
  }, []);

  const handleSendForRepairClick = useCallback(async () => {
    // Lazy-fetch vendors on button click
    setIsRepairLoading(true);
    try {
      const vendorList = await getVendors();
      setRepairVendors(vendorList as Vendor[]);
      setIsRepairDialogOpen(true);
    } catch {
      tiqriToast.error('Failed to load vendors.');
    } finally {
      setIsRepairLoading(false);
    }
  }, []);

  const handleRequestDisposalClick = useCallback(() => {
    setIsDisposalDialogOpen(true);
  }, []);

  const handleProcessReturnClick = useCallback(() => {
    if (data?.asset.id) {
      router.push(
        `/operations/assignments?tab=returned-assets&processReturnId=${data.asset.id}`
      );
      onClose(); // close the panel so they are redirected nicely
    }
  }, [data, router, onClose]);

  const handleRevokeSoftwareAllocation = useCallback(
    async (userId: string) => {
      if (!data?.asset.id) {
        return;
      }

      const allocation = allocations.find((item) => item.id === userId);
      const result = await revokeSoftwareLicenseAllocationAction(
        data.asset.id,
        userId
      );

      if (!result.success) {
        tiqriToast.error(result.error);
        return;
      }

      tiqriToast.success(
        `Removed ${allocation?.name ?? 'user'} from this software license.`
      );
      setAllocations((previous) =>
        previous.filter((item) => item.id !== userId)
      );
      setData((previous) => {
        if (!previous?.softwareLicense) {
          return previous;
        }

        return {
          ...previous,
          softwareLicense: {
            ...previous.softwareLicense,
            availableSeats: Math.min(
              previous.softwareLicense.totalSeats,
              previous.softwareLicense.availableSeats + 1
            ),
          },
        };
      });
      setRefreshNonce((n) => n + 1);
      onRefreshRef?.current?.();
    },
    [allocations, data, onRefreshRef]
  );

  // Derive pillar info for conditional logic
  const pillar = data?.model.category.pillar ?? '';
  const assetLabel =
    data?.asset.name || data?.model.name || data?.asset.assetTag || 'Asset';

  return (
    <>
      {/* ---- Edit Mode: Replaces the read-only panel in the same position ---- */}
      {isOpen && isEditing && data ? (
        <AssetEditForm
          isOpen={isOpen}
          onClose={handleEditClose}
          onSaved={handleEditSaved}
          data={data}
          locationOptions={editDropdownOptions.locations}
          ownerOptions={editDropdownOptions.owners}
        />
      ) : (
        /* ---- Read-Only Mode: Original Asset Details Panel (unchanged) ---- */
        <AssetDetailsPanel
          isOpen={isOpen}
          onClose={onClose}
          isLoading={isLoading}
          assetId={data?.asset.id ?? ''}
          assetTag={data?.asset.assetTag ?? ''}
          assetName={data?.asset.name ?? ''}
          assetCategory={data?.model.category.pillar ?? ''}
          model={data?.model.name ?? ''}
          imageUrl={data?.model.imageUrl ?? ''}
          brand={data?.model.brand.name ?? ''}
          serialNumber={data?.asset.serialNumber ?? ''}
          owner={data?.owner?.companyName ?? ''}
          // A location assignment has no user, so fall back to the place it is
          // assigned to. Previously this rendered '-' and the panel looked as
          // though the asset were unassigned.
          assignedTo={
            data?.assignment?.assignedToUser?.name ??
            data?.assignment?.assignedToLocation?.name ??
            ''
          }
          pillar={data?.model.category.pillar ?? ''}
          group={''}
          location={data?.location?.name ?? ''}
          condition={data?.asset.condition ?? ''}
          status={data?.asset.status ?? ''}
          assignmentState={data?.assignment?.state ?? undefined}
          dateCreated={formatDisplayDateTime(data?.asset.createdAt)}
          updatedAt={formatDisplayDateTime(data?.asset.updatedAt)}
          note={data?.assignment?.notes ?? ''}
          specs={{
            ...(data?.model?.technicalDetails as Record<
              string,
              string | number | undefined
            >),
            ...(data?.asset?.instanceAttributes as Record<
              string,
              string | number | undefined
            >),
          }}
          techNote={''}
          currency={displayCurrency}
          sourceCurrency={sourceCurrency}
          purchaseDate={formatDisplayDate(data?.purchase?.purchaseDate)}
          basePrice={data?.purchase?.basePrice ?? ''}
          shippingCost={data?.purchase?.shippingCost ?? ''}
          tax={data?.purchase?.tax ?? ''}
          totalCost={String(data?.purchase?.totalCost ?? '')}
          warranty={formatDisplayDate(data?.purchase?.warrantyExpiry)}
          vendorInfo={{
            vendorId:
              data?.vendor?.id != null
                ? String(data.vendor.id)
                : data?.purchase?.vendorId != null
                  ? String(data.purchase.vendorId)
                  : '',
            vendorCode: data?.vendor?.vendorCode ?? undefined,
            vendorName: data?.vendor?.companyName ?? '',
            contactNumber: data?.vendor?.phone ?? undefined,
            email: data?.vendor?.email ?? undefined,
            website: data?.vendor?.website ?? undefined,
          }}
          invoiceUrl={data?.purchase?.invoiceUrl ?? ''}
          currentBookValue={financialVitals?.currentBookValue}
          totalRepairCosts={financialVitals?.totalRepairCosts}
          totalTCO={financialVitals?.totalTCO}
          historyEvents={historyEvents}
          maintenanceEvents={maintenanceEvents}
          allocations={allocations}
          totalSeats={data?.softwareLicense?.totalSeats}
          availableSeats={data?.softwareLicense?.availableSeats}
          expiryDate={formatDisplayDate(data?.softwareLicense?.expiryDate)}
          licenseType={data?.softwareLicense?.licenseType}
          onRevokeAllocation={handleRevokeSoftwareAllocation}
          onCurrencyChange={setDisplayCurrencyOverride}
          manualStatuses={manualStatuses}
          onEdit={handleEditClick}
          onAssign={handleAssignClick}
          onRequestReturn={handleRequestReturnClick}
          onRemindReturn={handleRemindReturnClick}
          onMarkReturned={handleMarkReturnedClick}
          onSendForRepair={handleSendForRepairClick}
          onRequestDisposal={handleRequestDisposalClick}
          onProcessReturn={handleProcessReturnClick}
          onStatusChanged={(nextStatus) => {
            setData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                asset: {
                  ...prev.asset,
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                },
                assignment: null,
              };
            });
            setAllocations([]);
            setRefreshNonce((n) => n + 1);
            if (onStatusUpdateRef?.current && data?.asset.id) {
              onStatusUpdateRef.current(data.asset.id, nextStatus);
            }
          }}
          hideActions={hideActions}
          additionalTabs={additionalTabs}
          onActionButtonClick={() => {
            if (pillar === 'Software') {
              setIsAddUserModalOpen(true);
            }
          }}
        />
      )}

      {/* ---- Software: Add User Modal ---- */}
      {data?.model.category.pillar === 'Software' && (
        <AddSoftwareUsersModal
          isOpen={isAddUserModalOpen}
          onClose={(didAllocate) => {
            setIsAddUserModalOpen(false);
            if (didAllocate) {
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            }
          }}
          assetId={data.asset.id}
          availableSeats={data.softwareLicense?.availableSeats ?? 0}
          existingAllocations={allocations}
        />
      )}

      {/* ---- Assignment Modal ---- */}
      {data && (
        <AssetAssignmentModal
          isOpen={isAssignModalOpen}
          assetId={data.asset.id}
          assetLabel={assetLabel}
          assetGroup={pillar}
          onOpenChange={(open) => {
            setIsAssignModalOpen(open);
            if (!open) {
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            }
          }}
        />
      )}

      {/* ---- Return Workflow Dialogs ---- */}
      {data?.assignment?.id && (
        <>
          <RequestReturnDialog
            isOpen={isRequestReturnDialogOpen}
            onClose={() => setIsRequestReturnDialogOpen(false)}
            assignmentId={data.assignment.id}
            assetLabel={assetLabel}
            onSuccess={() => {
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            }}
          />
          <RemindReturnDialog
            isOpen={isRemindReturnDialogOpen}
            onClose={() => setIsRemindReturnDialogOpen(false)}
            assignmentId={data.assignment.id}
            assetLabel={assetLabel}
            onSuccess={() => {
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            }}
          />
          <MarkReturnedDialog
            isOpen={isMarkReturnedDialogOpen}
            onClose={() => setIsMarkReturnedDialogOpen(false)}
            assignmentId={data.assignment.id}
            assetLabel={assetLabel}
            onSuccess={() => {
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            }}
          />
        </>
      )}

      {/* ---- Disposal Request Dialog ---- */}
      {data && (
        <DisposeAssetsRequestDialog
          open={isDisposalDialogOpen}
          onOpenChange={(open) => {
            setIsDisposalDialogOpen(open);
          }}
          selectedAssets={[
            {
              id: data.asset.id,
              assetTag: data.asset.assetTag,
              assetName: data.asset.name || data.model.name || 'Asset',
            },
          ]}
          onSubmitted={({ inserted, skipped }) => {
            setIsDisposalDialogOpen(false);
            setRefreshNonce((n) => n + 1);
            onRefreshRef?.current?.();

            if (skipped > 0) {
              tiqriToast.warning(
                `Submitted ${inserted} request(s). Skipped ${skipped} already pending.`
              );
            } else {
              tiqriToast.success(`Disposal request submitted.`);
            }
          }}
        />
      )}

      {/* ---- Initiate Repair Dialog ---- */}
      {data && (
        <InitiateRepairDialog
          isOpen={isRepairDialogOpen}
          onClose={() => setIsRepairDialogOpen(false)}
          onConfirm={async (formData) => {
            try {
              const result = await reportDefectiveFromPanel(
                data.asset.id,
                formData.vendorId,
                formData.rmaNumber,
                formData.estimatedCost || undefined,
                formData.expectedReturnDate || undefined
              );

              if (!result.success) {
                throw new Error(
                  result.message || 'Failed to dispatch asset for repair'
                );
              }

              tiqriToast.success('Asset dispatched for repair.');
              setRefreshNonce((n) => n + 1);
              onRefreshRef?.current?.();
            } catch (error) {
              throw error; // Let the dialog handle the error display
            }
          }}
          vendors={repairVendors}
          isLoading={isRepairLoading}
          assetId={data.asset.assetTag}
          assetName={data.asset.name || data.model.name || 'Unknown Asset'}
          assetSerial={data.asset.serialNumber || undefined}
        />
      )}
    </>
  );
}
