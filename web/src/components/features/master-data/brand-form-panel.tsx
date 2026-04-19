"use client";

import { useActionState, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    createBrand,
    INITIAL_BRAND_FORM_STATE,
} from "@/actions/master-data";
import { FormPanel } from "@/components/shared/slide-panels/form-panel";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface BrandFormPanelProps {
    isOpen: boolean;
    onCloseUrl: string;
}

export function BrandFormPanel({ isOpen, onCloseUrl }: BrandFormPanelProps) {
    const router = useRouter();
    const [isActive, setIsActive] = useState(true);
    const [state, formAction, isPending] = useActionState(
        createBrand,
        INITIAL_BRAND_FORM_STATE
    );

    const handleClose = useCallback((open: boolean) => {
        if (!open) {
            router.push(onCloseUrl, { scroll: false });
        }
    }, [onCloseUrl, router]);

    const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        formAction(new FormData(event.currentTarget));
    }, [formAction]);

    useEffect(() => {
        if (state.success) {
            handleClose(false);
        }
    }, [handleClose, state.success]);

    return (
        <FormPanel
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Brand"
            description="Register a new manufacturer in the system."
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            submitLabel="Save Brand"
            submittingLabel="Saving Brand..."
        >
            <input type="hidden" name="isActive" value={String(isActive)} />

            <div className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Brand Name</label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Apple, Dell, Herman Miller"
                        required
                    />
                    {state.errors?.name && (
                        <p className="text-sm text-red-500">{state.errors.name[0]}</p>
                    )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium">Active Status</label>
                        <p className="text-sm text-slate-500">Allow this brand to be selected for new assets.</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                {state.message && !state.success && (
                    <p className="text-sm font-medium text-red-500">{state.message}</p>
                )}
            </div>
        </FormPanel>
    );
}