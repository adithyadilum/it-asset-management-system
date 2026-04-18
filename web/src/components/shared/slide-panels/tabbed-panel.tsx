"use client";

import * as React from "react";

import { SlidePanel, type SlidePanelAction } from "@/components/shared/slide-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const textSmRegularClass =
    "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]";

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

    React.useEffect(() => {
        const next = getInitialTabId(tabs, defaultTabId);
        if (next !== activeTabId) {
            setActiveTabId(next);
        }
    }, [activeTabId, defaultTabId, tabs]);

    const activeTab = tabs.find((tab) => tab.id === activeTabId);

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

    const tabsHeader =
        tabs.length > 0 ? (
            <Tabs value={activeTabId} onValueChange={handleTabChange}>
                <TabsList className="w-full justify-start gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        ) : null;

    const content = activeTab ? (
        <div ref={contentRef}>{activeTab.content}</div>
    ) : (
        <div className={`rounded-md bg-muted p-3 ${textSmRegularClass} text-muted-foreground`}>
            No tabs were provided.
        </div>
    );

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            headerContent={tabsHeader}
            content={content}
            actions={actions}
        />
    );
}
