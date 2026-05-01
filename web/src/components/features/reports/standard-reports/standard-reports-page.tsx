import { ChevronRight, FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ReportTemplate = {
  title: string;
  description: string;
  icon: typeof FileText;
};

export function ReportTemplateCard({ title, description, icon: Icon }: ReportTemplate) {
  return (
    <Card size="sm" className="justify-between border-border/70 shadow-sm">
      <CardHeader className="gap-4 px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-medium text-card-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-5 text-muted-foreground">
              {description}
            </CardDescription>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 p-2 text-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <Button size="sm" className="w-full sm:w-auto">
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
