"use client";

import * as React from "react";

import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabbedPanelTab = {
    id: string;
    label: string;
    content: React.ReactNode;
};

interface TabbedPanelProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    tabs: TabbedPanelTab[];
    defaultTabId?: string;
    actions?: SlidePanelAction[];
}

function getInitialTabId(tabs: TabbedPanelTab[], preferredTabId?: string) {
    if (preferredTabId && tabs.some((tab) => tab.id === preferredTabId)) {
        return preferredTabId;
    }

    return tabs[0]?.id ?? "";
}

export function TabbedPanel({
    isOpen,
    onClose,
    title,
    description,
    tabs,
    defaultTabId,
    actions,
}: TabbedPanelProps) {
    const [activeTabId, setActiveTabId] = React.useState(() =>
        getInitialTabId(tabs, defaultTabId)
    );
    const contentRef = React.useRef<HTMLDivElement>(null);
    const fallbackTabId = React.useMemo(
        () => getInitialTabId(tabs, defaultTabId),
        [defaultTabId, tabs]
    );

    React.useEffect(() => {
        if (!fallbackTabId) {
            return;
        }

        const hasActiveTab = tabs.some((tab) => tab.id === activeTabId);

        if (!hasActiveTab) {
            setActiveTabId(fallbackTabId);
        }
    }, [activeTabId, fallbackTabId, tabs]);

    const handleTabChange = (nextTabId: string) => {
        const viewport = contentRef.current
            ?.closest("[data-slot='scroll-area']")
            ?.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement | null;

        const previousScrollTop = viewport?.scrollTop ?? 0;
        setActiveTabId(nextTabId);

        if (viewport) {
            requestAnimationFrame(() => {
                viewport.scrollTop = previousScrollTop;
            });
        }
    };

    const content =
        tabs.length > 0 ? (
            <div ref={contentRef}>
                <Tabs value={activeTabId} onValueChange={handleTabChange} className="space-y-3">
                    {/* Tab bar aligned left */}
                    <div className="mb-4 flex w-full justify-start">
                        <TabsList className="flex h-9 w-fit items-center justify-start gap-1 rounded-lg bg-muted p-0.5">
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="h-7 shrink-0 rounded-md border border-transparent px-3 py-1 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {tabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id} className="mt-0">
                            {tab.content}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        ) : (
            <div className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                No tabs were provided.
            </div>
        );

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            content={content}
            actions={actions}
            showCloseButton={true}
        />
    );
}
