"use client";

import {
    useCallback,
    useMemo,
    useState,
    useTransition,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Trash2 } from "lucide-react";

import { createMasterDataRecord } from "@/actions/master-data";
import {
    INITIAL_CREATE_MASTER_DATA_STATE,
    MASTER_DATA_RECORD_ENTITIES,
} from "@/lib/master-data/shared";
import type {
    MasterDataRecordEntity,
    UpdateMasterDataState,
} from "@/types/master-data";
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
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
    CategoryCustomSchemaField,
    MasterDataBrandRow,
    MasterDataCategoryRow,
} from "./master-data-management-client";

type Pillar =
    | "IT & Digital"
    | "Software"
    | "Office Furniture"
    | "Office Electronics";

type InputType = "Text" | "Number" | "Date" | "Dropdown" | "Boolean";

type CustomAttribute = {
    id: string;
    fieldName: string;
    inputType: InputType;
    required: boolean;
};

interface MasterDataCreatePanelProps {
    isOpen: boolean;
    onCloseUrl: string;
    entity?: string;
    categories: MasterDataCategoryRow[];
    brands: MasterDataBrandRow[];
    disableTransition?: boolean;
}

const PILLAR_OPTIONS: Array<{ label: string; value: Pillar }> = [
    { label: "IT & Digital", value: "IT & Digital" },
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
        title: "Add New Device Model",
        description: "Create a model using specifications inherited from the selected category.",
        submitLabel: "Save Device Model",
        submittingLabel: "Saving Device Model...",
    },
    vendors: {
        title: "Add New Vendor",
        description: "Add an approved vendor for purchases and maintenance.",
        submitLabel: "Save Vendor",
        submittingLabel: "Saving Vendor...",
    },
    departments: {
        title: "Add New Department",
        description: "Register a department for user assignment and ownership mapping.",
        submitLabel: "Save Department",
        submittingLabel: "Saving Department...",
    },
};

function createCustomAttribute(): CustomAttribute {
    return {
        id: crypto.randomUUID(),
        fieldName: "",
        inputType: "Text",
        required: false,
    };
}

function isRecordEntity(value: string | undefined): value is MasterDataRecordEntity {
    return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

export function MasterDataCreatePanel({
    isOpen,
    onCloseUrl,
    entity,
    categories,
    brands,
    disableTransition = false,
}: MasterDataCreatePanelProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState<UpdateMasterDataState>(
        INITIAL_CREATE_MASTER_DATA_STATE
    );
    const [isActive, setIsActive] = useState(true);
    const [categoryPillar, setCategoryPillar] = useState<Pillar>("IT & Digital");
    const [modelPillar, setModelPillar] = useState<Pillar>("IT & Digital");
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [modelSpecAttributes, setModelSpecAttributes] = useState<CustomAttribute[]>([
        createCustomAttribute(),
    ]);
    const [assetTrackingAttributes, setAssetTrackingAttributes] = useState<CustomAttribute[]>([
        createCustomAttribute(),
    ]);
    const [modelSpecValues, setModelSpecValues] = useState<Record<string, string>>({});

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

    const categorySchemaPayload = useMemo(
        () => ({
            modelSpecs: modelSpecAttributes.map((attribute) => ({
                fieldName: attribute.fieldName,
                inputType: attribute.inputType,
                required: attribute.required,
            })),
            assetTracking: assetTrackingAttributes.map((attribute) => ({
                fieldName: attribute.fieldName,
                inputType: attribute.inputType,
                required: attribute.required,
            })),
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
        setCategoryPillar("IT & Digital");
        setModelPillar("IT & Digital");
        setSelectedBrandId("");
        setSelectedCategoryId("");
        setModelSpecAttributes([createCustomAttribute()]);
        setAssetTrackingAttributes([createCustomAttribute()]);
        setModelSpecValues({});
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
                setState({
                    success: false,
                    message: "Invalid master data entity selected.",
                });
                return;
            }

            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
                const result = await createMasterDataRecord(
                    INITIAL_CREATE_MASTER_DATA_STATE,
                    formData
                );

                setState(result);

                if (result.success) {
                    router.refresh();
                    handleClose(false);
                }
            });
        },
        [handleClose, normalizedEntity, router]
    );

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

    const handleModelPillarChange = useCallback((value: string) => {
        setModelPillar(value as Pillar);
        setSelectedCategoryId("");
        setModelSpecValues({});
    }, []);

    const handleModelCategoryChange = useCallback((value: string) => {
        setSelectedCategoryId(value);
        setModelSpecValues({});
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
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                    Active Status
                </label>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                    Keep this value selectable for new records.
                </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
    );

    const renderModelSpecificationsSection = (
        <div className="space-y-4 border-t pt-4">
            <div>
                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                    Section 1: Model Specifications (Global)
                </h3>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                    Technical specs shared by every unit of this model (e.g., Processor, RAM, Resolution). These fields will be requested once when adding a new Device Model.
                </p>
            </div>

            <div className="rounded-md border bg-slate-50/50">
                <div className="grid grid-cols-12 gap-4 border-b bg-slate-50 p-3 text-xs font-medium text-slate-500">
                    <div className="col-span-5">Field Name</div>
                    <div className="col-span-4">Input Type</div>
                    <div className="col-span-2 text-center">Required?</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="space-y-2 p-2">
                    {modelSpecAttributes.map((attribute) => (
                        <div key={attribute.id} className="grid grid-cols-12 items-center gap-4 p-1">
                            <div className="col-span-5">
                                <Input
                                    value={attribute.fieldName}
                                    onChange={(event) =>
                                        updateModelSpecAttribute(
                                            attribute.id,
                                            "fieldName",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g., RAM"
                                    className="h-9 bg-white"
                                />
                            </div>
                            <div className="col-span-4">
                                <Select
                                    value={attribute.inputType}
                                    onValueChange={(value) =>
                                        updateModelSpecAttribute(
                                            attribute.id,
                                            "inputType",
                                            value as InputType
                                        )
                                    }
                                >
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Text">Text</SelectItem>
                                        <SelectItem value="Number">Number</SelectItem>
                                        <SelectItem value="Date">Date</SelectItem>
                                        <SelectItem value="Dropdown">Dropdown</SelectItem>
                                        <SelectItem value="Boolean">Yes/No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <Checkbox
                                    checked={attribute.required}
                                    onCheckedChange={(checked) =>
                                        updateModelSpecAttribute(
                                            attribute.id,
                                            "required",
                                            checked === true
                                        )
                                    }
                                />
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeModelSpecAttribute(attribute.id)}
                                    disabled={modelSpecAttributes.length === 1}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t bg-slate-50 p-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addModelSpecAttribute}
                        className="w-full text-slate-500 hover:bg-slate-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add more
                    </Button>
                </div>
            </div>
            {getFieldError("customSchema") && (
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                    {getFieldError("customSchema")}
                </p>
            )}
        </div>
    );

    const renderAssetTrackingSection = (
        <div className="space-y-4 border-t pt-4">
            <div>
                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                    Section 2: Asset Tracking Fields (Unique)
                </h3>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                    Data unique to each physical item (e.g., MAC Address, IMEI, Condition Notes). These fields will be requested every time an employee registers a new physical Asset.
                </p>
            </div>

            <div className="rounded-md border bg-slate-50/50">
                <div className="grid grid-cols-12 gap-4 border-b bg-slate-50 p-3 text-xs font-medium text-slate-500">
                    <div className="col-span-5">Field Name</div>
                    <div className="col-span-4">Input Type</div>
                    <div className="col-span-2 text-center">Required?</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="space-y-2 p-2">
                    {assetTrackingAttributes.map((attribute) => (
                        <div key={attribute.id} className="grid grid-cols-12 items-center gap-4 p-1">
                            <div className="col-span-5">
                                <Input
                                    value={attribute.fieldName}
                                    onChange={(event) =>
                                        updateAssetTrackingAttribute(
                                            attribute.id,
                                            "fieldName",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g., MAC Address"
                                    className="h-9 bg-white"
                                />
                            </div>
                            <div className="col-span-4">
                                <Select
                                    value={attribute.inputType}
                                    onValueChange={(value) =>
                                        updateAssetTrackingAttribute(
                                            attribute.id,
                                            "inputType",
                                            value as InputType
                                        )
                                    }
                                >
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Text">Text</SelectItem>
                                        <SelectItem value="Number">Number</SelectItem>
                                        <SelectItem value="Date">Date</SelectItem>
                                        <SelectItem value="Dropdown">Dropdown</SelectItem>
                                        <SelectItem value="Boolean">Yes/No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <Checkbox
                                    checked={attribute.required}
                                    onCheckedChange={(checked) =>
                                        updateAssetTrackingAttribute(
                                            attribute.id,
                                            "required",
                                            checked === true
                                        )
                                    }
                                />
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAssetTrackingAttribute(attribute.id)}
                                    disabled={assetTrackingAttributes.length === 1}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t bg-slate-50 p-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addAssetTrackingAttribute}
                        className="w-full text-slate-500 hover:bg-slate-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add more
                    </Button>
                </div>
            </div>
        </div>
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Type
                                </label>
                                <Input name="type" placeholder="HQ, Branch, Remote" />
                                {getFieldError("type") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("type")}
                                    </p>
                                )}
                            </div>
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

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Type
                            </label>
                            <Select
                                value={categoryPillar}
                                onValueChange={(value) => setCategoryPillar(value as Pillar)}
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
                            {getFieldError("pillar") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("pillar")}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Prefix Code <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Input
                                        name="prefix"
                                        placeholder="WKE"
                                        maxLength={3}
                                        className="uppercase"
                                        required
                                    />
                                    <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
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

                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600`}>
                            By defining both schemas at the Category level, the Add Model and Register Asset forms can render inputs directly from these rules.
                        </p>
                        {renderActiveSwitch}
                    </>
                );

            case "brands":
                return (
                    <>
                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Type
                            </label>
                            <Select
                                value={modelPillar}
                                onValueChange={handleModelPillarChange}
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
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Brand <span className="text-red-500">*</span>
                                </label>
                                <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
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
                                {getFieldError("brandId") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("brandId")}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={normalizedSelectedCategoryId}
                                    onValueChange={handleModelCategoryChange}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeCategoriesForModel.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {getFieldError("categoryId") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("categoryId")}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Model Name <span className="text-red-500">*</span>
                            </label>
                            <Input name="name" placeholder="ThinkPad T14" required />
                            {getFieldError("name") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("name")}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>
                                    Model Specifications (Inherited)
                                </h3>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                                    Fields below are sourced from Section 1 of the selected Category schema.
                                </p>
                            </div>

                            {!selectedCategoryForModel && (
                                <div className={`rounded-md bg-slate-50 px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
                                    Select a category to load model specification fields.
                                </div>
                            )}

                            {selectedCategoryForModel && selectedCategoryModelSpecs.length === 0 && (
                                <div className={`rounded-md bg-slate-50 px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600`}>
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
                                                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                    Contact Info
                                </label>
                                <Input
                                    name="contactInfo"
                                    placeholder="ops@acme.com | +94 11 555 0000"
                                />
                                {getFieldError("contactInfo") && (
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                        {getFieldError("contactInfo")}
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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
                                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
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

                        <div className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                                Cost Center ID <span className="text-red-500">*</span>
                            </label>
                            <Input name="costCenterId" placeholder="CC-1020" required />
                            {getFieldError("costCenterId") && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {getFieldError("costCenterId")}
                                </p>
                            )}
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
