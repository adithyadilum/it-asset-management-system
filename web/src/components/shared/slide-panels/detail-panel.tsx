"use client";

import * as React from "react";

import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";

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

const textXsMediumClass =
    "font-text-xs-medium text-(length:--text-xs-medium-font-size) leading-(--text-xs-medium-line-height) tracking-(--text-xs-medium-letter-spacing) [font-style:var(--text-xs-medium-font-style)]";
const textSmRegularClass =
    "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]";
const textSmSemiBoldClass =
    "font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) [font-style:var(--text-sm-semi-bold-font-style)]";

function renderBadge(badge: string | React.ReactNode, index: number) {
    if (typeof badge !== "string") {
        return <React.Fragment key={`badge-node-${index}`}>{badge}</React.Fragment>;
    }

    return (
        <span
            key={`badge-${badge}-${index}`}
            className={`inline-flex items-center rounded-md bg-muted px-2 py-0.5 ${textXsMediumClass} text-muted-foreground`}
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
                        <dt className={`${textSmSemiBoldClass} text-foreground`}>{field.label}</dt>
                        <dd className={`${textSmRegularClass} text-muted-foreground`}>{field.value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        ) : (
            <div className={`rounded-md bg-muted p-3 ${textSmRegularClass} text-muted-foreground`}>
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
