import { Input } from "@/components/ui/input";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import type { MasterDataRecordEntity } from "@/types/master-data";

export const READ_ONLY_INPUT_CLASSNAME =
    "h-9 bg-muted font-mono tracking-wide text-foreground pointer-events-none";

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

export function resolveRecordCode(
    entity: MasterDataRecordEntity,
    code: string | null | undefined,
    numericId: number
) {
    if (code && code.trim().length > 0) {
        return code;
    }

    return `${ENTITY_ID_PREFIX[entity]}-${String(numericId).padStart(4, "0")}`;
}

export function RecordIdPreview({
    entity,
    record,
    numericRecordId,
}: {
    entity: MasterDataRecordEntity;
    record: Record<string, unknown>;
    numericRecordId: number;
}) {
    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                    {ENTITY_LABELS[entity]} ID
                </label>
                <Input
                    value={resolveRecordCode(
                        entity,
                        record.code as string | undefined,
                        numericRecordId
                    )}
                    readOnly
                    tabIndex={-1}
                    onFocus={(event) => event.currentTarget.blur()}
                    className={READ_ONLY_INPUT_CLASSNAME}
                />
            </div>
        </div>
    );
}

export interface MasterDataFormRef {
    augmentFormData?: (formData: FormData) => void;
}

export interface BaseMasterDataFormProps {
    isDetailMode?: boolean;
    fieldError: (fieldName: string) => string | undefined;
    onDirtyStateChange?: (isDirty: boolean) => void;
}

export function FormTextField({
    fieldKey,
    label,
    value,
    onChange,
    isDetailMode,
    fieldError,
    options
}: {
    fieldKey: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    isDetailMode?: boolean;
    fieldError: (field: string) => string | undefined;
    options?: {
        required?: boolean;
        readOnly?: boolean;
        placeholder?: string;
        type?: "text" | "email" | "url";
        autoUppercase?: boolean;
    };
}) {
    const isActuallyReadOnly = isDetailMode || options?.readOnly;

    return (
        <div className="space-y-2">
            <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                {label} {options?.required && !isActuallyReadOnly ? <span className="text-red-500">*</span> : null}
            </label>
            {isActuallyReadOnly ? (
                <Input
                    type={options?.type || "text"}
                    value={value || "N/A"}
                    readOnly
                    tabIndex={-1}
                    onFocus={(event) => event.currentTarget.blur()}
                    className={READ_ONLY_INPUT_CLASSNAME}
                />
            ) : (
                <>
                    <Input
                        type={options?.type || "text"}
                        name={fieldKey}
                        value={value}
                        onChange={(event) => {
                            let val = event.target.value;
                            if (options?.autoUppercase) {
                                val = val.toUpperCase();
                            }
                            onChange(val);
                        }}
                        placeholder={options?.placeholder}
                        required={options?.required}
                    />
                    {fieldError(fieldKey) ? (
                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
                            {fieldError(fieldKey)}
                        </p>
                    ) : null}
                </>
            )}
        </div>
    );
}
