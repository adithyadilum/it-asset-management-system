"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    /** Render close action in header */
    showCloseButton?: boolean;
}

const DEFAULT_PANEL_WIDTH = 700;
const DEFAULT_PANEL_MAX_WIDTH = "92vw";
const DEFAULT_PANEL_GAP = 8;
const DEFAULT_PLACEHOLDER_ROWS = 10;

function PanelPlaceholder() {
    return (
        <div className="space-y-3">
            <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                No panel body content was provided. Pass the content prop to render custom details.
            </div>

            {Array.from({ length: DEFAULT_PLACEHOLDER_ROWS }).map((_, i) => (
                <div
                    key={i}
                    className={`flex h-12 items-center rounded-md bg-muted px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
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
    const [shouldRender, setShouldRender] = React.useState(isOpen);
    const [isVisible, setIsVisible] = React.useState(false);
    const panelStyle = {
        "--slide-panel-width": `min(${DEFAULT_PANEL_WIDTH}px, ${DEFAULT_PANEL_MAX_WIDTH})`,
        "--slide-panel-gap": `${DEFAULT_PANEL_GAP}px`,
    } as React.CSSProperties;

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
                "relative h-full shrink-0 overflow-hidden",
                "transition-[width,margin] ease-out",
                disableTransition ? "duration-0" : "duration-300",
                isVisible ? "ml-(--slide-panel-gap) w-(--slide-panel-width)" : "ml-0 w-0",
                !isVisible && "pointer-events-none"
            )}
            style={panelStyle}
            aria-hidden={!shouldRender || !isVisible}
        >
            {shouldRender ? (
                <section
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby={titleId}
                    aria-describedby={description ? descriptionId : undefined}
                    className={cn(
                        "absolute inset-y-0 right-0 w-(--slide-panel-width)",
                        "overflow-hidden rounded-xl bg-card shadow-box-shadow-shadow-lg",
                        "transition-transform ease-out",
                        disableTransition ? "duration-0" : "duration-300",
                        isVisible ? "translate-x-0" : "translate-x-full",
                    )}
                >
                    <div className="flex h-full min-h-0 flex-col">
                        <header className="shrink-0 px-5 py-4 sm:px-6">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 id={titleId} className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>
                                        {title}
                                    </h2>
                                    {description && (
                                        <p id={descriptionId} className={`mt-1 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
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
            ) : null}
        </aside>
    );
}