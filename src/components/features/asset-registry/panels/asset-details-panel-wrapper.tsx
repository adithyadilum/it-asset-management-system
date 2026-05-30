"use client";

import { useCallback, useEffect, useState } from "react";
import { AssetDetailsPanel } from "./asset-details-panel";
import { AssetEditForm } from "./asset-edit-form";
import { AddSoftwareUsersModal } from "./add-software-users-modal";
import {
  getAssetDetailsByIdAction,
  getAssetHistoryByIdAction,
  getAssetMaintenanceByIdAction,
  getAssetAllocationsAction,
  getEditDropdownOptionsAction,
} from "@/actions/asset-registry-panels";
import { getAssetFinancialVitals, type AssetFinancialVitals } from "@/actions/asset-financial-vitals";
import { tiqriToast } from "@/components/shared/sonner";
import {
  type AssetDetailsData,
  type HistoryEvent,
  type MaintenanceEvent,
  type AllocationData,
} from "@/lib/data/asset-details-repo";
import type { TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';

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
  onStatusUpdateRef?: React.MutableRefObject<(assetId: string, nextStatus: string) => void>;
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
  const [data, setData] = useState<AssetDetailsData | null>(null);
  const [displayCurrencyOverride, setDisplayCurrencyOverride] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [financialVitals, setFinancialVitals] = useState<AssetFinancialVitals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // ---- Edit Mode State ----
  const [isEditing, setIsEditing] = useState(false);
  const [editDropdownOptions, setEditDropdownOptions] = useState<{
    locations: { value: string; label: string }[];
    owners: { value: string; label: string }[];
  }>({ locations: [], owners: [] });

  if (isOpen && recordId !== prevRecordId) {
    setPrevRecordId(recordId);
    setIsLoading(true);
    setDisplayCurrencyOverride(null);
    setIsEditing(false); // Reset edit mode when switching records
  }

  const sourceCurrency = data?.purchase?.currencyCode?.trim() || 'USD';
  const displayCurrency = displayCurrencyOverride ?? sourceCurrency;

  useEffect(() => {
    if (isOpen && recordId) {
      let isMounted = true;

      Promise.all([
        getAssetDetailsByIdAction(recordId),
        getAssetHistoryByIdAction(recordId),
        getAssetMaintenanceByIdAction(recordId),
        getAssetAllocationsAction(recordId),
        getAssetFinancialVitals(recordId).catch(() => null),
      ])
        .then(([detailsRes, historyRes, maintenanceRes, allocationsRes, financialRes]) => {
          if (isMounted) {
            if (detailsRes.success) {
              setData(detailsRes.data);
            } else {
              tiqriToast.error("Failed to load asset details");
            }

            if (historyRes.success) {
              setHistoryEvents(historyRes.data);
            } else {
              setHistoryEvents([]);
            }

            if (maintenanceRes.success) {
              setMaintenanceEvents(maintenanceRes.data);
            } else {
              setMaintenanceEvents([]);
            }

            if (allocationsRes.success) {
              setAllocations(allocationsRes.data);
            } else {
              setAllocations([]);
            }

            if (financialRes) {
              setFinancialVitals(financialRes);
            } else {
              setFinancialVitals(null);
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
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

  return (
    <>
    {/* ---- Edit Mode: Replaces the read-only panel in the same position ---- */}
    {isEditing && data ? (
      <AssetEditForm
        isOpen={true}
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
        assetId={data?.asset.id ?? ""}
        assetTag={data?.asset.assetTag ?? ""}
        assetName={data?.asset.name ?? ""}
        assetCategory={data?.model.category.pillar ?? ""}
        model={data?.model.name ?? ""}
        imageUrl={data?.model.imageUrl ?? ""}
        brand={data?.model.brand.name ?? ""}
        serialNumber={data?.asset.serialNumber ?? ""}
        owner={data?.owner?.companyName ?? ""}
        assignedTo={data?.assignment?.assignedToUser?.name ?? ""}
        group={""}
        location={data?.location?.name ?? ""}
        condition={data?.asset.condition ?? ""}
        status={data?.asset.status ?? ""}
        dateCreated={formatDisplayDateTime(data?.asset.createdAt)}
        updatedAt={formatDisplayDateTime(data?.asset.updatedAt)}
        note={data?.assignment?.notes ?? ""}
        specs={{
          ...(data?.model?.technicalDetails as Record<string, string | number | undefined>),
          ...(data?.asset?.instanceAttributes as Record<string, string | number | undefined>)
        }}
        techNote={""}
        currency={displayCurrency}
        sourceCurrency={sourceCurrency}
        purchaseDate={formatDisplayDate(data?.purchase?.purchaseDate)}
        basePrice={data?.purchase?.basePrice ?? ""}
        shippingCost={data?.purchase?.shippingCost ?? ""}
        tax={data?.purchase?.tax ?? ""}
        totalCost={String(data?.purchase?.totalCost ?? "")}
        warranty={formatDisplayDate(data?.purchase?.warrantyExpiry)}
        vendorInfo={{
          vendorId:
            data?.vendor?.id != null
              ? String(data.vendor.id)
              : data?.purchase?.vendorId != null
                ? String(data.purchase.vendorId)
                : "",
          vendorCode: data?.vendor?.vendorCode ?? undefined,
          vendorName: data?.vendor?.companyName ?? "",
          contactNumber: data?.vendor?.phone ?? undefined,
          email: data?.vendor?.email ?? undefined,
          website: data?.vendor?.website ?? undefined,
        }}
        invoiceUrl={data?.purchase?.invoiceUrl ?? ""}
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
        onCurrencyChange={setDisplayCurrencyOverride}
        manualStatuses={manualStatuses}
        onEdit={handleEditClick}
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
          if (data?.model.category.pillar === 'Software') {
            setIsAddUserModalOpen(true);
          }
        }}
      />
    )}
    
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
    </>
  );
}
