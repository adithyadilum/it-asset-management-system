import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { StandardReportsShell } from '@/components/features/standard-reports/standard-reports-shell';
import { getStandardReportsFilterOptions } from '@/actions/standard-reports';
import { getReportTemplates } from '@/actions/report-templates';
import { requirePageAuth } from '@/lib/auth/page-guard';
import type { ReportTemplateData } from '@/types/standard-reports';

async function PageContent() {
  const currentUser = await requirePageAuth();

  const [filterOptions, rawTemplates] = await Promise.all([
    getStandardReportsFilterOptions(),
    getReportTemplates(),
  ]);

  // Map DB rows to the client-side ReportTemplateData shape
  const templates: ReportTemplateData[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    reportCode: t.reportCode,
    description: t.description,
    isActive: t.isActive,
    dataSource: t.dataSource,
    filters: (t.filters as ReportTemplateData['filters']) ?? null,
    fields: (t.fields as string[]) ?? null,
    sortDirection: t.sortDirection,
    createdAt: t.createdAt,
  }));

  return (
    <StandardReportsShell
      filterOptions={filterOptions}
      templates={templates}
      generatedBy={currentUser.name}
    />
  );
}

/**
 * Streams rather than blocks.
 *
 * The body above reads the session and queries the database, none of
 * which can be prerendered. Keeping the default export synchronous lets
 * this route paint its chrome immediately and fill in the content when
 * the data arrives, instead of the navigation waiting on the slowest
 * query.
 */
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent />
    </Suspense>
  );
}
