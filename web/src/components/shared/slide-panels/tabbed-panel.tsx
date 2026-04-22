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
                    {/* Added a wrapper to push it left, and changed w-full to w-fit with Figma colors */}
                    <div className="w-full flex justify-start mb-[18px]">
                        <TabsList className="flex h-[36px] w-fit items-center justify-start rounded-[8px] bg-[#f8fafc] p-[3px] gap-[4px]">
                            {tabs.map((tab) => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="h-[29px] rounded-[6px] px-[12px] py-[4px] text-[14px] font-medium text-[#64748b] transition-all data-[state=active]:bg-[#ffffff] data-[state=active]:text-[#0f172a] data-[state=active]:shadow-[0px_1px_3px_rgba(0,0,0,0.1)] data-[state=active]:border data-[state=active]:border-[#e2e8f0] border border-transparent shrink-0"
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
