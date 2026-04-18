// src/app/(app-shell)/sandbox/page.tsx
"use client";

import { useState } from "react";
import { SlidePanel } from "../../../components/shared/slide-panel";
import { Button } from "@/components/ui/button";

const textXsRegularClass =
    "font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) [font-style:var(--text-xs-regular-font-style)]";
const textSmRegularClass =
    "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]";
const textSmMediumClass =
    "font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) [font-style:var(--text-sm-medium-font-style)]";
const textLgSemiBoldClass =
    "font-text-lg-semi-bold text-(length:--text-lg-semi-bold-font-size) leading-(--text-lg-semi-bold-line-height) tracking-(--text-lg-semi-bold-letter-spacing) [font-style:var(--text-lg-semi-bold-font-style)]";
const text2xlSemiBoldClass =
    "font-text-2xl-semi-bold text-(length:--text-2xl-semi-bold-font-size) leading-(--text-2xl-semi-bold-line-height) tracking-(--text-2xl-semi-bold-letter-spacing) [font-style:var(--text-2xl-semi-bold-font-style)]";

export default function UIPlaygroundPage() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex h-full min-h-0 bg-muted">
            <div className="flex min-w-0 flex-1 flex-col gap-6 rounded-lg bg-background p-4 sm:p-6">
                <div className="px-1">
                    <h1 className={`${text2xlSemiBoldClass} text-foreground`}>TIQRI Design Sandbox</h1>
                    <p className={`${textSmRegularClass} text-muted-foreground`}>Isolate and test shared components here.</p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dashed border-border bg-muted p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className={`${textLgSemiBoldClass} text-foreground`}>Right Slide Panel Push Test</h2>
                        <Button onClick={() => setIsOpen((open) => !open)}>
                            {isOpen ? "Close Panel" : "Open Panel"}
                        </Button>
                    </div>
                </div>
            </div>

            <SlidePanel
                isOpen={isOpen}
                onClose={setIsOpen}
                title="Asset Details Panel"
                description="Reusable push panel with fixed styling and content-driven props."
                secondaryAction={{
                    label: "Cancel",
                    variant: "outline",
                    onClick: () => setIsOpen(false),
                }}
                primaryAction={{
                    label: "Save",
                    onClick: () => setIsOpen(false),
                }}
            />
        </div>
    );
}