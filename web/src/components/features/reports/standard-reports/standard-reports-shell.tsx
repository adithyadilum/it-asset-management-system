'use client';

import { StandardReportsConfigPanel } from './standard-reports-config-panel';
import { StandardReportsPreviewPanel } from './standard-reports-preview-panel';

export function StandardReportsShell() {
  return (
    <div className="flex h-full flex-1 flex-col gap-6 overflow-hidden bg-muted p-1">
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[524px_minmax(0,1fr)]">
        <StandardReportsConfigPanel />
        <StandardReportsPreviewPanel />
      </div>
    </div>
  );
}
