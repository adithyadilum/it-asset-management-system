"use client";

import { useState, useEffect } from "react";
import type { MasterDataOwnerRow } from "../master-data-management-client";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { ActiveStatusToggle } from "../active-status-toggle";
import {
    type BaseMasterDataFormProps,
    FormTextField,
    RecordIdPreview,
} from "./shared";

interface OwnerFormProps extends BaseMasterDataFormProps {
    initialData?: MasterDataOwnerRow;
}

export function OwnerForm({
    initialData,
    isDetailMode,
    fieldError,
    onDirtyStateChange,
}: OwnerFormProps) {
    const isEdit = !!initialData;
    const [companyName, setCompanyName] = useState(initialData?.companyName || "");
    const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

    useEffect(() => {
        if (!initialData) return;
        const dirty = companyName !== initialData.companyName || isActive !== initialData.isActive;
        onDirtyStateChange?.(dirty);
    }, [companyName, isActive, initialData, onDirtyStateChange]);

    return (
        <>
            <input type="hidden" name="isActive" value={String(isActive)} />

            {isEdit && initialData && (
                <RecordIdPreview entity="owners" record={initialData as unknown as Record<string, unknown>} numericRecordId={initialData.id} />
            )}

            <FormTextField
                fieldKey="companyName"
                label="Owner Name"
                value={companyName}
                onChange={setCompanyName}
                isDetailMode={isDetailMode}
                fieldError={fieldError}
                options={{ required: true, placeholder: "e.g., TIQRI LK" }}
            />

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
