"use client";

import { MasterDataCreatePanel } from "@/components/features/master-data/master-data-create-panel";
import { MasterDataRecordPanel } from "@/components/features/master-data/master-data-record-panel";

import type {
    MasterDataBrandRow,
    MasterDataCategoryRow,
    MasterDataDepartmentRow,
    MasterDataDeviceModelRow,
    MasterDataLocationRow,
    MasterDataVendorRow,
} from "./master-data-management-client";

interface MasterDataPanelsProps {
    currentPanel?: string;
    panelAnimation?: string;
    entity?: string;
    recordId?: string;
    recordMode?: string;
    closePanelUrl: string;
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    departments: MasterDataDepartmentRow[];
}

export function MasterDataPanels({
    currentPanel,
    panelAnimation,
    entity,
    recordId,
    recordMode,
    closePanelUrl,
    categories,
    locations,
    brands,
    deviceModels,
    vendors,
    departments,
}: MasterDataPanelsProps) {
    const disableTransition = panelAnimation === "0";

    return (
        <>
            <MasterDataCreatePanel
                key={`master-data-create-${currentPanel === "create" ? "open" : "closed"}-${entity ?? "none"}`}
                isOpen={currentPanel === "create"}
                onCloseUrl={closePanelUrl}
                entity={entity}
                categories={categories}
                brands={brands}
                disableTransition={disableTransition}
            />

            <MasterDataRecordPanel
                key={`master-data-record-${currentPanel === "record" ? "open" : "closed"}-${entity ?? "none"}-${recordId ?? "none"}-${recordMode ?? "detail"}`}
                isOpen={currentPanel === "record"}
                onCloseUrl={closePanelUrl}
                entity={entity}
                recordId={recordId}
                initialMode={recordMode}
                categories={categories}
                locations={locations}
                brands={brands}
                deviceModels={deviceModels}
                vendors={vendors}
                departments={departments}
                disableTransition={disableTransition}
            />
        </>
    );
}
