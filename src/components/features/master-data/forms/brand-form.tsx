"use client";

import { useState, useEffect } from "react";
import type { MasterDataBrandRow } from "../master-data-management-client";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { ActiveStatusToggle } from "../active-status-toggle";
import {
    type BaseMasterDataFormProps,
    FormTextField,
    RecordIdPreview,
} from "./shared";

interface BrandFormProps extends BaseMasterDataFormProps {
    initialData?: MasterDataBrandRow;
}

export function BrandForm({
    initialData,
    isDetailMode,
    fieldError,
    onDirtyStateChange,
}: BrandFormProps) {
    const isEdit = !!initialData;
    const [name, setName] = useState(initialData?.name || "");
    const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

    useEffect(() => {
        if (!initialData) return;
        const dirty = name !== initialData.name || isActive !== initialData.isActive;
        onDirtyStateChange?.(dirty);
    }, [name, isActive, initialData, onDirtyStateChange]);

    return (
        <>
            <input type="hidden" name="isActive" value={String(isActive)} />

            {isEdit && initialData && (
                <RecordIdPreview entity="brands" record={initialData as unknown as Record<string, unknown>} numericRecordId={initialData.id} />
            )}

            <FormTextField
                fieldKey="name"
                label="Brand Name"
                value={name}
                onChange={setName}
                isDetailMode={isDetailMode}
                fieldError={fieldError}
                options={{ required: true, placeholder: "e.g., Apple, Dell, Herman Miller" }}
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
