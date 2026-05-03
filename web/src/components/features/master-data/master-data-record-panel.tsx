"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type FormEvent,
    type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Pencil, Upload } from "lucide-react";

import { deleteMasterDataRecords, updateMasterDataRecord } from "@/actions/master-data";
import {
    STATUS_COLORS,
    STATUS_THEMES,
    AVAILABLE_STATUS_ICONS,
    type StatusTheme 
} from "@/lib/constants";
import * as LucideIcons from "lucide-react";
import { CircleDot, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    INITIAL_UPDATE_MASTER_DATA_STATE,
    MASTER_DATA_RECORD_ENTITIES,
} from "@/lib/master-data/shared";
import { LOCATION_TYPE_OPTIONS } from "@/types/master-data";
import type { MasterDataRecordEntity } from "@/types/master-data";
import { DestructiveConfirmationDialog } from "@/components/shared/destructive-confirmation-dialog";
import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { tiqriToast } from "@/components/shared/sonner";
import { isModelImageFile, MODEL_IMAGE_ACCEPT } from "@/lib/file-types";

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

type PanelMode = "detail" | "edit";
type DraftValue = string | boolean;
type DraftState = Record<string, DraftValue>;

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

const ENTITY_ID_PREFIX: Record<MasterDataRecordEntity, string> = {
    locations: "LOC",
    "asset-categories": "CAT",
    brands: "BRD",
    "device-models": "MDL",
    vendors: "VND",
    owners: "OWN",
    departments: "DEP",
    statuses: "STS",
};

const PILLAR_OPTIONS = [
    { label: "IT & Digital", value: "IT & Digital" },
    { label: "Software", value: "Software" },
    { label: "Office Furniture", value: "Office Furniture" },
    { label: "Office Electronics", value: "Office Electronics" },
] as const;

const READ_ONLY_INPUT_CLASSNAME =
    "h-9 bg-slate-100 font-mono tracking-wide text-slate-700 pointer-events-none";

function isRecordEntity(value: string | undefined): value is MasterDataRecordEntity {
    return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

function normalizePanelMode(value: string | undefined): PanelMode {
    return value === "edit" ? "edit" : "detail";
}

function asString(value: DraftValue | null | undefined): string {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function asBoolean(value: DraftValue | null | undefined): boolean {
    return value === true || String(value).toLowerCase() === "true";
}

function normalizeModelTechnicalDetails(
    value: unknown
): Record<string, string> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {};
    }

    const record = value as Record<string, unknown>;
    const next: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(record)) {
        const normalizedKey = key.trim();
        if (normalizedKey.length === 0) {
            continue;
        }

        if (rawValue === null || rawValue === undefined) {
            continue;
        }

        next[normalizedKey] = String(rawValue);
    }

    return next;
}

function resolveRecordCode(
    entity: MasterDataRecordEntity,
    code: string | null | undefined,
    numericId: number
) {
    if (code && code.trim().length > 0) {
        return code;
    }

    return `${ENTITY_ID_PREFIX[entity]}-${String(numericId).padStart(4, "0")}`;
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
        case "locations":
            return sources.locations.find((row) => row.id === numericId) ?? null;
        case "asset-categories":
            return sources.categories.find((row) => row.id === numericId) ?? null;
        case "brands":
            return sources.brands.find((row) => row.id === numericId) ?? null;
        case "device-models":
            return sources.deviceModels.find((row) => row.id === numericId) ?? null;
        case "vendors":
            return sources.vendors.find((row) => row.id === numericId) ?? null;
        case "owners":
            return sources.owners.find((row) => row.id === numericId) ?? null;
        case "departments":
            return sources.departments.find((row) => row.id === numericId) ?? null;
        case "statuses":
            return sources.customStatuses.find((row) => row.id === numericId) ?? null;
    }
}

function resolveRecordTitle(record: Record<string, unknown>) {
    const titleKeys = ["name", "companyName", "categoryName", "brandName", "id"];

    for (const key of titleKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }

        if (typeof value === "number") {
            return String(value);
        }
    }

    return "Record Details";
}

function renderSchemaRows(
    title: string,
    description: string,
    rows: MasterDataCategoryRow["customSchema"]["modelSpecs"]
) {
    return (
        <div className="space-y-3 border-t pt-4">
            <div>
                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>{title}</h3>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>{description}</p>
            </div>

            {rows.length === 0 ? (
                <div className={`rounded-md bg-slate-50 px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
                    No fields defined.
                </div>
            ) : (
                <div className="rounded-md border bg-slate-50/50">
                    <div className="grid grid-cols-12 gap-4 border-b bg-slate-50 p-3 text-xs font-medium text-slate-500">
                        <div className="col-span-5">Field Name</div>
                        <div className="col-span-4">Input Type</div>
                        <div className="col-span-3">Required</div>
                    </div>
                    <div className="space-y-2 p-2">
                        {rows.map((row, index) => (
                            <div key={`${row.fieldName}-${index}`} className="grid grid-cols-12 items-center gap-4 rounded-sm bg-white p-2">
                                <div className="col-span-5 text-sm text-slate-900">{row.fieldName}</div>
                                <div className="col-span-4 text-sm text-slate-700">{row.inputType}</div>
                                <div className="col-span-3 text-sm text-slate-700">{row.required ? "Yes" : "No"}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
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
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState(INITIAL_UPDATE_MASTER_DATA_STATE);
    const [modelImageFile, setModelImageFile] = useState<File | null>(null);
    const [isModelImageDragOver, setIsModelImageDragOver] = useState(false);
    const [showModelImageUploader, setShowModelImageUploader] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
    const modelImageInputRef = useRef<HTMLInputElement>(null);

    const normalizedEntity = isRecordEntity(entity) ? entity : null;
    const numericRecordId = Number(recordId);

    const selectedRecord = useMemo(() => {
        if (!normalizedEntity || !Number.isFinite(numericRecordId)) {
            return null;
        }

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
    }, [
        brands,
        categories,
        departments,
        deviceModels,
        locations,
        normalizedEntity,
        numericRecordId,
        owners,
        vendors,
        customStatuses,
    ]);
    const linkedAssetsCount = selectedRecord?.linkedAssets ?? 0;

    const initialDraft = useMemo<DraftState>(() => {
        if (!selectedRecord || !normalizedEntity) {
            return {};
        }

        const nextDraft: DraftState = {};

        switch (normalizedEntity) {
            case "locations": {
                const location = selectedRecord as MasterDataLocationRow;
                nextDraft.name = location.name;
                nextDraft.type = location.type ?? "";
                nextDraft.parentId = location.parentId ? String(location.parentId) : "none";
                nextDraft.isActive = location.isActive;
                break;
            }
            case "asset-categories": {
                const category = selectedRecord as MasterDataCategoryRow;
                nextDraft.name = category.name;
                nextDraft.prefix = category.prefix;
                nextDraft.pillar = category.pillar;
                nextDraft.isActive = category.isActive;
                break;
            }
            case "brands": {
                const brand = selectedRecord as MasterDataBrandRow;
                nextDraft.name = brand.name;
                nextDraft.isActive = brand.isActive;
                break;
            }
            case "device-models": {
                const model = selectedRecord as MasterDataDeviceModelRow;
                nextDraft.name = model.name;
                nextDraft.brandId = String(model.brandId);
                nextDraft.categoryId = String(model.categoryId);
                nextDraft.imageUrl = model.imageUrl ?? "";
                nextDraft.pillar = model.pillar;
                nextDraft.isActive = model.isActive;
                break;
            }
            case "vendors": {
                const vendor = selectedRecord as MasterDataVendorRow;
                nextDraft.companyName = vendor.companyName;
                nextDraft.email = vendor.email ?? "";
                nextDraft.phone = vendor.phone ?? "";
                nextDraft.website = vendor.website ?? "";
                nextDraft.isActive = vendor.isActive;
                break;
            }
            case "departments": {
                const department = selectedRecord as MasterDataDepartmentRow;
                nextDraft.name = department.name;
                nextDraft.shortCode = department.shortCode;
                nextDraft.costCenterId = department.costCenterId;
                nextDraft.isActive = department.isActive;
                break;
            }
            case "owners": {
                const owner = selectedRecord as MasterDataOwnerRow;
                nextDraft.companyName = owner.companyName;
                nextDraft.isActive = owner.isActive;
                break;
            }
            case "statuses": {
                const status = selectedRecord as MasterDataCustomStatusRow;
                nextDraft.name = status.name;
                nextDraft.iconName = status.iconName;
                nextDraft.colorTheme = status.colorTheme;
                nextDraft.isActive = status.isActive;
                break;
            }
        }

        return nextDraft;
    }, [normalizedEntity, selectedRecord]);

    const initialModelSpecValues = useMemo<Record<string, string>>(() => {
        if (!selectedRecord || normalizedEntity !== "device-models") {
            return {};
        }

        const model = selectedRecord as MasterDataDeviceModelRow;
        return normalizeModelTechnicalDetails(model.technicalDetails);
    }, [normalizedEntity, selectedRecord]);

    const [mode, setMode] = useState<PanelMode>(normalizePanelMode(initialMode));
    const [draft, setDraft] = useState<DraftState>(initialDraft);
    const [modelSpecValues, setModelSpecValues] = useState<Record<string, string>>(
        initialModelSpecValues
    );

    useEffect(() => {
        let cancelled = false;

        queueMicrotask(() => {
            if (cancelled) {
                return;
            }

            setState(INITIAL_UPDATE_MASTER_DATA_STATE);
            setMode(normalizePanelMode(initialMode));
            setDraft(initialDraft);
            setModelSpecValues(initialModelSpecValues);
            setModelImageFile(null);
            setIsModelImageDragOver(false);
            setShowModelImageUploader(false);
            if (modelImageInputRef.current) {
                modelImageInputRef.current.value = "";
            }
        });

        return () => {
            cancelled = true;
        };
    }, [initialDraft, initialModelSpecValues, initialMode]);

    const fieldError = useCallback(
        (fieldName: string) => state.errors?.[fieldName]?.[0],
        [state.errors]
    );

    const setDraftField = useCallback((key: string, value: DraftValue) => {
        setDraft((previous) => ({
            ...previous,
            [key]: value,
        }));
    }, []);

    const isDetailMode = mode === "detail";

    const locationParentOptions = useMemo(
        () =>
            locations
                .filter((location) => location.id !== numericRecordId)
                .sort((left, right) => left.name.localeCompare(right.name)),
        [locations, numericRecordId]
    );

    const parentLocationLabel = useMemo(() => {
        const parentIdValue = asString(draft.parentId);
        if (parentIdValue.length === 0 || parentIdValue === "none") {
            return "None (Building)";
        }

        const parentId = Number(parentIdValue);
        const location = locations.find((item) => item.id === parentId);
        return location?.name ?? "Unknown";
    }, [draft.parentId, locations]);

    const modelPillar = asString(draft.pillar) || "IT & Digital";
    const selectedModelCategoryId = asString(draft.categoryId);

    const categoryOptionsForModel = useMemo(
        () => categories.filter((category) => category.pillar === modelPillar),
        [categories, modelPillar]
    );

    const selectedModelCategory = useMemo(
        () =>
            categories.find(
                (category) => String(category.id) === selectedModelCategoryId
            ) ?? null,
        [categories, selectedModelCategoryId]
    );

    const selectedModelSpecs = useMemo(
        () => selectedModelCategory?.customSchema.modelSpecs ?? [],
        [selectedModelCategory]
    );

    const selectedModelImageUrl = asString(draft.imageUrl);

    const modelImagePreviewUrl = useMemo(
        () => (modelImageFile ? URL.createObjectURL(modelImageFile) : null),
        [modelImageFile]
    );

    useEffect(() => {
        return () => {
            if (modelImagePreviewUrl) {
                URL.revokeObjectURL(modelImagePreviewUrl);
            }
        };
    }, [modelImagePreviewUrl]);

    const displayModelImageUrl = modelImagePreviewUrl ?? selectedModelImageUrl;
    const hasSelectedModelImage = displayModelImageUrl.trim().length > 0;

    const technicalDetailsPayload = useMemo(() => {
        const payload: Record<string, string> = {};

        for (const spec of selectedModelSpecs) {
            const key = spec.fieldName.trim();
            if (key.length === 0) {
                continue;
            }

            const rawValue = modelSpecValues[spec.fieldName];

            if (spec.inputType === "Boolean") {
                payload[spec.fieldName] = rawValue === "true" ? "true" : "false";
                continue;
            }

            const normalizedValue = String(rawValue ?? "").trim();
            if (normalizedValue.length > 0) {
                payload[spec.fieldName] = normalizedValue;
            }
        }

        return payload;
    }, [modelSpecValues, selectedModelSpecs]);

    const setModelSpecValue = useCallback((fieldName: string, value: string) => {
        setModelSpecValues((previous) => ({
            ...previous,
            [fieldName]: value,
        }));
    }, []);

    const panelTitle = useMemo(() => {
        if (!normalizedEntity || !selectedRecord) {
            return "Record Details";
        }

        const record = selectedRecord as Record<string, unknown>;
        const heading = resolveRecordTitle(record);

        return `${ENTITY_LABELS[normalizedEntity]}: ${heading}`;
    }, [normalizedEntity, selectedRecord]);

    const panelDescription = isDetailMode
        ? "Review the selected row details."
        : "Edit and save changes for this record.";

    const handleClose = useCallback(
        (open: boolean) => {
            if (!open) {
                setMode("detail");
                setState(INITIAL_UPDATE_MASTER_DATA_STATE);
                setDraft(initialDraft);
                setModelSpecValues(initialModelSpecValues);
                setModelImageFile(null);
                setIsModelImageDragOver(false);
                setShowModelImageUploader(false);
                if (modelImageInputRef.current) {
                    modelImageInputRef.current.value = "";
                }
                router.push(onCloseUrl, { scroll: false });
            }
        },
        [initialDraft, initialModelSpecValues, onCloseUrl, router]
    );

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            if (normalizedEntity === "device-models") {
                if (modelImageFile) {
                    formData.set("modelImage", modelImageFile);
                } else {
                    formData.delete("modelImage");
                }
            }

            startTransition(async () => {
                const result = await updateMasterDataRecord(
                    INITIAL_UPDATE_MASTER_DATA_STATE,
                    formData
                );

                setState(result);

                if (result.success) {
                    tiqriToast.success(result.message);
                    setMode("detail");
                    router.refresh();
                    return;
                }

                tiqriToast.error(result.message);
            });
        },
        [modelImageFile, normalizedEntity, router]
    );

    const handleModelImageSelection = useCallback((files: FileList | null) => {
        const selectedFile = files?.[0] ?? null;

        if (selectedFile && !isModelImageFile(selectedFile)) {
            tiqriToast.error("Upload a valid image file (PNG, JPG, JPEG, WEBP, GIF, BMP, SVG, or AVIF).");
            if (modelImageInputRef.current) {
                modelImageInputRef.current.value = "";
            }
            setModelImageFile(null);
            setIsModelImageDragOver(false);
            return;
        }

        setModelImageFile(selectedFile);
        if (selectedFile) {
            setShowModelImageUploader(true);
        }
        setIsModelImageDragOver(false);
    }, [modelImageInputRef]);

    const handleModelImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsModelImageDragOver(false);
        handleModelImageSelection(event.dataTransfer.files);
    }, [handleModelImageSelection]);

    const clearSelectedModelImage = useCallback(() => {
        setModelImageFile(null);
        setShowModelImageUploader(false);
        if (modelImageInputRef.current) {
            modelImageInputRef.current.value = "";
        }
    }, []);

    const handleDeleteClick = useCallback(() => {
        if (!normalizedEntity || !selectedRecord) {
            return;
        }

        setDeleteDialogOpen(true);
    }, [normalizedEntity, selectedRecord]);

    const handleConfirmDelete = useCallback(async () => {
        if (!normalizedEntity || !selectedRecord) {
            return;
        }

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

    const renderRecordIdPreview = () => {
        if (!normalizedEntity || !selectedRecord || !Number.isFinite(numericRecordId)) {
            return null;
        }

        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                        {ENTITY_LABELS[normalizedEntity]} ID
                    </label>
                    <Input
                        value={resolveRecordCode(normalizedEntity, selectedRecord.code, numericRecordId)}
                        readOnly
                        tabIndex={-1}
                        onFocus={(event) => event.currentTarget.blur()}
                        className={READ_ONLY_INPUT_CLASSNAME}
                    />
                </div>
            </div>
        );
    };

    const renderTextField = (
        key: string,
        label: string,
        value: string,
        options?: {
            required?: boolean;
            readOnly?: boolean;
            placeholder?: string;
            type?: "text" | "email" | "url";
            forceReadOnlyInEdit?: boolean;
            autoUppercase?: boolean;
        }
    ) => {
        const readOnly = options?.readOnly ?? false;
        const forceReadOnlyInEdit = options?.forceReadOnlyInEdit ?? false;
        const disabledEditing = isDetailMode || forceReadOnlyInEdit;
        const className = [
            disabledEditing ? READ_ONLY_INPUT_CLASSNAME : "",
            options?.autoUppercase ? "uppercase" : "",
        ].join(" ").trim();

        return (
            <div className="space-y-2">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                    {label}
                    {options?.required && !forceReadOnlyInEdit ? (
                        <span className="text-red-500"> *</span>
                    ) : null}
                </label>
                <Input
                    name={forceReadOnlyInEdit ? undefined : key}
                    type={options?.type ?? "text"}
                    value={value}
                    placeholder={options?.placeholder}
                    readOnly={readOnly || disabledEditing}
                    tabIndex={disabledEditing ? -1 : undefined}
                    onFocus={
                        disabledEditing
                            ? (event) => event.currentTarget.blur()
                            : undefined
                    }
                    onChange={(event) => setDraftField(key, event.target.value)}
                    className={className.length > 0 ? className : undefined}
                />
                {!isDetailMode && fieldError(key) ? (
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                        {fieldError(key)}
                    </p>
                ) : null}
            </div>
        );
    };

    const renderActiveStatus = () => {
        const isActive = asBoolean(draft.isActive);

        return (
            <div className="flex items-center justify-between rounded-lg border p-4">
                {!isDetailMode ? <input type="hidden" name="isActive" value={String(isActive)} /> : null}
                <div className="space-y-0.5">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                        Active Status
                    </label>
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                        Keep this value selectable for new records.
                    </p>
                </div>
                <Switch
                    checked={isActive}
                    disabled={isDetailMode}
                    onCheckedChange={(checked) => setDraftField("isActive", checked)}
                />
            </div>
        );
    };

    const renderEntityFields = () => {
        if (!normalizedEntity || !selectedRecord) {
            return (
                <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    The selected record could not be found.
                </div>
            );
        }

        switch (normalizedEntity) {
            case "locations": {
                const typeValue = asString(draft.type);
                const parentIdValue = asString(draft.parentId) || "none";

                return (
                    <>
                        {renderRecordIdPreview()}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderTextField("name", "Location Name", asString(draft.name), {
                                required: true,
                                placeholder: "Colombo HQ",
                            })}

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Type <span className="text-red-500">*</span>
                                </label>
                                {isDetailMode ? (
                                    <Input
                                        value={typeValue || "N/A"}
                                        readOnly
                                        tabIndex={-1}
                                        onFocus={(event) => event.currentTarget.blur()}
                                        className={READ_ONLY_INPUT_CLASSNAME}
                                    />
                                ) : (
                                    <>
                                        <input type="hidden" name="type" value={typeValue} />
                                        <Select
                                            value={typeValue}
                                            onValueChange={(value) => setDraftField("type", value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select a location type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LOCATION_TYPE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}
                                {!isDetailMode && fieldError("type") ? (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {fieldError("type")}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Parent Location
                            </label>
                            {isDetailMode ? (
                                <Input
                                    value={parentLocationLabel}
                                    readOnly
                                    tabIndex={-1}
                                    onFocus={(event) => event.currentTarget.blur()}
                                    className={READ_ONLY_INPUT_CLASSNAME}
                                />
                            ) : (
                                <>
                                    <input
                                        type="hidden"
                                        name="parentId"
                                        value={parentIdValue === "none" ? "" : parentIdValue}
                                    />
                                    <Select
                                        value={parentIdValue}
                                        onValueChange={(value) => setDraftField("parentId", value)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None (Building)</SelectItem>
                                            {locationParentOptions.map((location) => (
                                                <SelectItem key={location.id} value={String(location.id)}>
                                                    {location.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </>
                            )}
                            {!isDetailMode && fieldError("parentId") ? (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {fieldError("parentId")}
                                </p>
                            ) : null}
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "asset-categories": {
                const category = selectedRecord as MasterDataCategoryRow;
                const pillarValue = asString(draft.pillar);

                return (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {normalizedEntity && selectedRecord && Number.isFinite(numericRecordId) && (
                                <div className="space-y-2">
                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                        {ENTITY_LABELS[normalizedEntity]} ID
                                    </label>
                                    <Input
                                        value={resolveRecordCode(normalizedEntity, selectedRecord.code, numericRecordId)}
                                        readOnly
                                        tabIndex={-1}
                                        onFocus={(event) => event.currentTarget.blur()}
                                        className={READ_ONLY_INPUT_CLASSNAME}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Type
                                </label>
                                {isDetailMode ? (
                                    <Input
                                        value={pillarValue}
                                        readOnly
                                        tabIndex={-1}
                                        onFocus={(event) => event.currentTarget.blur()}
                                        className={READ_ONLY_INPUT_CLASSNAME}
                                    />
                                ) : (
                                    <>
                                        <input type="hidden" name="pillar" value={pillarValue} />
                                        <Select
                                            value={pillarValue}
                                            onValueChange={(value) => setDraftField("pillar", value)}
                                        >
                                            <SelectTrigger className="h-9 w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PILLAR_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}
                                {!isDetailMode && fieldError("pillar") ? (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {fieldError("pillar")}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderTextField("name", "Category Name", asString(draft.name), {
                                required: true,
                                placeholder: "Wireless Keyboards",
                            })}

                            {renderTextField("prefix", "Prefix Code", asString(draft.prefix), {
                                required: true,
                                placeholder: "WKE",
                                autoUppercase: true,
                                readOnly: true,
                            })}
                        </div>

                        {renderSchemaRows(
                            "Model Specifications (Common)",
                            "Fields used when creating models.",
                            category.customSchema.modelSpecs
                        )}

                        {renderSchemaRows(
                            "Asset Tracking Fields (Unique)",
                            "Fields captured for each physical asset instance.",
                            category.customSchema.assetTracking
                        )}

                        {renderActiveStatus()}
                    </>
                );
            }

            case "brands": {
                const brand = selectedRecord as MasterDataBrandRow;

                return (
                    <>
                        {renderRecordIdPreview()}

                        {renderTextField("name", "Brand Name", asString(draft.name), {
                            required: true,
                            placeholder: "Apple",
                        })}

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Linked Assets
                            </label>
                            <Input
                                value={`${brand.linkedAssets} Assets`}
                                readOnly
                                tabIndex={-1}
                                onFocus={(event) => event.currentTarget.blur()}
                                className={READ_ONLY_INPUT_CLASSNAME}
                            />
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "device-models": {
                const brandIdValue = asString(draft.brandId);
                const categoryIdValue = asString(draft.categoryId);

                return (
                    <>
                        {!isDetailMode ? (
                            <input
                                type="hidden"
                                name="technicalDetails"
                                value={JSON.stringify(technicalDetailsPayload)}
                            />
                        ) : null}

                        {renderRecordIdPreview()}

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Type
                            </label>
                            {isDetailMode ? (
                                <Input
                                    value={modelPillar}
                                    readOnly
                                    tabIndex={-1}
                                    onFocus={(event) => event.currentTarget.blur()}
                                    className={READ_ONLY_INPUT_CLASSNAME}
                                />
                            ) : (
                                <Select
                                    value={modelPillar}
                                    onValueChange={(value) => {
                                        setDraftField("pillar", value);

                                        const nextOptions = categories.filter(
                                            (category) => category.pillar === value
                                        );

                                        if (
                                            !nextOptions.some(
                                                (category) =>
                                                    String(category.id) === asString(draft.categoryId)
                                            )
                                        ) {
                                            setDraftField("categoryId", "");
                                            setModelSpecValues({});
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-full md:w-56">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PILLAR_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Model Image
                            </label>
                            {isDetailMode ? (
                                <div className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2">
                                    <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border bg-white">
                                        {hasSelectedModelImage ? (
                                            <Image
                                                src={displayModelImageUrl}
                                                alt={`${asString(draft.name) || "Model"} image`}
                                                width={112}
                                                height={80}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlus className="h-5 w-5 text-slate-400" />
                                        )}
                                    </div>
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
                                        {hasSelectedModelImage ? "Image uploaded" : "No image available"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 rounded-lg border bg-slate-50 px-3 py-2">
                                    <input type="hidden" name="imageUrl" value={selectedModelImageUrl} />

                                    <div className="flex items-center gap-3">
                                        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border bg-white">
                                            {hasSelectedModelImage ? (
                                                <Image
                                                    src={displayModelImageUrl}
                                                    alt={`${asString(draft.name) || "Model"} image`}
                                                    width={112}
                                                    height={80}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <ImagePlus className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} truncate text-slate-600`}>
                                                {modelImageFile ? modelImageFile.name : hasSelectedModelImage ? "Current image" : "No image selected"}
                                            </p>
                                            <button
                                                type="button"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => {
                                                    setShowModelImageUploader(true);
                                                    modelImageInputRef.current?.click();
                                                }}
                                                aria-label="Change model image"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <Input
                                        ref={modelImageInputRef}
                                        name="modelImage"
                                        type="file"
                                        accept={MODEL_IMAGE_ACCEPT}
                                        className="hidden"
                                        onChange={(event) => handleModelImageSelection(event.target.files)}
                                    />

                                    {showModelImageUploader ? (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => modelImageInputRef.current?.click()}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    modelImageInputRef.current?.click();
                                                }
                                            }}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setIsModelImageDragOver(true);
                                            }}
                                            onDragLeave={() => setIsModelImageDragOver(false)}
                                            onDrop={handleModelImageDrop}
                                            className={`cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors ${isModelImageDragOver
                                                ? "border-primary bg-primary/5"
                                                : "border-slate-300 bg-white hover:border-slate-400"
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <Upload className="h-5 w-5 text-slate-500" />
                                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                                    Drag and drop a replacement image, or click to browse
                                                </p>
                                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                                                    PNG, JPG, WEBP or GIF. Maximum file size: 4.5MB.
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {modelImageFile ? (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={clearSelectedModelImage}
                                                className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-600 hover:text-slate-900`}
                                            >
                                                Remove selected file
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                            {!isDetailMode && fieldError("imageUrl") ? (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {fieldError("imageUrl")}
                                </p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Brand <span className="text-red-500">*</span>
                                </label>
                                {isDetailMode ? (
                                    <Input
                                        value={
                                            brands.find((brand) => String(brand.id) === brandIdValue)?.name ??
                                            "N/A"
                                        }
                                        readOnly
                                        tabIndex={-1}
                                        onFocus={(event) => event.currentTarget.blur()}
                                        className={READ_ONLY_INPUT_CLASSNAME}
                                    />
                                ) : (
                                    <>
                                        <input type="hidden" name="brandId" value={brandIdValue} />
                                        <Select
                                            value={brandIdValue}
                                            onValueChange={(value) => setDraftField("brandId", value)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select a brand" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brands.map((brand) => (
                                                    <SelectItem key={brand.id} value={String(brand.id)}>
                                                        {brand.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}
                                {!isDetailMode && fieldError("brandId") ? (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {fieldError("brandId")}
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Category <span className="text-red-500">*</span>
                                </label>
                                {isDetailMode ? (
                                    <Input
                                        value={
                                            categories.find(
                                                (category) => String(category.id) === categoryIdValue
                                            )?.name ?? "N/A"
                                        }
                                        readOnly
                                        tabIndex={-1}
                                        onFocus={(event) => event.currentTarget.blur()}
                                        className={READ_ONLY_INPUT_CLASSNAME}
                                    />
                                ) : (
                                    <>
                                        <input type="hidden" name="categoryId" value={categoryIdValue} />
                                        <Select
                                            value={categoryIdValue}
                                            onValueChange={(value) => {
                                                setDraftField("categoryId", value);
                                                const selectedCategory = categories.find(
                                                    (category) => String(category.id) === value
                                                );
                                                if (selectedCategory) {
                                                    setDraftField("pillar", selectedCategory.pillar);
                                                }
                                                setModelSpecValues({});
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categoryOptionsForModel.map((category) => (
                                                    <SelectItem key={category.id} value={String(category.id)}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}
                                {!isDetailMode && fieldError("categoryId") ? (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {fieldError("categoryId")}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {renderTextField("name", "Model Name", asString(draft.name), {
                            required: true,
                            placeholder: "ThinkPad T14",
                        })}

                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                                    Model Specifications
                                </h3>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                                    Fields below are sourced from common section of the selected Category.
                                </p>
                            </div>

                            {!selectedModelCategory ? (
                                <div className={`rounded-md bg-slate-50 px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
                                    Select a category to load model specification fields.
                                </div>
                            ) : null}

                            {selectedModelCategory && selectedModelSpecs.length === 0 ? (
                                <div className={`rounded-md bg-slate-50 px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
                                    This category has no model specification fields yet.
                                </div>
                            ) : null}

                            {selectedModelSpecs.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {selectedModelSpecs.map((spec) => {
                                        const fieldValue = modelSpecValues[spec.fieldName] ?? "";

                                        if (spec.inputType === "Boolean") {
                                            const checked = fieldValue === "true";

                                            if (isDetailMode) {
                                                return (
                                                    <div key={spec.fieldName} className="space-y-2">
                                                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                                            {spec.fieldName}
                                                        </label>
                                                        <Input
                                                            value={checked ? "Yes" : "No"}
                                                            readOnly
                                                            tabIndex={-1}
                                                            onFocus={(event) => event.currentTarget.blur()}
                                                            className={READ_ONLY_INPUT_CLASSNAME}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={spec.fieldName} className="space-y-2">
                                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                                        {spec.fieldName}
                                                        {spec.required ? <span className="text-red-500"> *</span> : null}
                                                    </label>
                                                    <div className="flex h-10 items-center justify-between rounded-md border border-border px-3">
                                                        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                                            {checked ? "Yes" : "No"}
                                                        </span>
                                                        <Switch
                                                            checked={checked}
                                                            onCheckedChange={(value) =>
                                                                setModelSpecValue(
                                                                    spec.fieldName,
                                                                    value ? "true" : "false"
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (isDetailMode) {
                                            return (
                                                <div key={spec.fieldName} className="space-y-2">
                                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                                        {spec.fieldName}
                                                    </label>
                                                    <Input
                                                        value={fieldValue.length > 0 ? fieldValue : "N/A"}
                                                        readOnly
                                                        tabIndex={-1}
                                                        onFocus={(event) => event.currentTarget.blur()}
                                                        className={READ_ONLY_INPUT_CLASSNAME}
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={spec.fieldName} className="space-y-2">
                                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                                    {spec.fieldName}
                                                    {spec.required ? <span className="text-red-500"> *</span> : null}
                                                </label>
                                                <Input
                                                    type={
                                                        spec.inputType === "Number"
                                                            ? "number"
                                                            : spec.inputType === "Date"
                                                                ? "date"
                                                                : "text"
                                                    }
                                                    value={fieldValue}
                                                    onChange={(event) =>
                                                        setModelSpecValue(
                                                            spec.fieldName,
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={
                                                        spec.inputType === "Dropdown"
                                                            ? "Enter option value"
                                                            : `Enter ${spec.fieldName}`
                                                    }
                                                    required={spec.required}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {!isDetailMode && fieldError("technicalDetails") ? (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {fieldError("technicalDetails")}
                                </p>
                            ) : null}
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "vendors": {
                return (
                    <>
                        {renderRecordIdPreview()}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderTextField("companyName", "Vendor Name", asString(draft.companyName), {
                                required: true,
                                placeholder: "Acme Supplies",
                            })}

                            {renderTextField("email", "Email", asString(draft.email), {
                                placeholder: "ops@acme.com",
                                type: "email",
                            })}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderTextField("phone", "Phone", asString(draft.phone), {
                                placeholder: "+94 11 555 0000",
                            })}

                            {renderTextField("website", "Website", asString(draft.website), {
                                placeholder: "https://acme.com",
                                type: "url",
                            })}
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "departments": {
                return (
                    <>
                        {renderRecordIdPreview()}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {renderTextField("name", "Department Name", asString(draft.name), {
                                required: true,
                                placeholder: "Finance",
                            })}

                            {renderTextField("shortCode", "Department Code", asString(draft.shortCode), {
                                required: true,
                                placeholder: "FIN",
                                autoUppercase: true,
                            })}
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Cost Center ID
                            </label>
                            {!isDetailMode ? (
                                <input type="hidden" name="costCenterId" value={asString(draft.costCenterId)} />
                            ) : null}
                            <Input
                                value={asString(draft.costCenterId)}
                                readOnly
                                tabIndex={-1}
                                onFocus={(event) => event.currentTarget.blur()}
                                className={READ_ONLY_INPUT_CLASSNAME}
                            />
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "owners": {
                const owner = selectedRecord as MasterDataOwnerRow;

                return (
                    <>
                        {renderRecordIdPreview()}

                        {renderTextField("companyName", "Owner Name", asString(draft.companyName), {
                            required: true,
                            placeholder: "TIQRI LK",
                        })}

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Linked Assets
                            </label>
                            <Input
                                value={`${owner.linkedAssets} Assets`}
                                readOnly
                                tabIndex={-1}
                                onFocus={(event) => event.currentTarget.blur()}
                                className={READ_ONLY_INPUT_CLASSNAME}
                            />
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }

            case "statuses": {
                const iconName = asString(draft.iconName);
                const colorTheme = asString(draft.colorTheme) as StatusTheme;

                return (
                    <>
                        {renderRecordIdPreview()}

                        <div className="space-y-4">
                            {renderTextField("name", "Status Name", asString(draft.name), {
                                required: true,
                                placeholder: "e.g., In Transit",
                            })}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                        Status Icon {!isDetailMode && <span className="text-red-500"> *</span>}
                                    </label>
                                    {isDetailMode ? (
                                        <div className="flex items-center gap-2 h-9 border rounded-md px-3 bg-slate-100">
                                            {(() => {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                const Icon = (LucideIcons as any)[iconName] as LucideIcon;
                                                return Icon ? <Icon className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />;
                                            })()}
                                            <span className="text-sm text-slate-700">{iconName}</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={iconName}
                                            onValueChange={(val) => setDraftField("iconName", val)}
                                            name="iconName"
                                        >
                                            <SelectTrigger className="h-9">
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        const Icon = (LucideIcons as any)[iconName] as LucideIcon;
                                                        return Icon ? <Icon className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />;
                                                    })()}
                                                    <SelectValue placeholder="Select an icon" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="grid grid-cols-4 gap-1 p-1 max-h-60 overflow-y-auto">
                                                    {AVAILABLE_STATUS_ICONS.map((icon) => {
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        const Icon = (LucideIcons as any)[icon] as LucideIcon;
                                                        return (
                                                            <SelectItem 
                                                                key={icon} 
                                                                value={icon}
                                                                className="flex items-center justify-center p-2 hover:bg-slate-100 cursor-pointer rounded"
                                                            >
                                                                {Icon ? <Icon className="h-5 w-5" /> : <span>{icon}</span>}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {!isDetailMode && fieldError("iconName") && (
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                            {fieldError("iconName")}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                        Status Theme {!isDetailMode && <span className="text-red-500"> *</span>}
                                    </label>
                                    {isDetailMode ? (
                                        <div className={cn("flex items-center gap-2 h-9 border rounded-md px-3 bg-slate-100")}>
                                            <div className={cn("h-4 w-4 rounded-full border", STATUS_THEMES[colorTheme] || "bg-slate-200")} />
                                            <span className="text-sm text-slate-700 capitalize">{colorTheme}</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={colorTheme}
                                            onValueChange={(val) => setDraftField("colorTheme", val)}
                                            name="colorTheme"
                                        >
                                            <SelectTrigger className="h-9">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-4 w-4 rounded-full border", STATUS_THEMES[colorTheme] || "bg-slate-200")} />
                                                    <SelectValue placeholder="Select a theme" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_COLORS.map((theme) => (
                                                    <SelectItem key={theme.value} value={theme.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("h-4 w-4 rounded-full border", STATUS_THEMES[theme.value as StatusTheme])} />
                                                            <span>{theme.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {!isDetailMode && fieldError("colorTheme") && (
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                            {fieldError("colorTheme")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {renderActiveStatus()}
                    </>
                );
            }
        }
    };

    const detailContent = (
        <div className="space-y-4">
            {renderEntityFields()}
        </div>
    );

    const formContent = (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="entity" value={normalizedEntity ?? ""} />
            <input
                type="hidden"
                name="id"
                value={Number.isFinite(numericRecordId) ? String(numericRecordId) : ""}
            />

            {renderEntityFields()}

            {state.message && !state.success ? (
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                    {state.message}
                </p>
            ) : null}
        </form>
    );

    const actions: SlidePanelAction[] = isDetailMode
        ? [
            {
                id: "close",
                label: "Close",
                variant: "outline",
                onClick: () => handleClose(false),
            },
            {
                id: "delete",
                label: "Delete",
                variant: "destructive",
                onClick: handleDeleteClick,
                disabled: isPending || isDeleteInProgress || !selectedRecord,
            },
            {
                id: "edit",
                label: "Edit",
                onClick: () => {
                    setDraft(initialDraft);
                    setModelSpecValues(initialModelSpecValues);
                    setState(INITIAL_UPDATE_MASTER_DATA_STATE);
                    setMode("edit");
                },
                disabled: !selectedRecord,
            },
        ]
        : [
            {
                id: "cancel",
                label: "Cancel",
                variant: "outline",
                onClick: () => {
                    setDraft(initialDraft);
                    setModelSpecValues(initialModelSpecValues);
                    setState(INITIAL_UPDATE_MASTER_DATA_STATE);
                    setMode("detail");
                },
                disabled: isPending,
            },
            {
                id: "save",
                label: isPending ? "Saving..." : "Save Changes",
                onClick: () => formRef.current?.requestSubmit(),
                disabled: isPending || !selectedRecord,
            },
        ];

    const getRecordDisplayName = (): string => {
        if (!selectedRecord) return "Record";
        type RecordWithName = typeof selectedRecord & { name?: string; companyName?: string };
        const record = selectedRecord as RecordWithName;
        const recordName = record.name || record.companyName || "Record";
        return recordName;
    };

    const getEntityLabel = (): string => {
        if (!normalizedEntity) return "Record";
        const labels: Record<MasterDataRecordEntity, string> = {
            "asset-categories": "Category",
            "device-models": "Device Model",
            locations: "Location",
            brands: "Brand",
            vendors: "Vendor",
            owners: "Owner",
            departments: "Department",
            statuses: "Status",
        };
        return labels[normalizedEntity] || "Record";
    };

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                disableTransition={disableTransition}
                onClose={handleClose}
                title={panelTitle}
                description={panelDescription}
                content={isDetailMode ? detailContent : formContent}
                actions={actions}
            />

            <DestructiveConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={`Delete ${getEntityLabel()}`}
                description={
                    linkedAssetsCount > 0
                        ? `Cannot delete this record because it still has ${linkedAssetsCount} linked asset${linkedAssetsCount > 1 ? "s" : ""}. Please unlink these assets first.`
                        : `Are you sure you want to delete this record? This action cannot be undone.`
                }
                itemsToDelete={
                    selectedRecord && normalizedEntity
                        ? [{
                            id: resolveRecordCode(normalizedEntity, selectedRecord.code, selectedRecord.id),
                            name: getRecordDisplayName(),
                        }]
                        : []
                }
                columns={[
                    { key: "id", label: "Code", width: "w-1/3" },
                    { key: "name", label: "Name", width: "w-2/3" },
                ]}
                canDelete={linkedAssetsCount === 0}
                errorItemIds={
                    linkedAssetsCount > 0 && normalizedEntity && selectedRecord
                        ? [resolveRecordCode(normalizedEntity, selectedRecord.code, selectedRecord.id)]
                        : []
                }
                errorMessage={
                    linkedAssetsCount > 0
                        ? `This record has ${linkedAssetsCount} linked asset${linkedAssetsCount > 1 ? "s" : ""} and cannot be deleted.`
                        : undefined
                }
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                isLoading={isDeleteInProgress}
                deleteButtonLabel="Delete"
                cancelButtonLabel="Cancel"
            />
        </>
    );
}
