import {
  ChevronRight,
  Database,
  FileText,
  HardDrive,
  Monitor,
  ScrollText,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ReportTemplateData } from '@/types/standard-reports';

export const SOURCE_OPTIONS = ['Asset Registry', 'Operations Ledger', 'Master Data'];

/**
 * Renders the appropriate Lucide icon for the given data source.
 */
function DataSourceIcon({ dataSource, className }: { dataSource: string; className?: string }) {
  switch (dataSource) {
    case 'Assets':
      return <HardDrive className={className} />;
    case 'Maintenance Records':
      return <Wrench className={className} />;
    case 'Disposal Records':
      return <FileText className={className} />;
    case 'Software Licenses':
      return <Monitor className={className} />;
    case 'Audit Logs':
      return <ScrollText className={className} />;
    default:
      return <Database className={className} />;
  }
}

interface ReportTemplateCardProps {
  template: ReportTemplateData;
  onPreviewClick?: (templateId: number) => void;
}

export function ReportTemplateCard({
  template,
  onPreviewClick,
}: ReportTemplateCardProps) {
  return (
    <Card size="sm" className="h-full justify-between border-border bg-background">
      <CardHeader className="gap-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium text-card-foreground">
              {template.name}
            </CardTitle>
            <CardDescription className="text-sm leading-5 text-muted-foreground">
              {template.description || template.dataSource}
            </CardDescription>
          </div>
          <DataSourceIcon dataSource={template.dataSource} className="size-4 shrink-0 text-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex px-4 pb-4">
        <Button
          size="sm"
          className="mx-auto w-auto px-3"
          onClick={() => onPreviewClick?.(template.id)}
        >
          Preview report
          <ChevronRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

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
