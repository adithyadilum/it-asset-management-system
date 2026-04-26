"use client";

import { useRouter } from "next/navigation";
import { AssetDetailsPanelWrapper } from "./panels/asset-details-panel-wrapper";
import { RegistrationPanelWrapper } from "./panels/registration-panel-wrapper";

interface AssetRegistryPanelsProps {
    currentPanel?: string;
    recordId?: string;
    closePanelUrl: string;
    pillar: string;
}

export function AssetRegistryPanels({
    currentPanel,
    recordId,
    closePanelUrl,
    pillar,
}: AssetRegistryPanelsProps) {
    const router = useRouter();

    const handleClose = () => {
        router.push(closePanelUrl, { scroll: false });
    };

    return (
        <>
            <RegistrationPanelWrapper
                isOpen={currentPanel === "registration"}
                onClose={handleClose}
                pillar={pillar}
            />

            {recordId ? (
                <AssetDetailsPanelWrapper
                    isOpen={currentPanel === "record"}
                    onClose={handleClose}
                    recordId={recordId}
                />
            ) : null}
        </>
    );
}
