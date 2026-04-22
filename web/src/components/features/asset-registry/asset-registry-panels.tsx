"use client";

import { useRouter } from "next/navigation";

import { DetailPanel } from "@/components/shared/slide-panels/detail-panel";
import { FormPanel } from "@/components/shared/slide-panels/form-panel";

interface AssetRegistryPanelsProps {
    currentPanel?: string;
    panelAnimation?: string;
    recordId?: string;
    closePanelUrl: string;
}

export function AssetRegistryPanels({
    currentPanel,
    panelAnimation,
    recordId,
    closePanelUrl,
}: AssetRegistryPanelsProps) {
    const router = useRouter();
    const disableTransition = panelAnimation === "0";

    const handleClose = () => {
        router.push(closePanelUrl, { scroll: false });
    };

    return (
        <>
            <FormPanel
                isOpen={currentPanel === "create"}
                onClose={handleClose}
                title="Add Asset"
                disableTransition={disableTransition}
                onSubmit={(e) => e.preventDefault()}
            >
                <div className="p-6 text-sm text-slate-600">
                    Create panel coming soon.
                </div>
            </FormPanel>

            <DetailPanel
                isOpen={currentPanel === "record"}
                onClose={handleClose}
                title={`Asset Details ${recordId ? `(${recordId})` : ""}`}
                fields={[{ label: "Status", value: "Record detail panel coming soon." }]}
            />
        </>
    );
}
