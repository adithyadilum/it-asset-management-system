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
                    <TabsList className="w-full justify-start gap-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

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
        />
    );
}
