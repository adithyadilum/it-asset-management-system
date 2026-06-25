"use client";

import {
    useState,
    useMemo,
    useCallback,
    useRef,
    forwardRef,
    useImperativeHandle,
    useEffect,
    type DragEvent,
} from "react";
import Image from "next/image";
import { ImagePlus, Upload } from "lucide-react";
import { tiqriToast } from "@/components/shared/sonner";
import { isModelImageFile, MODEL_IMAGE_ACCEPT } from "@/lib/file-types";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { ActiveStatusToggle } from "../active-status-toggle";
import {
    type BaseMasterDataFormProps,
    type MasterDataFormRef,
    FormTextField,
    RecordIdPreview,
    READ_ONLY_INPUT_CLASSNAME,
} from "./shared";
import type {
    MasterDataBrandRow,
    MasterDataCategoryRow,
    MasterDataDeviceModelRow,
    CategoryCustomSchemaField,
} from "../master-data-management-client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Pillar = "Hardware" | "Software" | "Office Furniture" | "Office Electronics";

const PILLAR_OPTIONS: Array<{ label: string; value: Pillar }> = [
    { label: "Hardware", value: "Hardware" },
    { label: "Software", value: "Software" },
    { label: "Office Furniture", value: "Office Furniture" },
    { label: "Office Electronics", value: "Office Electronics" },
];

interface DeviceModelFormProps extends BaseMasterDataFormProps {
    initialData?: MasterDataDeviceModelRow;
    brands: MasterDataBrandRow[];
    categories: MasterDataCategoryRow[];
}

function normalizeModelTechnicalDetails(value: unknown): Record<string, string> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {};
    }
    const record = value as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const [key, rawValue] of Object.entries(record)) {
        const normalizedKey = key.trim();
        if (normalizedKey.length > 0 && rawValue !== null && rawValue !== undefined) {
            next[normalizedKey] = String(rawValue);
        }
    }
    return next;
}

export const DeviceModelForm = forwardRef<MasterDataFormRef, DeviceModelFormProps>(
    ({ initialData, isDetailMode, fieldError, onDirtyStateChange, brands, categories }, ref) => {
        const isEdit = !!initialData;

        const [name, setName] = useState(initialData?.name || "");
        const [pillar, setPillar] = useState<Pillar>((initialData?.pillar as Pillar) || "Hardware");
        const [brandId, setBrandId] = useState(initialData?.brandId ? String(initialData.brandId) : "");
        const [categoryId, setCategoryId] = useState(initialData?.categoryId ? String(initialData.categoryId) : "");
        const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

        const initialModelSpecValues = useMemo<Record<string, string>>(() => {
            if (!initialData) return {};
            return normalizeModelTechnicalDetails(initialData.technicalDetails);
        }, [initialData]);

        const [modelSpecValues, setModelSpecValues] = useState<Record<string, string>>(initialModelSpecValues);

        const [modelImageFile, setModelImageFile] = useState<File | null>(null);
        const [isModelImageDragOver, setIsModelImageDragOver] = useState(false);
        const [showModelImageUploader, setShowModelImageUploader] = useState(false);
        const [removeExistingImage, setRemoveExistingImage] = useState(false);
        const modelImageInputRef = useRef<HTMLInputElement>(null);

        useImperativeHandle(ref, () => ({
            augmentFormData: (formData: FormData) => {
                if (modelImageFile) {
                    formData.set("modelImage", modelImageFile);
                } else if (!isEdit) {
                    formData.delete("modelImage");
                }
                // If isEdit, the backend might handle existing image, or delete it if a flag is passed.
            },
        }));

        const activeCategoriesForModel = useMemo(
            () => categories.filter((category) => (isEdit ? true : category.isActive) && category.pillar === pillar),
            [categories, pillar, isEdit]
        );

        const selectedCategoryForModel = useMemo(
            () => activeCategoriesForModel.find((category) => String(category.id) === categoryId) ?? null,
            [activeCategoriesForModel, categoryId]
        );

        const selectedCategoryModelSpecs = useMemo<CategoryCustomSchemaField[]>(
            () => selectedCategoryForModel?.customSchema?.modelSpecs ?? [],
            [selectedCategoryForModel]
        );

        const technicalDetailsPayload = useMemo(() => {
            const payload: Record<string, string> = {};
            for (const spec of selectedCategoryModelSpecs) {
                const key = spec.fieldName.trim();
                if (key.length === 0) continue;

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

        const selectedModelImageUrl = initialData?.imageUrl || "";
        const modelImagePreviewUrl = useMemo(() => (modelImageFile ? URL.createObjectURL(modelImageFile) : null), [modelImageFile]);

        useEffect(() => {
            return () => {
                if (modelImagePreviewUrl) {
                    URL.revokeObjectURL(modelImagePreviewUrl);
                }
            };
        }, [modelImagePreviewUrl]);

        const displayModelImageUrl = modelImagePreviewUrl ?? (removeExistingImage ? "" : selectedModelImageUrl);
        const hasSelectedModelImage = displayModelImageUrl.trim().length > 0;

        useEffect(() => {
            if (!initialData) return;
            const dirty =
                name !== initialData.name ||
                pillar !== initialData.pillar ||
                brandId !== (initialData.brandId ? String(initialData.brandId) : "") ||
                categoryId !== (initialData.categoryId ? String(initialData.categoryId) : "") ||
                isActive !== initialData.isActive ||
                JSON.stringify(modelSpecValues) !== JSON.stringify(initialModelSpecValues) ||
                modelImageFile !== null ||
                removeExistingImage;
            onDirtyStateChange?.(dirty);
        }, [name, pillar, brandId, categoryId, isActive, modelSpecValues, modelImageFile, removeExistingImage, initialData, initialModelSpecValues, onDirtyStateChange]);

        const handlePillarChange = useCallback((value: string) => {
            setPillar(value as Pillar);
            if (!isEdit) {
                setCategoryId("");
                setModelSpecValues({});
            }
        }, [isEdit]);

        const handleCategoryChange = useCallback((value: string) => {
            setCategoryId(value);
            if (!isEdit) {
                setModelSpecValues({});
            }
        }, [isEdit]);

        const updateModelSpecValue = useCallback((fieldName: string, value: string) => {
            setModelSpecValues((previous) => ({
                ...previous,
                [fieldName]: value,
            }));
        }, []);

        const handleModelImageSelection = useCallback((files: FileList | null) => {
            const selectedFile = files?.[0] ?? null;

            if (selectedFile && !isModelImageFile(selectedFile)) {
                tiqriToast.error("Upload a valid image file (PNG, JPG, JPEG, WEBP, GIF, BMP, SVG, or AVIF).");
                if (modelImageInputRef.current) modelImageInputRef.current.value = "";
                setModelImageFile(null);
                setIsModelImageDragOver(false);
                return;
            }

            setModelImageFile(selectedFile);
            setRemoveExistingImage(true);
            if (selectedFile) setShowModelImageUploader(false);
            setIsModelImageDragOver(false);
        }, [modelImageInputRef]);

        const handleModelImageDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsModelImageDragOver(false);
            handleModelImageSelection(event.dataTransfer.files);
        }, [handleModelImageSelection]);

        const clearSelectedModelImage = useCallback(() => {
            setModelImageFile(null);
            setShowModelImageUploader(true);
            setRemoveExistingImage(true);
            if (modelImageInputRef.current) modelImageInputRef.current.value = "";
        }, []);

        return (
            <>
                <input type="hidden" name="technicalDetails" value={JSON.stringify(technicalDetailsPayload)} />
                <input type="hidden" name="brandId" value={brandId} />
                <input type="hidden" name="categoryId" value={categoryId} />
                <input type="hidden" name="isActive" value={String(isActive)} />
                <input type="hidden" name="imageUrl" value={displayModelImageUrl} />

                {isEdit && initialData && (
                    <RecordIdPreview entity="device-models" record={initialData as unknown as Record<string, unknown>} numericRecordId={initialData.id} />
                )}

                <div className="space-y-2">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Type</label>
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
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Brand <span className="text-red-500">*</span></label>
                        {isDetailMode ? (
                            <input className={READ_ONLY_INPUT_CLASSNAME + " w-full rounded-md px-3"} value={brands.find(b => String(b.id) === brandId)?.name || "N/A"} readOnly />
                        ) : (
                            <SearchableDropdown
                                options={brands.map((brand) => ({ value: String(brand.id), label: brand.name }))}
                                placeholder="Select a brand"
                                value={brandId}
                                onSelect={setBrandId}
                            />
                        )}
                        {fieldError("brandId") && <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>{fieldError("brandId")}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Category <span className="text-red-500">*</span></label>
                        {isDetailMode ? (
                            <input className={READ_ONLY_INPUT_CLASSNAME + " w-full rounded-md px-3"} value={categories.find(c => String(c.id) === categoryId)?.name || "N/A"} readOnly />
                        ) : (
                            <SearchableDropdown
                                options={activeCategoriesForModel.map((category) => ({ value: String(category.id), label: category.name }))}
                                placeholder="Select a category"
                                value={categoryId}
                                onSelect={handleCategoryChange}
                            />
                        )}
                        {fieldError("categoryId") && <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>{fieldError("categoryId")}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormTextField
                        fieldKey="name"
                        label="Model Name"
                        value={name}
                        onChange={setName}
                        isDetailMode={isDetailMode}
                        fieldError={fieldError}
                        options={{ required: true, placeholder: "e.g., MacBook Pro 16 M2" }}
                    />
                </div>

                {categoryId && selectedCategoryModelSpecs.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                        <div>
                            <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}>Technical Specifications</h3>
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                Derived from the selected category schemas.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {selectedCategoryModelSpecs.map((spec) => {
                                const specValue = modelSpecValues[spec.fieldName] || "";

                                if (spec.inputType === "Boolean") {
                                    return (
                                        <div key={spec.fieldName} className="space-y-2">
                                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                                {spec.fieldName} {spec.required && !isDetailMode && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="flex h-9 items-center px-1">
                                                {isDetailMode ? (
                                                    <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} ${specValue === "true" ? "text-green-600" : "text-muted-foreground"}`}>
                                                        {specValue === "true" ? "Yes" : "No"}
                                                    </span>
                                                ) : (
                                                    <Switch
                                                        checked={specValue === "true"}
                                                        onCheckedChange={(checked) => updateModelSpecValue(spec.fieldName, checked ? "true" : "false")}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={spec.fieldName} className="space-y-2">
                                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                            {spec.fieldName} {spec.required && !isDetailMode && <span className="text-red-500">*</span>}
                                        </label>
                                        {isDetailMode ? (
                                            <input className={READ_ONLY_INPUT_CLASSNAME + " w-full rounded-md px-3"} value={specValue || "N/A"} readOnly />
                                        ) : (
                                            <Input
                                                type={spec.inputType === "Date" ? "date" : spec.inputType === "Number" ? "number" : "text"}
                                                value={specValue}
                                                onChange={(e) => updateModelSpecValue(spec.fieldName, e.target.value)}
                                                placeholder={`Enter ${spec.fieldName.toLowerCase()}`}
                                                required={spec.required}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="space-y-3 border-t pt-4">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground block`}>Model Image</label>
                    <div className="space-y-4">
                        {(showModelImageUploader || (!hasSelectedModelImage && !isDetailMode)) && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsModelImageDragOver(true); }}
                                onDragLeave={() => setIsModelImageDragOver(false)}
                                onDrop={handleModelImageDrop}
                                onClick={() => modelImageInputRef.current?.click()}
                                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors
                                ${isModelImageDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50"}
                                `}
                            >
                                <div className="rounded-full bg-muted p-3">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Click or drag to upload</p>
                                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP, or SVG (Max 5MB)</p>
                                </div>
                                <input
                                    ref={modelImageInputRef}
                                    type="file"
                                    accept={MODEL_IMAGE_ACCEPT}
                                    className="hidden"
                                    onChange={(e) => handleModelImageSelection(e.target.files)}
                                />
                            </div>
                        )}
                        {hasSelectedModelImage && (
                            <div className="relative overflow-hidden rounded-lg border bg-muted/30 w-full aspect-video md:aspect-[21/9]">
                                <Image src={displayModelImageUrl} alt="Model Preview" fill className="object-contain p-4" unoptimized />
                                {!isDetailMode && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100">
                                        <button type="button" onClick={clearSelectedModelImage} className="flex flex-col items-center gap-2 text-foreground">
                                            <div className="rounded-full bg-background p-3 shadow-sm border"><ImagePlus className="h-5 w-5" /></div>
                                            <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}>Replace image</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {fieldError("modelImage") && <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>{fieldError("modelImage")}</p>}
                    </div>
                </div>

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
);

DeviceModelForm.displayName = "DeviceModelForm";
