import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterRow, ReportTemplateCard, type ReportTemplate } from '@/components/features/reports/standard-reports/standard-reports-page';

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    title: 'Monthly Depreciation',
    description: 'Calculates straight-line value reduction for all active hardware.',
    icon: FileText,
  },
  {
    title: 'Overdue / Missing',
    description: 'Lists all loaner devices past their return date and flagged lost items.',
    icon: AlertTriangle,
  },
  {
    title: 'Software Compliance',
    description: 'Identifies expired licenses and under-utilized seat allocations.',
    icon: ShieldCheck,
  },
];

const SOURCE_OPTIONS = ['Asset Registry', 'Operations Ledger', 'Master Data'];
const CATEGORY_OPTIONS = ['All categories', 'Hardware', 'Software', 'Office'];
const LOCATION_OPTIONS = ['All locations', 'Colombo HQ', 'Kandy Branch', 'Remote'];
const STATUS_OPTIONS = ['All statuses', 'Active', 'Pending', 'Flagged', 'Archived'];

export default function Page() {
  return (
    <div className="flex h-full flex-1 flex-col gap-6 overflow-hidden bg-muted/50 p-4 sm:p-6">

      <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[450px_1fr]">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
          <div className="space-y-1.5 px-0 py-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Standard Reports
            </h2>
            <p className="text-base leading-6 text-muted-foreground">
              Generate, preview, and export compliance and financial intelligence.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {REPORT_TEMPLATES.map((template) => (
              <ReportTemplateCard key={template.title} {...template} />
            ))}

            <Card
              size="sm"
              className="items-center justify-center border-dashed border-border/70 bg-background text-center shadow-sm"
            >
              <CardContent className="flex min-h-[11rem] flex-col items-center justify-center gap-4 px-5 py-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground">
                  <Plus className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-card-foreground">
                    Add new report template
                  </p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Extend the standard reporting library with a reusable template.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="gap-0 border-border/70 bg-background shadow-sm">
                <CardContent className="space-y-6 px-6 py-6">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:items-center">
                    <div className="text-sm font-medium text-foreground">Primary Data Source</div>
                    <Select defaultValue={SOURCE_OPTIONS[0]}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-0 border-border bg-card shadow-sm">
                <CardHeader className="flex flex-col items-start gap-6 px-6 pt-6">
                  <div className="flex w-full items-center justify-start gap-2.5">
                    <CardTitle className="flex-1 text-base font-medium text-card-foreground">
                      Filters
                    </CardTitle>
                    <Filter className="size-5 text-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 px-6 pb-6">
                  <FilterRow label="Date Range">
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal text-foreground"
                    >
                      <span>June 01, 2025 - June 01, 2025</span>
                      <CalendarDays className="size-4" />
                    </Button>
                  </FilterRow>

                  <FilterRow label="Category">
                    <Select defaultValue={CATEGORY_OPTIONS[0]}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select a Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterRow>

                  <FilterRow label="Location">
                    <Select defaultValue={LOCATION_OPTIONS[0]}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select a Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterRow>

                  <FilterRow label="Status">
                    <Select defaultValue={STATUS_OPTIONS[0]}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select a Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterRow>

                  <div className="flex flex-wrap justify-end gap-2.5">
                    <Button variant="secondary" size="sm">
                      Clear filters
                    </Button>
                    <Button size="sm">
                      Preview report
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>

        <Card className="flex h-full min-h-0 flex-col gap-0 border-border bg-background shadow-sm">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Report Preview (Showing first 0 rows)
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <Button className="bg-success text-success-foreground hover:bg-success/80" size="sm">
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button variant="default" size="sm">
                  Generate PDF
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex h-full flex-1 items-center justify-center px-6 py-6">
              <div className="flex max-w-lg flex-col items-center gap-4 text-center text-muted-foreground">
                <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-muted/30 text-foreground">
                  <Filter className="size-6" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-lg font-normal leading-7 text-muted-foreground">
                    Select your filters and click Preview Data to see results here.
                  </p>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
