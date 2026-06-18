"use client";

import { useState, useEffect } from "react";
import type { MasterDataDepartmentRow } from "../master-data-management-client";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { ActiveStatusToggle } from "../active-status-toggle";
import {
    type BaseMasterDataFormProps,
    FormTextField,
    RecordIdPreview,
} from "./shared";

interface DepartmentFormProps extends BaseMasterDataFormProps {
    initialData?: MasterDataDepartmentRow;
}

export function DepartmentForm({
    initialData,
    isDetailMode,
    fieldError,
    onDirtyStateChange,
}: DepartmentFormProps) {
    const isEdit = !!initialData;
    const [name, setName] = useState(initialData?.name || "");
    const [shortCode, setShortCode] = useState(initialData?.shortCode || "");
    const [costCenterId, setCostCenterId] = useState(initialData?.costCenterId || "");
    const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

    useEffect(() => {
        if (!initialData) return;
        const dirty =
            name !== initialData.name ||
            shortCode !== initialData.shortCode ||
            costCenterId !== (initialData.costCenterId || "") ||
            isActive !== initialData.isActive;
        onDirtyStateChange?.(dirty);
    }, [name, shortCode, costCenterId, isActive, initialData, onDirtyStateChange]);

    return (
        <>
            <input type="hidden" name="isActive" value={String(isActive)} />

            {isEdit && initialData && (
                <RecordIdPreview entity="departments" record={initialData as unknown as Record<string, unknown>} numericRecordId={initialData.id} />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormTextField
                    fieldKey="name"
                    label="Department Name"
                    value={name}
                    onChange={setName}
                    isDetailMode={isDetailMode}
                    fieldError={fieldError}
                    options={{ required: true, placeholder: "e.g., Human Resources" }}
                />
                <FormTextField
                    fieldKey="shortCode"
                    label="Department Code"
                    value={shortCode}
                    onChange={setShortCode}
                    isDetailMode={isDetailMode}
                    fieldError={fieldError}
                    options={{ required: true, placeholder: "HR", autoUppercase: true }}
                />
                <FormTextField
                    fieldKey="costCenterId"
                    label="Cost Center ID"
                    value={costCenterId}
                    onChange={setCostCenterId}
                    isDetailMode={isDetailMode}
                    fieldError={fieldError}
                    options={{ placeholder: "Optional cost center code" }}
                />
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
