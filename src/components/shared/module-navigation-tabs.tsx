"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ModuleTab {
  id: string; // Unique identifier (e.g., "locations", "categories")
  label: string; // Display label (e.g., "Locations", "Asset Categories")
  content?: React.ReactNode; // Optional: Content to display in this tab
}

export interface ModuleNavigationTabsProps {
  // Tab Configuration
  tabs: ModuleTab[];
  defaultTab?: string; // ID of the tab to show by default (defaults to first tab)

  // Callbacks
  onTabChange?: (tabId: string) => void;

  // Styling
  containerClassName?: string;
  listClassName?: string; // For the background container of the tabs
  triggerClassName?: string; // For the individual tab buttons

  // Children (alternative to content prop)
  children?: React.ReactNode;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ModuleNavigationTabs = React.forwardRef<
  HTMLDivElement,
  ModuleNavigationTabsProps
>(
  (
    {
      tabs,
      defaultTab,
      onTabChange,
      containerClassName = "",
      listClassName = "",
      triggerClassName = "",
      children,
    },
    ref
  ) => {
    // Determine the default tab
    const activeTabId = defaultTab || tabs[0]?.id;

    const handleTabChange = (tabId: string) => {
      onTabChange?.(tabId);
    };

    return (
      <Tabs
        ref={ref}
        defaultValue={activeTabId}
        onValueChange={handleTabChange}
        className={cn("w-full", containerClassName)} // Keeps the overall container full width
      >
        {/* ===== TAB LIST (Navigation) ===== */}
        <TabsList
          className={cn(
            // Container styles
            "h-9 w-fit gap-2 rounded-lg bg-slate-50 p-1", // CHANGED: w-full to w-fit
            // Flexbox layout
            "inline-flex items-center justify-start",
            // Custom className for the list background
            listClassName
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                // Default state (inactive)
                "relative h-7 rounded-md border border-transparent px-2 py-1",
                "text-sm font-medium text-slate-500",
                "bg-transparent hover:text-slate-600 transition-colors",
                "cursor-pointer",

                // Active state
                "data-[state=active]:bg-white",
                "data-[state=active]:text-slate-900",
                "data-[state=active]:border-slate-200",
                "data-[state=active]:shadow-sm",

                // Accessibility
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                
                // Custom className for individual triggers
                triggerClassName
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== TAB CONTENT ===== */}
        <div className="mt-4 flex flex-1 flex-col min-h-0">
          {/* If children provided, render them */}
          {children}

          {/* If content prop provided on tabs, render TabsContent */}
          {!children &&
            tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 focus-visible:outline-none"
              >
                {tab.content}
              </TabsContent>
            ))}
        </div>
      </Tabs>
    );
  }
);

ModuleNavigationTabs.displayName = "ModuleNavigationTabs";