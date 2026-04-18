// src/app/(app-shell)/sandbox/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetailPanel } from "@/components/shared/slide-panels/detail-panel";
import { FormPanel } from "@/components/shared/slide-panels/form-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { TabbedPanel } from "@/components/shared/slide-panels/tabbed-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";

type PanelKey = "form" | "detail" | "tabbed";

export default function UIPlaygroundPage() {
    const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBadgeIcons, setShowBadgeIcons] = useState(true);
    const [unknownBadgeValue, setUnknownBadgeValue] = useState("Retired");

    const assetStatusCases = ["available", "assigned", "new", "in_repair", "lost", "defective"];
    const hardwareConditionCases = ["pristine", "damaged", "broken"];
    const userRoleCases = ["GlobalAdmin", "ITOperator", "Employee"];

    const openPanel = (panel: PanelKey) => setActivePanel(panel);
    const closePanel = () => setActivePanel(null);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);

        await new Promise((resolve) => {
            window.setTimeout(resolve, 900);
        });

        setIsSubmitting(false);
        closePanel();
    };

    const detailFields = [
        { label: "Asset ID", value: "LAP-HR-220" },
        { label: "Model", value: "ThinkPad T14" },
        { label: "Serial Number", value: "PC1A2B3C" },
        { label: "Assigned to", value: "Mark Kim" },
        { label: "Last Repair", value: "08/10/2025" },
        { label: "Warranty", value: "Active" },
    ];

    const tabbedPanelTabs = [
        {
            id: "details",
            label: "Details",
            content: (
                <div className="space-y-3">
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>User Summary</p>
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                        Maria is a full-time employee in IT Operations with direct access to asset assignment and maintenance workflows.
                    </p>
                    <div className="rounded-md bg-muted p-3">
                        <dl className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <dt className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-foreground`}>Department</dt>
                                <dd className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>IT Operations</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-foreground`}>Role</dt>
                                <dd className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>ITOperator</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <dt className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-foreground`}>Location</dt>
                                <dd className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>Colombo HQ</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            ),
        },
        {
            id: "history",
            label: "Audit Log",
            content: (
                <div className="space-y-3">
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Recent Activity</p>
                    {[
                        "Assigned LAP-HR-220 to Mark Kim",
                        "Updated warranty metadata",
                        "Added maintenance note for battery health",
                        "Generated monthly assignment report",
                    ].map((item, index) => (
                        <div key={item} className="rounded-md bg-muted px-3 py-2">
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{index + 1}. {item}</p>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            id: "devices",
            label: "Devices",
            content: (
                <div className="space-y-3">
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Assigned Devices</p>
                    {[
                        "LAP-HR-220 - ThinkPad T14",
                        "MON-OPS-044 - Dell 27\"",
                        "DOCK-IT-101 - Thunderbolt Dock",
                    ].map((device) => (
                        <div key={device} className="rounded-md bg-muted px-3 py-2">
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{device}</p>
                        </div>
                    ))}
                </div>
            ),
        },
    ];

    return (
        <div className="flex h-full min-h-0 bg-muted">
            <div className="flex min-w-0 flex-1 flex-col gap-6 rounded-lg bg-background p-4 sm:p-6">
                <div className="px-1">
                    <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}>TIQRI Design Sandbox</h1>
                    <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>Isolate and test shared components here.</p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dashed border-border bg-muted p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>Slide Panel Archetype Triggers</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => openPanel("form")}>Open FormPanel</Button>
                            <Button variant="outline" onClick={() => openPanel("detail")}>Open DetailPanel</Button>
                            <Button variant="outline" onClick={() => openPanel("tabbed")}>Open TabbedPanel</Button>
                            <Button onClick={closePanel}>Close Active</Button>
                        </div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 sm:gap-4">
                        <div className="rounded-xl bg-card p-4">
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>FormPanel</p>
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                Workhorse for create/edit flows with built-in form wrapper, submit loading state, and standardized Cancel/Submit actions.
                            </p>
                        </div>

                        <div className="rounded-xl bg-card p-4">
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>DetailPanel</p>
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                Read-only viewer optimized for key-value data using description lists and optional badges in the header.
                            </p>
                        </div>

                        <div className="rounded-xl bg-card p-4">
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>TabbedPanel</p>
                            <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                Complex entity viewer with tab navigation below the header and stable scroll behavior while switching tabs.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-card p-4 sm:p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Status Badge Testing Suite</p>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                                    Validate all known badge states, icon toggle behavior, and unknown fallback rendering.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBadgeIcons((value) => !value)}
                            >
                                {showBadgeIcons ? "Hide Icons" : "Show Icons"}
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}>Asset Status</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {assetStatusCases.map((value) => (
                                        <StatusBadge key={value} value={value} showIcon={showBadgeIcons} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}>Hardware Condition</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {hardwareConditionCases.map((value) => (
                                        <StatusBadge key={value} value={value} showIcon={showBadgeIcons} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}>User Role</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {userRoleCases.map((value) => (
                                        <StatusBadge key={value} value={value} showIcon={showBadgeIcons} />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}>Fallback Case (Unknown Value)</p>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <Input
                                        value={unknownBadgeValue}
                                        onChange={(event) => setUnknownBadgeValue(event.target.value)}
                                        placeholder="Type unknown badge value"
                                        className="sm:max-w-70"
                                    />
                                    <StatusBadge value={unknownBadgeValue} showIcon={showBadgeIcons} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FormPanel
                isOpen={activePanel === "form"}
                onClose={(open) => setActivePanel(open ? "form" : null)}
                title="Create Category"
                description="Use this archetype for creating or editing records."
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Create Category"
                submittingLabel="Creating Category..."
            >
                <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input id="category-name" placeholder="e.g. Network Equipment" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category-code">Category Code</Label>
                    <Input id="category-code" placeholder="e.g. NET-OPS" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category-notes">Notes</Label>
                    <Input id="category-notes" placeholder="Optional description" />
                </div>
            </FormPanel>

            <DetailPanel
                isOpen={activePanel === "detail"}
                onClose={(open) => setActivePanel(open ? "detail" : null)}
                title="Laptop Overview"
                description="Read-only entity details using standardized definition-list layout."
                badges={["In Use", "Healthy"]}
                fields={detailFields}
                actions={[
                    { id: "archive", label: "Archive", variant: "outline" },
                    { id: "print", label: "Print Label", variant: "outline" },
                    { id: "edit", label: "Edit" },
                ]}
            />

            <TabbedPanel
                isOpen={activePanel === "tabbed"}
                onClose={(open) => setActivePanel(open ? "tabbed" : null)}
                title="User Profile"
                description="Tabbed archetype for large entities with segmented information."
                tabs={tabbedPanelTabs}
                defaultTabId="details"
                actions={[
                    { id: "deactivate", label: "Deactivate", variant: "outline" },
                    { id: "save", label: "Save Changes" },
                ]}
            />
        </div>
    );
}