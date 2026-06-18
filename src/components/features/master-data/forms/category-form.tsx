"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Info } from "lucide-react";
import type { MasterDataCategoryRow } from "../master-data-management-client";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActiveStatusToggle } from "../active-status-toggle";
import {
    type BaseMasterDataFormProps,
    FormTextField,
    RecordIdPreview,
    READ_ONLY_INPUT_CLASSNAME,
} from "./shared";
import { EditableSchemaSection } from "../editable-schema-section";
import { createCustomAttribute, buildSchemaSectionPayload, type CustomAttribute } from "@/lib/master-data/shared";

type Pillar = "Hardware" | "Software" | "Office Furniture" | "Office Electronics";

const PILLAR_OPTIONS: Array<{ label: string; value: Pillar }> = [
    { label: "Hardware", value: "Hardware" },
    { label: "Software", value: "Software" },
    { label: "Office Furniture", value: "Office Furniture" },
    { label: "Office Electronics", value: "Office Electronics" },
];

interface CategoryFormProps extends BaseMasterDataFormProps {
    initialData?: MasterDataCategoryRow;
}

function renderSchemaRows(
    title: string,
    description: string,
    rows: MasterDataCategoryRow["customSchema"]["modelSpecs"]
) {
    return (
        <div className="space-y-3 border-t pt-4">
            <div>
                <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}>{title}</h3>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{description}</p>
            </div>

            {rows.length === 0 ? (
                <div className={`rounded-md bg-muted px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    No fields defined.
                </div>
            ) : (
                <div className="rounded-md border bg-muted/50">
                    <div className="grid grid-cols-12 gap-4 border-b bg-muted p-3 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5">Field Name</div>
                        <div className="col-span-4">Input Type</div>
                        <div className="col-span-3">Required</div>
                    </div>
                    <div className="space-y-2 p-2">
                        {rows.map((row, index) => (
                            <div key={`${row.fieldName}-${index}`} className="grid grid-cols-12 items-center gap-4 rounded-sm bg-background p-2">
                                <div className="col-span-5 text-sm text-foreground">{row.fieldName}</div>
                                <div className="col-span-4 text-sm text-foreground">{row.inputType}</div>
                                <div className="col-span-3 text-sm text-foreground">{row.required ? "Yes" : "No"}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function CategoryForm({
    initialData,
    isDetailMode,
    fieldError,
    onDirtyStateChange,
}: CategoryFormProps) {
    const isEdit = !!initialData;

    const [name, setName] = useState(initialData?.name || "");
    const [prefix, setPrefix] = useState(initialData?.prefix || "");
    const [pillar, setPillar] = useState<Pillar>((initialData?.pillar as Pillar) || "Hardware");
    const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);


    const initialModelSpecAttributes = useMemo<CustomAttribute[]>(() => {
        if (!initialData || !initialData.customSchema?.modelSpecs || initialData.customSchema.modelSpecs.length === 0) {
            return [createCustomAttribute()];
        }
        return initialData.customSchema.modelSpecs.map((spec) => ({
            id: crypto.randomUUID(),
            fieldName: spec.fieldName,
            inputType: spec.inputType as CustomAttribute["inputType"],
            required: spec.required,
        }));
    }, [initialData]);

    const initialAssetTrackingAttributes = useMemo<CustomAttribute[]>(() => {
        if (!initialData || !initialData.customSchema?.assetTracking || initialData.customSchema.assetTracking.length === 0) {
            return [createCustomAttribute()];
        }
        return initialData.customSchema.assetTracking.map((spec) => ({
            id: crypto.randomUUID(),
            fieldName: spec.fieldName,
            inputType: spec.inputType as CustomAttribute["inputType"],
            required: spec.required,
        }));
    }, [initialData]);

    const [modelSpecAttributes, setModelSpecAttributes] = useState<CustomAttribute[]>(initialModelSpecAttributes);
    const [assetTrackingAttributes, setAssetTrackingAttributes] = useState<CustomAttribute[]>(initialAssetTrackingAttributes);

    useEffect(() => {
        if (!initialData) return;
        const dirty =
            name !== initialData.name ||
            prefix !== (initialData.prefix || "") ||
            pillar !== initialData.pillar ||
            isActive !== initialData.isActive ||
            JSON.stringify(modelSpecAttributes) !== JSON.stringify(initialData.customSchema?.modelSpecs || []) ||
            JSON.stringify(assetTrackingAttributes) !== JSON.stringify(initialData.customSchema?.assetTracking || []);
        onDirtyStateChange?.(dirty);
    }, [name, prefix, pillar, isActive, modelSpecAttributes, assetTrackingAttributes, initialData, onDirtyStateChange]);

    const categorySchemaPayload = useMemo(
        () => ({
            modelSpecs: buildSchemaSectionPayload(modelSpecAttributes),
            assetTracking: buildSchemaSectionPayload(assetTrackingAttributes),
        }),
        [assetTrackingAttributes, modelSpecAttributes]
    );

    const handlePillarChange = useCallback((value: string) => {
        const selectedPillar = value as Pillar;
        setPillar(selectedPillar);

        if (isEdit) return; // Don't auto-fill attributes if editing existing

        if (selectedPillar === "Software") {
            setAssetTrackingAttributes([
                { id: crypto.randomUUID(), fieldName: "License Key", inputType: "Text", required: true },
                { id: crypto.randomUUID(), fieldName: "Total Seats", inputType: "Number", required: true },
                { id: crypto.randomUUID(), fieldName: "Available Seats", inputType: "Number", required: true },
                { id: crypto.randomUUID(), fieldName: "Expiration Date", inputType: "Date", required: true },
            ]);
        } else if (selectedPillar === "Office Electronics") {
            setAssetTrackingAttributes([
                { id: crypto.randomUUID(), fieldName: "IP/MAC Address", inputType: "Text", required: false },
            ]);
        } else {
            setAssetTrackingAttributes([createCustomAttribute()]);
        }
    }, [isEdit]);

    const handlePrefixChange = useCallback((value: string) => {
        const normalized = value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 3);
        setPrefix(normalized);
    }, []);

    const addModelSpecAttribute = useCallback(() => {
        setModelSpecAttributes((previous) => [...previous, createCustomAttribute()]);
    }, []);

    const removeModelSpecAttribute = useCallback((id: string) => {
        setModelSpecAttributes((previous) => {
            if (previous.length === 1) return previous;
            return previous.filter((attribute) => attribute.id !== id);
        });
    }, []);

    const updateModelSpecAttribute = useCallback(
        <TKey extends keyof CustomAttribute>(id: string, key: TKey, value: CustomAttribute[TKey]) => {
            setModelSpecAttributes((previous) =>
                previous.map((attribute) => (attribute.id === id ? { ...attribute, [key]: value } : attribute))
            );
        },
        []
    );

    const addAssetTrackingAttribute = useCallback(() => {
        setAssetTrackingAttributes((previous) => [...previous, createCustomAttribute()]);
    }, []);

    const removeAssetTrackingAttribute = useCallback((id: string) => {
        setAssetTrackingAttributes((previous) => {
            if (previous.length === 1) return previous;
            return previous.filter((attribute) => attribute.id !== id);
        });
    }, []);

    const updateAssetTrackingAttribute = useCallback(
        <TKey extends keyof CustomAttribute>(id: string, key: TKey, value: CustomAttribute[TKey]) => {
            setAssetTrackingAttributes((previous) =>
                previous.map((attribute) => (attribute.id === id ? { ...attribute, [key]: value } : attribute))
            );
        },
        []
    );

    return (
        <>
            <input type="hidden" name="pillar" value={pillar} />
            <input type="hidden" name="isActive" value={String(isActive)} />
            <input type="hidden" name="customSchema" value={JSON.stringify(categorySchemaPayload)} />

            {isEdit && initialData && (
                <RecordIdPreview entity="asset-categories" record={initialData as unknown as Record<string, unknown>} numericRecordId={initialData.id} />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                        Type
                    </label>
                    {isDetailMode ? (
                        <input className={READ_ONLY_INPUT_CLASSNAME + " w-full rounded-md px-3"} value={pillar} readOnly />
                    ) : (
                        <SearchableDropdown
                            options={PILLAR_OPTIONS}
                            placeholder="Select a type"
                            value={pillar}
                            onSelect={handlePillarChange}
                        />
                    )}
                    {fieldError("pillar") && (
                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>{fieldError("pillar")}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormTextField
                    fieldKey="name"
                    label="Category Name"
                    value={name}
                    onChange={setName}
                    isDetailMode={isDetailMode}
                    fieldError={fieldError}
                    options={{ required: true, placeholder: "Wireless Keyboards" }}
                />

                <div className="space-y-2">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                        Prefix Code <span className="text-red-500">*</span>
                    </label>
                    {isDetailMode || (isEdit && initialData?.id !== undefined) ? (
                        <input className={READ_ONLY_INPUT_CLASSNAME + " w-full rounded-md px-3"} value={prefix || "N/A"} readOnly />
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                name="prefix"
                                value={prefix}
                                onChange={(event) => handlePrefixChange(event.target.value)}
                                placeholder="WKE"
                                maxLength={3}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 uppercase"
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
                    )}
                    {fieldError("prefix") && (
                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                            {fieldError("prefix")}
                        </p>
                    )}
                </div>
            </div>

            {isDetailMode ? (
                <>
                    {renderSchemaRows("Model Specifications (Common)", "Technical specs shared by every unit of this model.", initialData?.customSchema?.modelSpecs ?? [])}
                    {renderSchemaRows("Asset Tracking Fields (Unique)", "Data unique to each physical item.", initialData?.customSchema?.assetTracking ?? [])}
                </>
            ) : (
                <>
                    <EditableSchemaSection
                        title="Model Specifications (Common)"
                        description="Technical specs shared by every unit of this model."
                        attributes={modelSpecAttributes}
                        onUpdate={updateModelSpecAttribute}
                        onAdd={addModelSpecAttribute}
                        onRemove={removeModelSpecAttribute}
                        fieldError={fieldError("customSchema")}
                    />
                    <EditableSchemaSection
                        title="Asset Tracking Fields (Unique)"
                        description="Data unique to each physical item."
                        attributes={assetTrackingAttributes}
                        onUpdate={updateAssetTrackingAttribute}
                        onAdd={addAssetTrackingAttribute}
                        onRemove={removeAssetTrackingAttribute}
                    />
                </>
            )}

            {!isDetailMode && (
                <ActiveStatusToggle isActive={isActive} onChange={setIsActive} />
            )}
            {isDetailMode && (
                <div className="flex items-center space-x-2 pt-4 border-t">
                    <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Status:</span>
                    <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
                        {isActive ? "Active" : "Inactive"}
                    </span>
                </div>
            )}
        </>
    );
}
