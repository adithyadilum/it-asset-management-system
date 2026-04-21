'use client';

import * as React from 'react';

import { FormPanel } from '@/components/shared/slide-panels/form-panel';
import { Button } from '@/components/ui/button';

export default function SoftwarePage() {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPanelOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            Software Registry
          </h1>

          <Button type="button" onClick={() => setIsPanelOpen(true)}>
            Add Software Asset
          </Button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Software page loaded with shared FormPanel integration.
        </p>
      </div>

      <FormPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Software Asset Registry"
        description="Create a new software asset"
        onSubmit={handleSubmit}
        submitLabel="Add Asset"
        cancelLabel="Discard"
        
      >
        <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Add software registration fields here.
        </div>
      </FormPanel>
    </div>
  );
}
