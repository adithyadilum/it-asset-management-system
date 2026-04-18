"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SlidePanelAction = {
    id?: string;
    label: React.ReactNode;
    variant?: React.ComponentProps<typeof Button>["variant"];
    onClick?: () => void;
    disabled?: boolean;
};

interface SlidePanelProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    headerContent?: React.ReactNode;
    content?: React.ReactNode;
    actions?: SlidePanelAction[];
    /** Render close action in header */
    showCloseButton?: boolean;
}

const DEFAULT_PANEL_WIDTH = 700;
const DEFAULT_PANEL_MAX_WIDTH = "92vw";
const DEFAULT_PANEL_GAP = 12;
const DEFAULT_PLACEHOLDER_ROWS = 10;
const textSmRegularClass =
    "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]";
const textLgSemiBoldClass =
    "font-text-lg-semi-bold text-(length:--text-lg-semi-bold-font-size) leading-(--text-lg-semi-bold-line-height) tracking-(--text-lg-semi-bold-letter-spacing) [font-style:var(--text-lg-semi-bold-font-style)]";

function PanelPlaceholder() {
    return (
        <div className="space-y-3">
            <div className={`rounded-md bg-muted p-3 ${textSmRegularClass} text-muted-foreground`}>
                No panel body content was provided. Pass the content prop to render custom details.
            </div>

            {Array.from({ length: DEFAULT_PLACEHOLDER_ROWS }).map((_, i) => (
                <div
                    key={i}
                    className={`flex h-12 items-center rounded-md bg-muted px-3 ${textSmRegularClass} text-muted-foreground`}
                >
                    Placeholder Row {i + 1}
                </div>
            ))}
        </div>
    );
}

export function SlidePanel({
    isOpen,
    onClose,
    title,
    description,
    headerContent,
    content,
    actions,
    showCloseButton = true,
}: SlidePanelProps) {
    const titleId = React.useId();
    const descriptionId = React.useId();
    const hasProvidedContent = React.Children.count(content) > 0;
    const resolvedActions = actions ?? [];
    const panelStyle = {
        "--slide-panel-width": `min(${DEFAULT_PANEL_WIDTH}px, ${DEFAULT_PANEL_MAX_WIDTH})`,
        "--slide-panel-gap": `${DEFAULT_PANEL_GAP}px`,
    } as React.CSSProperties;

    return (
        <aside
            className={cn(
                "relative h-full shrink-0 overflow-hidden",
                "transition-[width,margin] duration-300 ease-out",
                isOpen ? "ml-(--slide-panel-gap) w-(--slide-panel-width)" : "ml-0 w-0"
            )}
            style={panelStyle}
            aria-hidden={!isOpen}
        >
            <section
                role="dialog"
                aria-modal="false"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                className={cn(
                    "absolute inset-y-0 right-0 w-(--slide-panel-width)",
                    "overflow-hidden rounded-xl bg-card shadow-box-shadow-shadow-lg",
                    "transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full",
                )}
            >
                <div className="flex h-full min-h-0 flex-col">
                    <header className="shrink-0 px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 id={titleId} className={`${textLgSemiBoldClass} text-foreground`}>
                                    {title}
                                </h2>
                                {description && (
                                    <p id={descriptionId} className={`mt-1 ${textSmRegularClass} text-muted-foreground`}>
                                        {description}
                                    </p>
                                )}
                            </div>

                            {showCloseButton && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="-mr-1 -mt-1 text-muted-foreground hover:bg-muted"
                                    onClick={() => onClose(false)}
                                    aria-label="Close panel"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </header>

                    {headerContent && (
                        <div className="shrink-0 px-5 pb-2 sm:px-6">
                            {headerContent}
                        </div>
                    )}

                    <ScrollArea className="min-h-0 flex-1">
                        <div className="px-5 py-5 sm:px-6">
                            {hasProvidedContent ? content : <PanelPlaceholder />}
                        </div>
                    </ScrollArea>

                    {resolvedActions.length > 0 && (
                        <footer className="shrink-0 px-5 py-4 sm:px-6">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {resolvedActions.map((action, index) => (
                                    <Button
                                        key={action.id ?? `${String(action.label)}-${index}`}
                                        type="button"
                                        variant={action.variant ?? (index === resolvedActions.length - 1 ? "default" : "outline")}
                                        onClick={() => {
                                            if (action.onClick) {
                                                action.onClick();
                                                return;
                                            }
                                            onClose(false);
                                        }}
                                        disabled={action.disabled}
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </footer>
                    )}
                </div>
            </section>
        </aside>
    );
}