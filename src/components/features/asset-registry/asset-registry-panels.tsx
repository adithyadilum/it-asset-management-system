"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetDetailsPanelWrapper } from "./panels/asset-details-panel-wrapper";
import { RegistrationPanelWrapper } from "./panels/registration-panel-wrapper";

interface AssetRegistryPanelsProps {
    currentPanel?: string;
    recordId?: string;
    closePanelUrl: string;
    pillar: string;
    manualStatuses?: Array<{
        value: string;
        label: string;
        colorTheme?: string;
        iconName?: string;
    }>;
    onStatusUpdateRef?: React.MutableRefObject<(assetId: string, nextStatus: string) => void>;
    onRefreshRef?: React.MutableRefObject<() => void>;
    canManage?: boolean;
}

export function AssetRegistryPanels({
    currentPanel,
    recordId,
    closePanelUrl,
    pillar,
    manualStatuses = [],
    onStatusUpdateRef,
    onRefreshRef,
    canManage = false,
}: AssetRegistryPanelsProps) {
    const router = useRouter();
    const [cachedRecordId, setCachedRecordId] = useState(recordId);

    if (recordId && recordId !== cachedRecordId) {
        setCachedRecordId(recordId);
    }

    const handleClose = () => {
        router.push(closePanelUrl, { scroll: false });
    };

    return (
        <>
            {pillar ? (
                <RegistrationPanelWrapper
                    isOpen={currentPanel === "registration"}
                    onClose={(didSucceed) => {
                        if (didSucceed) {
                            onRefreshRef?.current?.();
                        }
                        handleClose();
                    }}
                    pillar={pillar}
                />
            ) : null}

            {cachedRecordId ? (
                <AssetDetailsPanelWrapper
                    isOpen={currentPanel === "record" && !!recordId}
                    onClose={handleClose}
                    recordId={cachedRecordId}
                    manualStatuses={manualStatuses}
                    onStatusUpdateRef={onStatusUpdateRef}
                    hideActions={!canManage}
                    onRefreshRef={onRefreshRef}
                />
            ) : null}
        </>
    );
}
