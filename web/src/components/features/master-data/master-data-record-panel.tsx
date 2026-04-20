"use client";

import {
    useCallback,
    useMemo,
    useRef,
    useState,
    useTransition,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
    updateMasterDataRecord,
} from "@/actions/master-data";
import {
    INITIAL_UPDATE_MASTER_DATA_STATE,
    MASTER_DATA_RECORD_ENTITIES,
} from "@/lib/master-data/shared";
import type { MasterDataRecordEntity } from "@/types/master-data";
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

import type {
    MasterDataBrandRow,
    MasterDataCategoryRow,
    MasterDataDepartmentRow,
    MasterDataDeviceModelRow,
    MasterDataLocationRow,
    MasterDataVendorRow,
} from "./master-data-management-client";

type PanelMode = "detail" | "edit";
type EditableValue = string | boolean;

type EditableFieldConfig = {
    key: string;
    label: string;
    inputType: "text" | "boolean" | "select";
    options?: Array<{ label: string; value: string }>;
};

interface MasterDataRecordPanelProps {
    isOpen: boolean;
    onCloseUrl: string;
    entity?: string;
    recordId?: string;
    initialMode?: string;
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    departments: MasterDataDepartmentRow[];
}

const ENTITY_LABELS: Record<MasterDataRecordEntity, string> = {
    locations: "Location",
    "asset-categories": "Category",
    brands: "Brand",
    "device-models": "Device Model",
    vendors: "Vendor",
    departments: "Department",
};

const EDITABLE_FIELDS: Record<MasterDataRecordEntity, EditableFieldConfig[]> = {
    locations: [
        { key: "name", label: "Location Name", inputType: "text" },
        { key: "type", label: "Type", inputType: "text" },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
    "asset-categories": [
        { key: "name", label: "Category Name", inputType: "text" },
        { key: "prefix", label: "Prefix Code", inputType: "text" },
        {
            key: "pillar",
            label: "Pillar",
            inputType: "select",
            options: [
                { label: "IT & Digital", value: "IT & Digital" },
                { label: "Software", value: "Software" },
                { label: "Office Furniture", value: "Office Furniture" },
                { label: "Office Electronics", value: "Office Electronics" },
            ],
        },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
    brands: [
        { key: "name", label: "Brand Name", inputType: "text" },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
    "device-models": [
        { key: "name", label: "Model Name", inputType: "text" },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
    vendors: [
        { key: "companyName", label: "Vendor Name", inputType: "text" },
        { key: "contactInfo", label: "Contact Info", inputType: "text" },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
    departments: [
        { key: "name", label: "Department Name", inputType: "text" },
        { key: "shortCode", label: "Department Code", inputType: "text" },
        { key: "costCenterId", label: "Cost Center ID", inputType: "text" },
        { key: "isActive", label: "Active", inputType: "boolean" },
    ],
};

function isRecordEntity(value: string | undefined): value is MasterDataRecordEntity {
    return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

function normalizePanelMode(value: string | undefined): PanelMode {
    return value === "edit" ? "edit" : "detail";
}

function toRecordValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function formatDisplayValue(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "N/A";
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    return String(value);
}

function humanizeKey(key: string) {
    return key
        .replace(/_/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
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

function resolveRecordByEntity(
    entity: MasterDataRecordEntity,
    numericId: number,
    sources: {
        categories: MasterDataCategoryRow[];
        locations: MasterDataLocationRow[];
        brands: MasterDataBrandRow[];
        deviceModels: MasterDataDeviceModelRow[];
        vendors: MasterDataVendorRow[];
        departments: MasterDataDepartmentRow[];
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
        case "departments":
            return sources.departments.find((row) => row.id === numericId) ?? null;
    }
}

export function MasterDataRecordPanel({
    isOpen,
    onCloseUrl,
    entity,
    recordId,
    initialMode,
    categories,
    locations,
    brands,
    deviceModels,
    vendors,
    departments,
}: MasterDataRecordPanelProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState(INITIAL_UPDATE_MASTER_DATA_STATE);

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
            departments,
        });
    }, [
        brands,
        categories,
        departments,
        deviceModels,
        locations,
        normalizedEntity,
        numericRecordId,
        vendors,
    ]);

    const editableFields = useMemo(
        () => (normalizedEntity ? EDITABLE_FIELDS[normalizedEntity] : []),
        [normalizedEntity]
    );

    const initialDraft = useMemo(() => {
        if (!selectedRecord || !normalizedEntity) {
            return {} as Record<string, EditableValue>;
        }

        const record = selectedRecord as Record<string, unknown>;
        const nextDraft: Record<string, EditableValue> = {};

        for (const field of EDITABLE_FIELDS[normalizedEntity]) {
            const value = record[field.key];
            nextDraft[field.key] =
                field.inputType === "boolean" ? Boolean(value) : toRecordValue(value);
        }

        return nextDraft;
    }, [normalizedEntity, selectedRecord]);

    const [mode, setMode] = useState<PanelMode>(normalizePanelMode(initialMode));
    const [draft, setDraft] = useState<Record<string, EditableValue>>(initialDraft);

    const handleClose = useCallback(
        (open: boolean) => {
            if (!open) {
                setMode("detail");
                setState(INITIAL_UPDATE_MASTER_DATA_STATE);
                setDraft(initialDraft);
                router.push(onCloseUrl, { scroll: false });
            }
        },
        [initialDraft, onCloseUrl, router]
    );

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
                const result = await updateMasterDataRecord(
                    INITIAL_UPDATE_MASTER_DATA_STATE,
                    formData
                );

                setState(result);

                if (result.success) {
                    setMode("detail");
                    router.refresh();
                }
            });
        },
        [router]
    );

    const panelTitle = useMemo(() => {
        if (!normalizedEntity || !selectedRecord) {
            return "Record Details";
        }

        const record = selectedRecord as Record<string, unknown>;
        const heading = resolveRecordTitle(record);

        return `${ENTITY_LABELS[normalizedEntity]}: ${heading}`;
    }, [normalizedEntity, selectedRecord]);

    const panelDescription = mode === "detail"
        ? "Review the selected row details."
        : "Edit and save changes for this record.";

    const detailContent = useMemo(() => {
        if (!selectedRecord) {
            return (
                <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    The selected record could not be found.
                </div>
            );
        }

        const recordEntries = Object.entries(selectedRecord as Record<string, unknown>);

        return (
            <dl className="grid grid-cols-[minmax(120px,180px)_1fr] gap-x-4 gap-y-3">
                {recordEntries.map(([key, value]) => (
                    <div key={key} className="contents">
                        <dt className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}>
                            {humanizeKey(key)}
                        </dt>
                        <dd className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                            {formatDisplayValue(value)}
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }, [selectedRecord]);

    const formContent = (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="entity" value={normalizedEntity ?? ""} />
            <input type="hidden" name="id" value={Number.isFinite(numericRecordId) ? String(numericRecordId) : ""} />

            {editableFields.map((field) => {
                const fieldValue = draft[field.key];
                const fieldError = state.errors?.[field.key]?.[0];

                if (field.inputType === "boolean") {
                    const checked = Boolean(fieldValue);

                    return (
                        <div key={field.key} className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{field.label}</label>
                            <input type="hidden" name={field.key} value={String(checked)} />
                            <div className="flex h-10 items-center justify-between rounded-md border border-border px-3">
                                <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                    {checked ? "Active" : "Inactive"}
                                </span>
                                <Switch
                                    checked={checked}
                                    onCheckedChange={(value) =>
                                        setDraft((previous) => ({
                                            ...previous,
                                            [field.key]: value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    );
                }

                if (field.inputType === "select") {
                    const value = toRecordValue(fieldValue);

                    return (
                        <div key={field.key} className="space-y-2">
                            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{field.label}</label>
                            <input type="hidden" name={field.key} value={value} />
                            <Select
                                value={value}
                                onValueChange={(nextValue) =>
                                    setDraft((previous) => ({
                                        ...previous,
                                        [field.key]: nextValue,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldError && (
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                    {fieldError}
                                </p>
                            )}
                        </div>
                    );
                }

                return (
                    <div key={field.key} className="space-y-2">
                        <label htmlFor={`record-field-${field.key}`} className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                            {field.label}
                        </label>
                        <Input
                            id={`record-field-${field.key}`}
                            name={field.key}
                            value={toRecordValue(fieldValue)}
                            onChange={(event) =>
                                setDraft((previous) => ({
                                    ...previous,
                                    [field.key]: event.target.value,
                                }))
                            }
                        />
                        {fieldError && (
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                                {fieldError}
                            </p>
                        )}
                    </div>
                );
            })}

            {state.message && !state.success && (
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                    {state.message}
                </p>
            )}
        </form>
    );

    const actions: SlidePanelAction[] = mode === "detail"
        ? [
            {
                id: "close",
                label: "Close",
                variant: "outline",
                onClick: () => handleClose(false),
            },
            {
                id: "edit",
                label: "Edit",
                onClick: () => {
                    setDraft(initialDraft);
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

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={handleClose}
            title={panelTitle}
            description={panelDescription}
            content={mode === "detail" ? detailContent : formContent}
            actions={actions}
        />
    );
}
