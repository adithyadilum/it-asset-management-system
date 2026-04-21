'use client';

import * as React from 'react';

import { TabbedPanel, type TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SoftwarePage() {
    const [isPanelOpen, setIsPanelOpen] = React.useState(false);

    const tabs: TabbedPanelTab[] = [
        {
            id: 'license',
            label: 'License',
            content: (
                <div className="grid gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="software-name">Software Name</Label>
                        <Input id="software-name" placeholder="Microsoft 365" />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="license-key">License Key</Label>
                        <Input id="license-key" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
                    </div>
                </div>
            ),
        },
        {
            id: 'subscription',
            label: 'Subscription',
            content: (
                <div className="grid gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="renewal-date">Renewal Date</Label>
                        <Input id="renewal-date" type="date" />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="seats">Seats</Label>
                        <Input id="seats" type="number" min="1" placeholder="50" />
                    </div>
                </div>
            ),
        },
    ];

    const actions: SlidePanelAction[] = [
        {
            id: 'cancel',
            label: 'Cancel',
            variant: 'outline',
            onClick: () => setIsPanelOpen(false),
        },
        {
            id: 'save',
            label: 'Save',
            onClick: () => setIsPanelOpen(false),
        },
    ];

    return (
        <div className="flex min-h-0 flex-1 overflow-hidden p-4 md:p-6">
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">
                            Software Registry
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage software licenses and subscriptions.
                        </p>
                    </div>

                    <Button type="button" onClick={() => setIsPanelOpen(true)}>
                        Add Software Asset
                    </Button>
                </div>

                <div className="min-h-0 flex-1 p-6">
                    <div className="flex h-full min-h-0 flex-col rounded-xl border border-dashed border-border bg-background p-6">
                        <p className="text-sm text-muted-foreground">
                            Software table integration can be mounted here.
                        </p>
                    </div>
                </div>
            </div>

            <TabbedPanel
                isOpen={isPanelOpen}
                onClose={setIsPanelOpen}
                title="Software Asset Registry"
                description="Create and track software assets"
                tabs={tabs}
                defaultTabId="license"
                actions={actions}
            />
        </div>
    );
}