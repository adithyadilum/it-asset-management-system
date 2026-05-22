import { StandardReportsShell } from '@/components/features/standard-reports/standard-reports-shell';
import { getStandardReportsFilterOptions } from '@/actions/standard-reports';
import { getReportTemplates } from '@/actions/report-templates';
import type { ReportTemplateData } from '@/types/standard-reports';

export default async function Page() {
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

  return <StandardReportsShell filterOptions={filterOptions} templates={templates} />;
}
