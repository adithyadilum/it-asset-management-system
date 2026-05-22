'use client';

import { type ReactNode } from 'react';
import { REPORT_DATA_SOURCES } from '@/types/standard-reports';

export const SOURCE_OPTIONS = [...REPORT_DATA_SOURCES];

/**
 * Renders the appropriate Lucide icon for the given data source.
 */
// The ReportTemplateCard has been extracted to
// src/components/features/standard-reports/report-template-card.tsx

export function FilterRow({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] md:items-center">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
