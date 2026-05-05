'use client';

import { CalendarDays, ChevronRight, ListFilter, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import {
  CATEGORY_OPTIONS,
  FilterRow,
  LOCATION_OPTIONS,
  REPORT_TEMPLATES,
  ReportTemplateCard,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
} from '@/components/features/reports/standard-reports/standard-reports-page';

export function StandardReportsConfigPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl gap-0 bg-background">
      {/* Header Section - Fixed */}
      <div className="px-4 pt-4 pb-0 shrink-0">
        <div className="space-y-1.5">
          <h2 className={TYPOGRAPHY_CLASSNAMES.text2xlSemiBold}>
            Standard Reports
          </h2>
        </div>
      </div>

      {/* Template List Section - Flexible Growth */}
      <div className="flex flex-1 min-h-0 flex-col gap-0">
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {REPORT_TEMPLATES.map((template) => (
              <ReportTemplateCard key={template.title} {...template} />
            ))}

            <Card
              size="sm"
              className="h-full items-center justify-center border-dashed border-border bg-background text-center"
            >
              <CardContent className="flex min-h-[11rem] flex-col items-center justify-center gap-4 p-4 text-center">
                <Plus className="size-6 text-foreground" />
                <div className="space-y-1.5">
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                    Add new report template
                  </p>
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                    Extend the standard reporting library with a reusable template.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Footer Configuration Section - Fixed */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-4 shrink-0">
        <div className="grid gap-3 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:items-center">
          <div className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
            Primary Data Source
          </div>
          <Select>
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

        <Card className="gap-0 border-border bg-card">
          <CardHeader className="flex flex-col items-start gap-4 p-4">
            <div className="flex w-full items-center justify-start gap-2.5">
              <CardTitle className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                Filters
              </CardTitle>
              <ListFilter className="size-5 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4 pt-3">
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
                <SelectTrigger className="w-full">
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
                <SelectTrigger className="w-full">
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
                <SelectTrigger className="w-full">
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
  );
}
