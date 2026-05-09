"use client";

import * as React from "react";

import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";

export type DetailPanelField = {
    label: React.ReactNode;
    value: React.ReactNode;
};

interface DetailPanelProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    fields: DetailPanelField[];
    badges?: Array<string | React.ReactNode>;
    actions?: SlidePanelAction[];
}

function renderBadge(badge: string | React.ReactNode, index: number) {
    if (typeof badge !== "string") {
        return <React.Fragment key={`badge-node-${index}`}>{badge}</React.Fragment>;
    }

    return (
        <span
            key={`badge-${badge}-${index}`}
            className={`inline-flex items-center rounded-md bg-muted px-2 py-0.5 ${TYPOGRAPHY_CLASSNAMES.textXsMedium} text-muted-foreground`}
        >
            {badge}
        </span>
    );
}

const defaultActions: SlidePanelAction[] = [
    { id: "archive", label: "Archive", variant: "outline" },
    { id: "print-label", label: "Print Label", variant: "outline" },
    { id: "edit", label: "Edit", variant: "default" },
];

export function DetailPanel({
    isOpen,
    onClose,
    title,
    description,
    fields,
    badges,
    actions,
}: DetailPanelProps) {
    const titleNode = (
        <span className="flex flex-wrap items-center gap-2">
            <span>{title}</span>
            {badges?.map((badge, index) => renderBadge(badge, index))}
        </span>
    );

    const content =
        fields.length > 0 ? (
            <dl className="grid grid-cols-[minmax(120px,170px)_1fr] gap-x-4 gap-y-3">
                {fields.map((field, index) => (
                    <React.Fragment key={`detail-field-${index}`}>
                        <dt className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}>{field.label}</dt>
                        <dd className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{field.value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        ) : (
            <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                No detail fields were provided.
            </div>
        );

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={titleNode}
            description={description}
            content={content}
            actions={actions ?? defaultActions}
        />
    );
}
