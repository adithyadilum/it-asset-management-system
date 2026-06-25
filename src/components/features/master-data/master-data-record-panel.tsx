"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { deleteMasterDataRecords, updateMasterDataRecord } from "@/actions/master-data";
import {
    INITIAL_UPDATE_MASTER_DATA_STATE,
    MASTER_DATA_RECORD_ENTITIES,
} from "@/lib/master-data/shared";
import type { MasterDataRecordEntity } from "@/types/master-data";
import { DestructiveConfirmationDialog } from "@/components/shared/destructive-confirmation-dialog";
import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { tiqriToast } from "@/components/shared/sonner";

import type {
    MasterDataBrandRow,
    MasterDataCategoryRow,
    MasterDataDepartmentRow,
    MasterDataDeviceModelRow,
    MasterDataLocationRow,
    MasterDataOwnerRow,
    MasterDataVendorRow,
    MasterDataCustomStatusRow,
} from "./master-data-management-client";

import { LocationForm } from "./forms/location-form";
import { CategoryForm } from "./forms/category-form";
import { BrandForm } from "./forms/brand-form";
import { DeviceModelForm } from "./forms/device-model-form";
import { VendorForm } from "./forms/vendor-form";
import { OwnerForm } from "./forms/owner-form";
import { DepartmentForm } from "./forms/department-form";
import { StatusForm } from "./forms/status-form";
import type { MasterDataFormRef } from "./forms/shared";

type PanelMode = "detail" | "edit";

interface MasterDataRecordPanelProps {
    isOpen: boolean;
    onCloseUrl: string;
    disableTransition?: boolean;
    entity?: string;
    recordId?: string;
    initialMode?: string;
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    owners: MasterDataOwnerRow[];
    departments: MasterDataDepartmentRow[];
    customStatuses: MasterDataCustomStatusRow[];
}

const ENTITY_LABELS: Record<MasterDataRecordEntity, string> = {
    locations: "Location",
    "asset-categories": "Category",
    brands: "Brand",
    "device-models": "Model",
    vendors: "Vendor",
    owners: "Owner",
    departments: "Department",
    statuses: "Status",
};

function isRecordEntity(value: string | undefined): value is MasterDataRecordEntity {
    return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

function normalizePanelMode(value: string | undefined): PanelMode {
    return value === "edit" ? "edit" : "detail";
}

function resolveRecordByEntity(
    entity: MasterDataRecordEntity,
    numericId: number,
    sources: {
        categories: MasterDataCategoryRow[];
        locations: MasterDataLocationRow[];
        brands: MasterDataBrandRow[];
        deviceModels: MasterDataDeviceModelRow[];
        vendors: MasterDataVendorRow[];
        owners: MasterDataOwnerRow[];
        departments: MasterDataDepartmentRow[];
        customStatuses: MasterDataCustomStatusRow[];
    }
) {
    switch (entity) {
        case "locations": return sources.locations.find((row) => row.id === numericId) ?? null;
        case "asset-categories": return sources.categories.find((row) => row.id === numericId) ?? null;
        case "brands": return sources.brands.find((row) => row.id === numericId) ?? null;
        case "device-models": return sources.deviceModels.find((row) => row.id === numericId) ?? null;
        case "vendors": return sources.vendors.find((row) => row.id === numericId) ?? null;
        case "owners": return sources.owners.find((row) => row.id === numericId) ?? null;
        case "departments": return sources.departments.find((row) => row.id === numericId) ?? null;
        case "statuses": return sources.customStatuses.find((row) => row.id === numericId) ?? null;
    }
}

function resolveRecordTitle(record: Record<string, unknown>) {
    const titleKeys = ["name", "companyName", "categoryName", "brandName", "id"];
    for (const key of titleKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) return value;
        if (typeof value === "number") return String(value);
    }
    return "Record Details";
}

export function MasterDataRecordPanel({
    isOpen,
    onCloseUrl,
    disableTransition = false,
    entity,
    recordId,
    initialMode,
    categories,
    locations,
    brands,
    deviceModels,
    vendors,
    owners,
    departments,
    customStatuses,
}: MasterDataRecordPanelProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const customFormRef = useRef<MasterDataFormRef>(null);
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState(INITIAL_UPDATE_MASTER_DATA_STATE);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
    const [mode, setMode] = useState<PanelMode>(normalizePanelMode(initialMode));
    const [isDirty, setIsDirty] = useState(false);

    const normalizedEntity = isRecordEntity(entity) ? entity : null;
    const numericRecordId = Number(recordId);

    const selectedRecord = useMemo(() => {
        if (!normalizedEntity || !Number.isFinite(numericRecordId)) return null;
        return resolveRecordByEntity(normalizedEntity, numericRecordId, {
            categories,
            locations,
            brands,
            deviceModels,
            vendors,
            owners,
            departments,
            customStatuses,
        });
    }, [brands, categories, departments, deviceModels, locations, normalizedEntity, numericRecordId, owners, vendors, customStatuses]);

    const linkedAssetsCount = selectedRecord?.linkedAssets ?? 0;
    const isDetailMode = mode === "detail";

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            setState(INITIAL_UPDATE_MASTER_DATA_STATE);
            setMode(normalizePanelMode(initialMode));
            setIsDirty(false);
        });
        return () => { cancelled = true; };
    }, [initialMode, selectedRecord]);

    const fieldError = useCallback((fieldName: string) => state.errors?.[fieldName]?.[0], [state.errors]);

    const panelTitle = useMemo(() => {
        if (!normalizedEntity || !selectedRecord) return "Record Details";
        const record = selectedRecord as Record<string, unknown>;
        const heading = resolveRecordTitle(record);
        return `${ENTITY_LABELS[normalizedEntity]}: ${heading}`;
    }, [normalizedEntity, selectedRecord]);

    const panelDescription = isDetailMode
        ? "Review the selected row details."
        : "Edit and save changes for this record.";

    const handleClose = useCallback((open: boolean) => {
        if (!open) {
            setMode("detail");
            setIsDirty(false);
            setState(INITIAL_UPDATE_MASTER_DATA_STATE);
            router.push(onCloseUrl, { scroll: false });
        }
    }, [onCloseUrl, router]);

    const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (customFormRef.current?.augmentFormData) {
            customFormRef.current.augmentFormData(formData);
        }

        startTransition(async () => {
            const result = await updateMasterDataRecord(INITIAL_UPDATE_MASTER_DATA_STATE, formData);
            setState(result);
            if (result.success) {
                tiqriToast.success(result.message);
                setMode("detail");
                router.refresh();
                return;
            }
            tiqriToast.error(result.message);
        });
    }, [router]);

    const handleDeleteClick = useCallback(() => {
        if (!normalizedEntity || !selectedRecord) return;
        setDeleteDialogOpen(true);
    }, [normalizedEntity, selectedRecord]);

    const handleConfirmDelete = useCallback(async () => {
        if (!normalizedEntity || !selectedRecord) return;
        setIsDeleteInProgress(true);
        try {
            const result = await deleteMasterDataRecords(normalizedEntity, [selectedRecord.id]);
            if (result.success) {
                tiqriToast.success(result.message);
                setDeleteDialogOpen(false);
                setMode("detail");
                setState(INITIAL_UPDATE_MASTER_DATA_STATE);
                router.push(onCloseUrl, { scroll: false });
                router.refresh();
                return;
            }
            tiqriToast.warning(result.message);
        } finally {
            setIsDeleteInProgress(false);
        }
    }, [normalizedEntity, selectedRecord, onCloseUrl, router]);

    const renderEntityFields = () => {
        if (!normalizedEntity || !selectedRecord) {
            return (
                <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    The selected record could not be found.
                </div>
            );
        }

        const commonProps = {
            isDetailMode,
            fieldError,
            onDirtyStateChange: setIsDirty,
        };

        const formKey = `${normalizedEntity}-${selectedRecord.id}-${mode}`;

        switch (normalizedEntity) {
            case "locations":
                return <LocationForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataLocationRow} locations={locations} />;
            case "asset-categories":
                return <CategoryForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataCategoryRow} />;
            case "brands":
                return <BrandForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataBrandRow} />;
            case "device-models":
                return <DeviceModelForm key={formKey} {...commonProps} ref={customFormRef} initialData={selectedRecord as unknown as MasterDataDeviceModelRow} brands={brands} categories={categories} />;
            case "vendors":
                return <VendorForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataVendorRow} />;
            case "owners":
                return <OwnerForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataOwnerRow} />;
            case "departments":
                return <DepartmentForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataDepartmentRow} />;
            case "statuses":
                return <StatusForm key={formKey} {...commonProps} initialData={selectedRecord as unknown as MasterDataCustomStatusRow} />;
        }
    };

    const actions = useMemo<SlidePanelAction[]>(() => {
        if (!selectedRecord) return [];
        if (isDetailMode) {
            return [
                {
                    label: "Edit",
                    onClick: () => setMode("edit"),
                    variant: "outline",
                },
            ];
        }
        return [
            {
                label: "Cancel",
                onClick: () => setMode("detail"),
                variant: "outline",
                disabled: isPending,
            },
            {
                label: isPending ? "Saving..." : "Save Changes",
                onClick: () => {
                    formRef.current?.requestSubmit();
                },
                variant: "default",
                disabled: isPending || !isDirty,
            },
        ];
    }, [isDetailMode, isPending, selectedRecord, isDirty]);

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleClose}
                title={panelTitle}
                description={panelDescription}
                actions={actions}
                disableTransition={disableTransition}
                content={
                    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col space-y-6">
                        <input type="hidden" name="entity" value={normalizedEntity ?? ""} />
                        {selectedRecord && (
                            <input type="hidden" name="id" value={selectedRecord.id} />
                        )}

                        {renderEntityFields()}

                        {state.message && !state.success && (
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                {state.message}
                            </p>
                        )}

                        {!isDetailMode && selectedRecord && (
                            <div className="mt-8 rounded-md border border-red-200 p-4 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-red-600 dark:text-red-400 mb-1`}>
                                    Danger Zone
                                </h3>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground mb-4`}>
                                    {linkedAssetsCount > 0
                                        ? `This record cannot be deleted because it is currently linked to ${linkedAssetsCount} asset(s).`
                                        : "Permanently delete this record and remove it from the system."}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDeleteClick}
                                    disabled={linkedAssetsCount > 0 || isPending || isDeleteInProgress}
                                    className={`text-sm font-medium transition-colors
                                    ${linkedAssetsCount > 0
                                            ? "text-muted-foreground cursor-not-allowed opacity-50"
                                            : "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                        }`}
                                >
                                    Delete {normalizedEntity ? ENTITY_LABELS[normalizedEntity] : "Record"}
                                </button>
                            </div>
                        )}
                    </form>
                }
            />

            <DestructiveConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={`Delete ${normalizedEntity ? ENTITY_LABELS[normalizedEntity] : "Record"}`}
                description="Are you absolutely sure you want to delete this record? This action cannot be undone."
                itemsToDelete={selectedRecord ? [{ id: String(selectedRecord.id), name: resolveRecordTitle(selectedRecord as Record<string, unknown>) }] : []}
                columns={[
                    { key: "id", label: "ID", width: "w-24" },
                    { key: "name", label: "Name", width: "w-full" }
                ]}
                deleteButtonLabel="Delete"
                onConfirm={handleConfirmDelete}
                isLoading={isDeleteInProgress}
            />
        </>
    );
}
