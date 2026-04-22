"use client";

import { useEffect, useState } from "react";
import { AssetDetailsPanel } from "./asset-details-panel";
import { getAssetDetailsByIdAction } from "@/actions/asset-registry-panels";
import { tiqriToast } from "@/components/shared/sonner";

export interface AssetDetailsPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
}

export function AssetDetailsPanelWrapper({ isOpen, onClose, recordId }: AssetDetailsPanelWrapperProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && recordId) {
      let isMounted = true;
      setIsLoading(true);

      getAssetDetailsByIdAction(recordId)
        .then((res) => {
          if (isMounted) {
            if (res.success) {
              setData(res.data);
            } else {
              tiqriToast.error("Failed to load asset details");
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
      assetCategory={data?.model.category.name ?? ""}
      model={data?.model.name ?? ""}
      brand={data?.model.brand.name ?? ""}
      serialNumber={data?.asset.serialNumber ?? ""}
      owner={data?.assignment?.assignedToUser?.name ?? ""}
      group={""} // Group not in assignment
      location={data?.location?.name ?? ""}
      condition={data?.asset.condition ?? ""}
      status={data?.asset.status ?? ""}
      dateCreated={data?.asset.createdAt ?? ""}
      updatedAt={data?.asset.updatedAt ?? ""}
      note={data?.assignment?.notes ?? ""}
      specs={data?.model.technicalDetails ?? {}}
      techNote={""} // techNote doesn't exist
      currency={data?.purchase?.currencyCode ?? ""}
      purchaseDate={data?.purchase?.purchaseDate ?? ""}
      basePrice={data?.purchase?.basePrice ?? ""}
      shippingCost={data?.purchase?.shippingCost ?? ""}
      tax={data?.purchase?.tax ?? ""}
      totalCost={data?.purchase?.totalCost ?? ""}
      warranty={data?.purchase?.warrantyExpiry ?? ""}
      vendorInfo={{
        vendorId: data?.vendor?.id ?? "",
        vendorName: data?.vendor?.companyName ?? "",
        contactNumber: data?.vendor?.contactInfo ?? ""
      }}
      invoiceUrl={data?.purchase?.invoiceUrl ?? ""}
    />
  );
}
