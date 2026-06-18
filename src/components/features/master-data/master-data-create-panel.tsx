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
import Image from "next/image";
import { ImagePlus, Info, Pencil, Upload, CircleDot, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

import { createMasterDataRecord } from "@/actions/master-data";
import {
    INITIAL_CREATE_MASTER_DATA_STATE,
    MASTER_DATA_RECORD_ENTITIES,
    type CustomAttribute,
    createCustomAttribute,
    buildSchemaSectionPayload,
} from "@/lib/master-data/shared";
import type {
    LocationType,
    MasterDataRecordEntity,
    UpdateMasterDataState,
} from "@/types/master-data";
import { LOCATION_TYPE_OPTIONS } from "@/types/master-data";
import { FormPanel } from "@/components/shared/slide-panels/form-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { tiqriToast } from "@/components/shared/sonner";
import { isModelImageFile, MODEL_IMAGE_ACCEPT } from "@/lib/file-types";
import { EditableSchemaSection } from "./editable-schema-section";
import { ActiveStatusToggle } from "./active-status-toggle";

import type {
    CategoryCustomSchemaField,
    MasterDataBrandRow,
    MasterDataCategoryRow,
    MasterDataDepartmentRow,
    MasterDataDeviceModelRow,
    MasterDataLocationRow,
    MasterDataOwnerRow,
    MasterDataVendorRow,
    MasterDataCustomStatusRow,
} from "./master-data-management-client";
import { 
    AVAILABLE_STATUS_ICONS, 
    STATUS_COLORS, 
    STATUS_THEMES,
    type StatusTheme 
} from "@/lib/constants";

type Pillar =
    | "Hardware"
    | "Software"
    | "Office Furniture"
    | "Office Electronics";

interface MasterDataCreatePanelProps {
    isOpen: boolean;
    onCloseUrl: string;
    entity?: string;
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    owners: MasterDataOwnerRow[];
    departments: MasterDataDepartmentRow[];
    customStatuses: MasterDataCustomStatusRow[];
    disableTransition?: boolean;
}

const PILLAR_OPTIONS: Array<{ label: string; value: Pillar }> = [
    { label: "Hardware", value: "Hardware" },
    { label: "Software", value: "Software" },
    { label: "Office Furniture", value: "Office Furniture" },
    { label: "Office Electronics", value: "Office Electronics" },
];

const PANEL_META: Record<MasterDataRecordEntity, {
    title: string;
    description: string;
    submitLabel: string;
    submittingLabel: string;
}> = {
    locations: {
        title: "Add New Location",
        description: "Register a new operational location for asset assignment.",
        submitLabel: "Save Location",
        submittingLabel: "Saving Location...",
    },
    "asset-categories": {
        title: "Add New Category",
        description: "Create a category and define its custom JSON schema fields.",
        submitLabel: "Save Category",
        submittingLabel: "Saving Category...",
    },
    brands: {
        title: "Add New Brand",
        description: "Register a manufacturer for model mapping and procurement.",
        submitLabel: "Save Brand",
        submittingLabel: "Saving Brand...",
    },
    "device-models": {
        title: "Add New Model",
        description: "Create a model using specifications inherited from the selected category.",
        submitLabel: "Save Model",
        submittingLabel: "Saving Model...",
    },
    vendors: {
        title: "Add New Vendor",
        description: "Add an approved vendor for purchases and maintenance.",
        submitLabel: "Save Vendor",
        submittingLabel: "Saving Vendor...",
    },
    owners: {
        title: "Add New Owner",
        description: "Register a legal company owner for assets (for example, TIQRI LK).",
        submitLabel: "Save Owner",
        submittingLabel: "Saving Owner...",
    },
    departments: {
        title: "Add New Department",
        description: "Register a department for user assignment and ownership mapping.",
        submitLabel: "Save Department",
        submittingLabel: "Saving Department...",
    },
    statuses: {
        title: "Add New Status",
        description: "Create a custom status for assets (e.g., In Transit).",
        submitLabel: "Save Status",
        submittingLabel: "Saving Status...",
    },
};
const TOP_LEVEL_PARENT_LOCATION_VALUE = "none";


function isRecordEntity(value: string | undefined): value is MasterDataRecordEntity {
    return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

export function MasterDataCreatePanel({
    isOpen,
    onCloseUrl,
    entity,
    categories,
    locations,
    brands,
    disableTransition = false,
}: MasterDataCreatePanelProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState<UpdateMasterDataState>(
        INITIAL_CREATE_MASTER_DATA_STATE
    );
    const [isActive, setIsActive] = useState(true);
    const [categoryPillar, setCategoryPillar] = useState<Pillar>("Hardware");
    const [modelPillar, setModelPillar] = useState<Pillar>("Hardware");
    const [selectedLocationType, setSelectedLocationType] = useState<LocationType | "">("");
    const [selectedParentLocationId, setSelectedParentLocationId] = useState(
        TOP_LEVEL_PARENT_LOCATION_VALUE
    );
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [modelImageFile, setModelImageFile] = useState<File | null>(null);
    const [isModelImageDragOver, setIsModelImageDragOver] = useState(false);
    const [showModelImageUploader, setShowModelImageUploader] = useState(false);
    const [categoryPrefixInput, setCategoryPrefixInput] = useState("");
    const [modelSpecAttributes, setModelSpecAttributes] = useState<CustomAttribute[]>([
        createCustomAttribute(),
    ]);
    const [assetTrackingAttributes, setAssetTrackingAttributes] = useState<CustomAttribute[]>([
        createCustomAttribute(),
    ]);
    const [modelSpecValues, setModelSpecValues] = useState<Record<string, string>>({});
    const [statusColorTheme, setStatusColorTheme] = useState<StatusTheme>("gray");
    const [statusIconName, setStatusIconName] = useState("CircleDot");
    const [allowedActions, setAllowedActions] = useState<string[]>(["edit"]);
    const modelImageInputRef = useRef<HTMLInputElement>(null);

    const normalizedEntity = isRecordEntity(entity) ? entity : null;

    const activeCategoriesForModel = useMemo(
        () =>
            categories.filter(
                (category) => category.isActive && category.pillar === modelPillar
            ),
        [categories, modelPillar]
    );

    const normalizedSelectedCategoryId = activeCategoriesForModel.some(
        (category) => String(category.id) === selectedCategoryId
    )
        ? selectedCategoryId
        : "";

    const panelMeta = normalizedEntity ? PANEL_META[normalizedEntity] : null;

    const selectableParentLocations = useMemo(
        () =>
            locations
                .filter((location) => location.isActive)
                .sort((left, right) => left.name.localeCompare(right.name)),
        [locations]
    );



    const categorySchemaPayload = useMemo(
        () => ({
            modelSpecs: buildSchemaSectionPayload(modelSpecAttributes),
            assetTracking: buildSchemaSectionPayload(assetTrackingAttributes),
        }),
        [assetTrackingAttributes, modelSpecAttributes]
    );

    const selectedCategoryForModel = useMemo(
        () =>
            activeCategoriesForModel.find(
                (category) => String(category.id) === normalizedSelectedCategoryId
            ) ?? null,
        [activeCategoriesForModel, normalizedSelectedCategoryId]
    );

    const selectedCategoryModelSpecs = useMemo<CategoryCustomSchemaField[]>(
        () => selectedCategoryForModel?.customSchema.modelSpecs ?? [],
        [selectedCategoryForModel]
    );

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

    const technicalDetailsPayload = useMemo(() => {
        const payload: Record<string, string> = {};

        for (const spec of selectedCategoryModelSpecs) {
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
    }, [modelSpecValues, selectedCategoryModelSpecs]);

    const getFieldError = useCallback(
        (fieldName: string) => state.errors?.[fieldName]?.[0],
        [state.errors]
    );



    const resetCreateFormState = useCallback(() => {
        setState(INITIAL_CREATE_MASTER_DATA_STATE);
        setIsActive(true);
        setCategoryPillar("Hardware");
        setModelPillar("Hardware");
        setSelectedLocationType("");
        setSelectedParentLocationId(TOP_LEVEL_PARENT_LOCATION_VALUE);
        setSelectedBrandId("");
        setSelectedCategoryId("");
        setModelImageFile(null);
        setIsModelImageDragOver(false);
        setShowModelImageUploader(false);
        setCategoryPrefixInput("");
        setModelSpecAttributes([createCustomAttribute()]);
        setAssetTrackingAttributes([createCustomAttribute()]);
        setModelSpecValues({});
        setStatusColorTheme("gray");
        setStatusIconName("CircleDot");
    }, []);

    const handleClose = useCallback(
        (open: boolean) => {
            if (!open) {
                resetCreateFormState();
                router.push(onCloseUrl, { scroll: false });
            }
        },
        [onCloseUrl, resetCreateFormState, router]
    );

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!normalizedEntity) {
                tiqriToast.error("Invalid master data entity selected.");
                setState({
                    success: false,
                    message: "Invalid master data entity selected.",
                });
                return;
            }

            const formData = new FormData(event.currentTarget);

            if (normalizedEntity === "device-models") {
                if (modelImageFile) {
                    formData.set("modelImage", modelImageFile);
                } else {
                    formData.delete("modelImage");
                }
            }

            startTransition(async () => {
                const result = await createMasterDataRecord(
                    INITIAL_CREATE_MASTER_DATA_STATE,
                    formData
                );

                setState(result);

                if (result.success) {
                    tiqriToast.success(result.message);
                    router.refresh();
                    handleClose(false);
                    return;
                }

                tiqriToast.error(result.message);
            });
        },
        [handleClose, modelImageFile, normalizedEntity, router]
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

    const handleModelImageDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsModelImageDragOver(false);
            handleModelImageSelection(event.dataTransfer.files);
        },
        [handleModelImageSelection]
    );

    const clearSelectedModelImage = useCallback(() => {
        setModelImageFile(null);
        setShowModelImageUploader(false);
        if (modelImageInputRef.current) {
            modelImageInputRef.current.value = "";
        }
    }, []);

    const addModelSpecAttribute = useCallback(() => {
        setModelSpecAttributes((previous) => [...previous, createCustomAttribute()]);
    }, []);

    const removeModelSpecAttribute = useCallback((id: string) => {
        setModelSpecAttributes((previous) => {
            if (previous.length === 1) {
                return previous;
            }

            return previous.filter((attribute) => attribute.id !== id);
        });
    }, []);

    const updateModelSpecAttribute = useCallback(
        <TKey extends keyof CustomAttribute>(
            id: string,
            key: TKey,
            value: CustomAttribute[TKey]
        ) => {
            setModelSpecAttributes((previous) =>
                previous.map((attribute) =>
                    attribute.id === id ? { ...attribute, [key]: value } : attribute
                )
            );
        },
        []
    );

    const addAssetTrackingAttribute = useCallback(() => {
        setAssetTrackingAttributes((previous) => [...previous, createCustomAttribute()]);
    }, []);

    const removeAssetTrackingAttribute = useCallback((id: string) => {
        setAssetTrackingAttributes((previous) => {
            if (previous.length === 1) {
                return previous;
            }

            return previous.filter((attribute) => attribute.id !== id);
        });
    }, []);

    const updateAssetTrackingAttribute = useCallback(
        <TKey extends keyof CustomAttribute>(
            id: string,
            key: TKey,
            value: CustomAttribute[TKey]
        ) => {
            setAssetTrackingAttributes((previous) =>
                previous.map((attribute) =>
                    attribute.id === id ? { ...attribute, [key]: value } : attribute
                )
            );
        },
        []
    );

    const handleCategoryPillarChange = useCallback((value: string) => {
        const pillar = value as Pillar;
        setCategoryPillar(pillar);

        if (pillar === "Software") {
            setAssetTrackingAttributes([
                { id: crypto.randomUUID(), fieldName: "License Key", inputType: "Text", required: true },
                { id: crypto.randomUUID(), fieldName: "Total Seats", inputType: "Number", required: true },
                { id: crypto.randomUUID(), fieldName: "Available Seats", inputType: "Number", required: true },
                { id: crypto.randomUUID(), fieldName: "Expiration Date", inputType: "Date", required: true },
            ]);
        } else if (pillar === "Office Electronics") {
            setAssetTrackingAttributes([
                { id: crypto.randomUUID(), fieldName: "IP/MAC Address", inputType: "Text", required: false },
            ]);
        } else {
            setAssetTrackingAttributes([createCustomAttribute()]);
        }
    }, []);

    const handleModelPillarChange = useCallback((value: string) => {
        setModelPillar(value as Pillar);
        setSelectedCategoryId("");
        setModelSpecValues({});
    }, []);

    const handleModelCategoryChange = useCallback((value: string) => {
        setSelectedCategoryId(value);
        setModelSpecValues({});
    }, []);

    const handleCategoryPrefixChange = useCallback((value: string) => {
        const normalized = value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 3);

        setCategoryPrefixInput(normalized);
    }, []);

    const updateModelSpecValue = useCallback(
        (fieldName: string, value: string) => {
            setModelSpecValues((previous) => ({
                ...previous,
                [fieldName]: value,
            }));
        },
        []
    );

    const renderActiveSwitch = (
        <ActiveStatusToggle
            isActive={isActive}
            onChange={setIsActive}
        />
    );

    const renderModelSpecificationsSection = (
        <EditableSchemaSection
            title="Model Specifications (Common)"
            description="Technical specs shared by every unit of this model, such as Processor, RAM, and Resolution. These are collected once when adding a Model."
            attributes={modelSpecAttributes}
            onUpdate={updateModelSpecAttribute}
            onAdd={addModelSpecAttribute}
            onRemove={removeModelSpecAttribute}
            fieldError={getFieldError("customSchema")}
        />
    );

    const renderAssetTrackingSection = (
        <EditableSchemaSection
            title="Asset Tracking Fields (Unique)"
            description="Data unique to each physical item, such as MAC Address, IMEI, and Condition Notes. These are collected whenever a new Asset is registered."
            attributes={assetTrackingAttributes}
            onUpdate={updateAssetTrackingAttribute}
            onAdd={addAssetTrackingAttribute}
            onRemove={removeAssetTrackingAttribute}
        />
    );

    const formBody = (() => {
        if (!normalizedEntity) {
            return (
                <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    Select a valid tab before opening the Add New panel.
                </div>
            );
        }

        switch (normalizedEntity) {
            case "locations":
                return (
                    <>
                        <input type="hidden" name="type" value={selectedLocationType} />
                        <input
                            type="hidden"
                            name="parentId"
                            value={
                                selectedParentLocationId === TOP_LEVEL_PARENT_LOCATION_VALUE
                                    ? ""
                                    : selectedParentLocationId
                            }
                        />


                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Location Name <span className="text-red-500">*</span>
                                </label>
                                <Input name="name" placeholder="Colombo HQ" required />
                                {getFieldError("name") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("name")}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Type <span className="text-red-500">*</span>
                                </label>
                                <SearchableDropdown
                                    options={LOCATION_TYPE_OPTIONS}
                                    placeholder="Select a location type"
                                    value={selectedLocationType}
                                    onSelect={(value) =>
                                        setSelectedLocationType(value as LocationType)
                                    }
                                />
                                {getFieldError("type") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("type")}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Parent Location
                            </label>
                            <SearchableDropdown
                                options={[
                                    { value: TOP_LEVEL_PARENT_LOCATION_VALUE, label: "None (Building)" },
                                    ...selectableParentLocations.map((location) => ({
                                        value: String(location.id),
                                        label: location.name,
                                    })),
                                ]}
                                placeholder="Select a location"
                                value={selectedParentLocationId}
                                onSelect={setSelectedParentLocationId}
                            />
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                Select None to create a Building.
                            </p>
                            {getFieldError("parentId") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("parentId")}
                                </p>
                            )}
                        </div>
                        {renderActiveSwitch}
                    </>
                );

            case "asset-categories":
                return (
                    <>
                        <input type="hidden" name="pillar" value={categoryPillar} />
                        <input
                            type="hidden"
                            name="customSchema"
                            value={JSON.stringify(categorySchemaPayload)}
                        />


                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Type
                                </label>
                                <SearchableDropdown
                                    options={PILLAR_OPTIONS}
                                    placeholder="Select a type"
                                    value={categoryPillar}
                                    onSelect={handleCategoryPillarChange}
                                />
                                {getFieldError("pillar") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("pillar")}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <Input name="name" placeholder="Wireless Keyboards" required />
                                {getFieldError("name") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("name")}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Prefix Code <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Input
                                        name="prefix"
                                        value={categoryPrefixInput}
                                        onChange={(event) =>
                                            handleCategoryPrefixChange(event.target.value)
                                        }
                                        placeholder="WKE"
                                        maxLength={3}
                                        className="uppercase"
                                        required
                                    />
                                    <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" sideOffset={6}>
                                                Used to generate Asset IDs. This cannot be changed after creation.
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                {getFieldError("prefix") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("prefix")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {renderModelSpecificationsSection}
                        {renderAssetTrackingSection}
                        {renderActiveSwitch}
                    </>
                );

            case "brands":
                return (
                    <>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Brand Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="name"
                                placeholder="e.g., Apple, Dell, Herman Miller"
                                required
                            />
                            {getFieldError("name") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("name")}
                                </p>
                            )}
                        </div>
                        {renderActiveSwitch}
                    </>
                );

            case "device-models":
                return (
                    <>
                        <input
                            type="hidden"
                            name="technicalDetails"
                            value={JSON.stringify(technicalDetailsPayload)}
                        />
                        <input type="hidden" name="brandId" value={selectedBrandId} />
                        <input
                            type="hidden"
                            name="categoryId"
                            value={normalizedSelectedCategoryId}
                        />


                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Type
                            </label>
                            <SearchableDropdown
                                options={PILLAR_OPTIONS}
                                placeholder="Select a type"
                                value={modelPillar}
                                onSelect={handleModelPillarChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Brand <span className="text-red-500">*</span>
                                </label>
                                <SearchableDropdown
                                    options={brands.map((brand) => ({
                                        value: String(brand.id),
                                        label: brand.name,
                                    }))}
                                    placeholder="Select a brand"
                                    value={selectedBrandId}
                                    onSelect={setSelectedBrandId}
                                />
                                {getFieldError("brandId") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("brandId")}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <SearchableDropdown
                                    options={activeCategoriesForModel.map((category) => ({
                                        value: String(category.id),
                                        label: category.name,
                                    }))}
                                    placeholder="Select a category"
                                    value={normalizedSelectedCategoryId}
                                    onSelect={handleModelCategoryChange}
                                />
                                {getFieldError("categoryId") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("categoryId")}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Model Name <span className="text-red-500">*</span>
                            </label>
                            <Input name="name" placeholder="ThinkPad T14" required />
                            {getFieldError("name") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("name")}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Model Image
                            </label>
                            <Input
                                ref={modelImageInputRef}
                                name="modelImage"
                                type="file"
                                accept={MODEL_IMAGE_ACCEPT}
                                className="hidden"
                                onChange={(event) => handleModelImageSelection(event.target.files)}
                            />
                            <div className="flex items-center gap-3 rounded-lg border bg-muted px-3 py-2">
                                <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border bg-background">
                                    {modelImagePreviewUrl ? (
                                        <Image
                                            src={modelImagePreviewUrl}
                                            alt="Selected model preview"
                                            width={112}
                                            height={80}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} truncate text-muted-foreground`}>
                                        {modelImageFile ? modelImageFile.name : "No image selected"}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            setShowModelImageUploader(true);
                                            modelImageInputRef.current?.click();
                                        }}
                                        aria-label="Change model image"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
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
                                        : "border-border bg-muted/70 hover:border-slate-400"
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <Upload className="h-5 w-5 text-muted-foreground" />
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                            Drag and drop an image, or click to browse
                                        </p>
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                            PNG, JPG, WEBP or GIF. Maximum file size: 4.5MB.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            {modelImageFile && (
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearSelectedModelImage}
                                    >
                                        Remove image
                                    </Button>
                                </div>
                            )}
                            {getFieldError("imageUrl") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("imageUrl")}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}>
                                    Model Specifications
                                </h3>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                    Fields below are sourced from common section of the selected Category.
                                </p>
                            </div>

                            {!selectedCategoryForModel && (
                                <div className={`rounded-md bg-muted px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                    Select a category to load model specification fields.
                                </div>
                            )}

                            {selectedCategoryForModel && selectedCategoryModelSpecs.length === 0 && (
                                <div className={`rounded-md bg-muted px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                    This category has no model specification fields yet.
                                </div>
                            )}

                            {selectedCategoryModelSpecs.length > 0 && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {selectedCategoryModelSpecs.map((spec) => {
                                        const fieldValue = modelSpecValues[spec.fieldName] ?? "";

                                        if (spec.inputType === "Boolean") {
                                            const checked = fieldValue === "true";

                                            return (
                                                <div key={spec.fieldName} className="space-y-2">
                                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                                        {spec.fieldName}
                                                        {spec.required && <span className="text-red-500"> *</span>}
                                                    </label>
                                                    <div className="flex h-10 items-center justify-between rounded-md border border-border px-3">
                                                        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                                            {checked ? "Yes" : "No"}
                                                        </span>
                                                        <Switch
                                                            checked={checked}
                                                            onCheckedChange={(value) =>
                                                                updateModelSpecValue(
                                                                    spec.fieldName,
                                                                    value ? "true" : "false"
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={spec.fieldName} className="space-y-2">
                                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                                    {spec.fieldName}
                                                    {spec.required && <span className="text-red-500"> *</span>}
                                                </label>
                                                <Input
                                                    type={spec.inputType === "Number" ? "number" : spec.inputType === "Date" ? "date" : "text"}
                                                    value={fieldValue}
                                                    onChange={(event) =>
                                                        updateModelSpecValue(spec.fieldName, event.target.value)
                                                    }
                                                    placeholder={spec.inputType === "Dropdown" ? "Enter option value" : `Enter ${spec.fieldName}`}
                                                    required={spec.required}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {getFieldError("technicalDetails") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("technicalDetails")}
                                </p>
                            )}
                        </div>
                        {renderActiveSwitch}
                    </>
                );

            case "vendors":
                return (
                    <>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Vendor Name <span className="text-red-500">*</span>
                                </label>
                                <Input name="companyName" placeholder="Acme Supplies" required />
                                {getFieldError("companyName") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("companyName")}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    name="email"
                                    placeholder="ops@acme.com"
                                />
                                {getFieldError("email") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("email")}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Phone
                                </label>
                                <Input name="phone" placeholder="+94 11 555 0000" />
                                {getFieldError("phone") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("phone")}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Website
                                </label>
                                <Input
                                    type="text"
                                    name="website"
                                    placeholder="https://acme.com"
                                />
                                {getFieldError("website") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("website")}
                                    </p>
                                )}
                            </div>
                        </div>
                        {renderActiveSwitch}
                    </>
                );

            case "departments":
                return (
                    <>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Department Name <span className="text-red-500">*</span>
                                </label>
                                <Input name="name" placeholder="Finance" required />
                                {getFieldError("name") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("name")}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Department Code <span className="text-red-500">*</span>
                                </label>
                                <Input name="shortCode" placeholder="FIN" required />
                                {getFieldError("shortCode") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("shortCode")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {renderActiveSwitch}
                    </>
                );

            case "owners":
                return (
                    <>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                Owner Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="companyName"
                                placeholder="TIQRI LK"
                                required
                            />
                            {getFieldError("companyName") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("companyName")}
                                </p>
                            )}
                        </div>

                        {renderActiveSwitch}
                    </>
                );

            case "statuses":
                return (
                    <>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Status Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="name"
                                    placeholder="e.g., In Transit"
                                    required
                                    className={getFieldError("name") ? "border-red-500" : ""}
                                />
                                {getFieldError("name") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("name")}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                        Status Icon <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={statusIconName}
                                        onValueChange={setStatusIconName}
                                        name="iconName"
                                    >
                                        <SelectTrigger className="h-10">
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    const Icon = (LucideIcons as any)[statusIconName] as LucideIcon;
                                                    return Icon ? <Icon className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />;
                                                })()}
                                                <SelectValue placeholder="Select an icon" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="grid grid-cols-4 gap-1 p-1 max-h-60 overflow-y-auto">
                                                {AVAILABLE_STATUS_ICONS.map((iconName) => {
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    const Icon = (LucideIcons as any)[iconName] as LucideIcon;
                                                    return (
                                                        <SelectItem 
                                                            key={iconName} 
                                                            value={iconName}
                                                            className="flex items-center justify-center p-2 hover:bg-muted cursor-pointer rounded"
                                                        >
                                                            {Icon ? <Icon className="h-5 w-5" /> : <span>{iconName}</span>}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                    {getFieldError("iconName") && (
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                            {getFieldError("iconName")}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                        Status Theme <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={statusColorTheme}
                                        onValueChange={(val) => setStatusColorTheme(val as StatusTheme)}
                                        name="colorTheme"
                                    >
                                        <SelectTrigger className="h-10">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className={`h-4 w-4 rounded-full border ${STATUS_THEMES[statusColorTheme]}`} 
                                                />
                                                <SelectValue placeholder="Select a theme" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_COLORS.map((theme) => (
                                                <SelectItem key={theme.value} value={theme.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className={`h-4 w-4 rounded-full border ${STATUS_THEMES[theme.value]}`} 
                                                        />
                                                        <span>{theme.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {getFieldError("colorTheme") && (
                                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                            {getFieldError("colorTheme")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                    Allowed Actions <span className="text-muted-foreground font-normal">(Edit is required)</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3 rounded-md border p-4 bg-muted/20">
                                    {[
                                        { id: "edit", label: "Edit Asset" },
                                        { id: "send-for-repair", label: "Send for Repair" },
                                        { id: "request-disposal", label: "Request Disposal" },
                                        { id: "assign", label: "Assign / Transfer" },
                                        { id: "request-return", label: "Request Return" }
                                    ].map((action) => (
                                        <div key={action.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`action-${action.id}`}
                                                checked={allowedActions.includes(action.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setAllowedActions([...allowedActions, action.id]);
                                                    } else {
                                                        setAllowedActions(allowedActions.filter(a => a !== action.id));
                                                    }
                                                }}
                                                disabled={action.id === "edit"} // Edit is always allowed
                                            />
                                            <label 
                                                htmlFor={`action-${action.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {action.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <input type="hidden" name="allowedActions" value={JSON.stringify(allowedActions)} />
                            </div>
                        </div>

                        {renderActiveSwitch}
                    </>
                );
        }
    })();

    return (
        <FormPanel
            isOpen={isOpen}
            onClose={handleClose}
            title={panelMeta?.title ?? "Add New"}
            description={panelMeta?.description}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            submitLabel={panelMeta?.submitLabel ?? "Save"}
            submittingLabel={panelMeta?.submittingLabel ?? "Saving..."}
            disableTransition={disableTransition}
        >
            <input type="hidden" name="entity" value={normalizedEntity ?? ""} />
            <input type="hidden" name="isActive" value={String(isActive)} />

            {formBody}

            {state.message && !state.success && (
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                    {state.message}
                </p>
            )}
        </FormPanel>
    );
}
