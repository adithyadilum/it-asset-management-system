"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
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
    disableTransition?: boolean;
    onClose: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    headerContent?: React.ReactNode;
    content?: React.ReactNode;
    actions?: SlidePanelAction[];
    showCloseButton?: boolean;
}

const DEFAULT_PANEL_WIDTH = 700;
const DEFAULT_PANEL_MAX_WIDTH = "92vw";
const DEFAULT_PLACEHOLDER_ROWS = 10;

function PanelPlaceholder() {
    return (
        <div className="space-y-3">
            <div className={`rounded-md bg-slate-50 p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                No panel body content was provided. Pass the content prop to render custom details.
            </div>

            {Array.from({ length: DEFAULT_PLACEHOLDER_ROWS }).map((_, i) => (
                <div
                    key={i}
                    className={`flex h-12 items-center rounded-md bg-slate-50 px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}
                >
                    Placeholder Row {i + 1}
                </div>
            ))}
        </div>
    );
}

export function SlidePanel({
    isOpen,
    disableTransition = false,
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

    React.useEffect(() => {
        if (isOpen) {
            setShouldRender(true);

            if (disableTransition) {
                setIsVisible(true);
                return;
            }

            const frameId = window.requestAnimationFrame(() => {
                setIsVisible(true);
            });

            return () => window.cancelAnimationFrame(frameId);
        }

        setIsVisible(false);

        if (disableTransition) {
            setShouldRender(false);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setShouldRender(false);
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [disableTransition, isOpen]);

    return (
        <aside
            className={cn(
                "relative shrink-0",
                "transition-all duration-300 ease-in-out",
                isOpen ? "ml-6" : "ml-0"
            )}
            style={{
                width: isOpen ? `min(${DEFAULT_PANEL_WIDTH}px, ${DEFAULT_PANEL_MAX_WIDTH})` : "0px",
            }}
            aria-hidden={!isOpen}
        >
            <section
                role="dialog"
                aria-modal="false"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                // Removed overflow-hidden and absolute h-full to prevent scrolling
                className="right-0 flex flex-col rounded-xl bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1)] border border-slate-200 mb-6"
                style={{ width: `min(${DEFAULT_PANEL_WIDTH}px, ${DEFAULT_PANEL_MAX_WIDTH})` }}
            >
                <div className="flex flex-col">
                    <header className="shrink-0 px-6 py-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 id={titleId} className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-slate-900`}>
                                    {title}
                                </h2>
                                {description && (
                                    <p id={descriptionId} className={`mt-1 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>
                                        {description}
                                    </p>
                                )}
                            </div>

                            {showCloseButton && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="-mr-2 -mt-2 text-slate-500 hover:bg-slate-100"
                                    onClick={() => onClose(false)}
                                    aria-label="Close panel"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </header>

                    {headerContent && (
                        <div className="shrink-0 px-6 pb-2">
                            {headerContent}
                        </div>
                    )}

                    {/* Standard div instead of ScrollArea */}
                    <div className="px-6 pb-6 flex-1">
                        {hasProvidedContent ? content : <PanelPlaceholder />}
                    </div>

                    {resolvedActions.length > 0 && (
                        <footer className="shrink-0 px-6 py-4 border-t border-slate-200">
                            <div className="flex flex-wrap items-center justify-end gap-3">
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