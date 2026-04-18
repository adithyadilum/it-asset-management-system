"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";

interface FormPanelProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
    isSubmitting?: boolean;
    submitLabel?: string;
    submittingLabel?: string;
    cancelLabel?: string;
    showCloseButton?: boolean;
}

export function FormPanel({
    isOpen,
    onClose,
    title,
    description,
    children,
    onSubmit,
    isSubmitting = false,
    submitLabel = "Submit",
    submittingLabel = "Submitting...",
    cancelLabel = "Cancel",
    showCloseButton = true,
}: FormPanelProps) {
    const formRef = React.useRef<HTMLFormElement>(null);

    const actions: SlidePanelAction[] = [
        {
            id: "cancel",
            label: cancelLabel,
            variant: "outline",
            onClick: () => onClose(false),
            disabled: isSubmitting,
        },
        {
            id: "submit",
            label: isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>{submittingLabel}</span>
                </span>
            ) : (
                submitLabel
            ),
            onClick: () => formRef.current?.requestSubmit(),
            disabled: isSubmitting,
        },
    ];

    const formContent = (
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            {React.Children.count(children) > 0 ? (
                children
            ) : (
                <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    Add form fields as children to the FormPanel component.
                </div>
            )}
        </form>
    );

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            content={formContent}
            actions={actions}
            showCloseButton={showCloseButton}
        />
    );
}
