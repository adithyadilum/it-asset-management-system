"use client";

import { useEffect, useState } from "react";
import { AssetDetailsPanel } from "./asset-details-panel";
import {
  getAssetDetailsByIdAction,
  getAssetHistoryByIdAction,
  getAssetMaintenanceByIdAction,
} from "@/actions/asset-registry-panels";
import { tiqriToast } from "@/components/shared/sonner";
import {
  type AssetDetailsData,
  type HistoryEvent,
  type MaintenanceEvent,
} from "@/lib/data/asset-details-repo";

export interface AssetDetailsPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
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

export function AssetDetailsPanelWrapper({ isOpen, onClose, recordId }: AssetDetailsPanelWrapperProps) {
  const [data, setData] = useState<AssetDetailsData | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);

  if (isOpen && recordId !== prevRecordId) {
    setPrevRecordId(recordId);
    setIsLoading(true);
  }

  useEffect(() => {
    if (isOpen && recordId) {
      let isMounted = true;

      Promise.all([
        getAssetDetailsByIdAction(recordId),
        getAssetHistoryByIdAction(recordId),
        getAssetMaintenanceByIdAction(recordId),
      ])
        .then(([detailsRes, historyRes, maintenanceRes]) => {
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
  }, [isOpen, recordId]);

  return (
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
      group={""} // Group not in assignment
      location={data?.location?.name ?? ""}
      condition={data?.asset.condition ?? ""}
      status={data?.asset.status ?? ""}
      dateCreated={formatDisplayDateTime(data?.asset.createdAt)}
      updatedAt={formatDisplayDateTime(data?.asset.updatedAt)}
      note={data?.assignment?.notes ?? ""}
      specs={(data?.model.technicalDetails as Record<string, string | number | undefined>) ?? {}}
      techNote={""} // techNote doesn't exist
      currency={data?.purchase?.currencyCode ?? ""}
      purchaseDate={formatDisplayDate(data?.purchase?.purchaseDate)}
      basePrice={data?.purchase?.basePrice ?? ""}
      shippingCost={data?.purchase?.shippingCost ?? ""}
      tax={data?.purchase?.tax ?? ""}
      totalCost={String(data?.purchase?.totalCost ?? "")}
      warranty={formatDisplayDate(data?.purchase?.warrantyExpiry)}
      vendorInfo={{
        vendorId: data?.vendor?.id ? String(data.vendor.id) : "",
        vendorName: data?.vendor?.companyName ?? "",
        contactNumber: data?.vendor?.contactInfo ?? ""
      }}
      invoiceUrl={data?.purchase?.invoiceUrl ?? ""}
      historyEvents={historyEvents}
      maintenanceEvents={maintenanceEvents}
    />
  );
}
