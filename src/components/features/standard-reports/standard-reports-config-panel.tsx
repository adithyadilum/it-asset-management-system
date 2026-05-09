'use client';

import { ChevronRight, ListFilter, Plus } from 'lucide-react';

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
  FilterRow,
  REPORT_TEMPLATES,
  ReportTemplateCard,
  SOURCE_OPTIONS,
} from '@/components/features/standard-reports/standard-reports-page';
import type { FilterState } from './standard-reports-types';

interface StandardReportsConfigPanelProps {
  filterState: FilterState;
  filterOptions: {
    categories: string[];
    locations: string[];
    statuses: string[];
  };
  onFilterChange: (field: keyof FilterState, value: string) => void;
  onTemplatePreview: (templateTitle: string) => void;
  onManualPreview: () => void;
  onClearFilters: () => void;
  isLoading: boolean;
}

export function StandardReportsConfigPanel({
  filterState,
  filterOptions,
  onFilterChange,
  onTemplatePreview,
  onManualPreview,
  onClearFilters,
  isLoading,
}: StandardReportsConfigPanelProps) {
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
              <ReportTemplateCard
                key={template.title}
                {...template}
                onPreviewClick={onTemplatePreview}
              />
            ))}

            <Card
              size="sm"
              className="h-full items-center justify-center border-dashed border-border bg-background text-center"
            >
              <CardContent className="flex min-h-44 flex-col items-center justify-center gap-4 p-4 text-center">
                <Plus className="size-6 text-foreground" />
                <div className="space-y-1.5">
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                    Add new report template
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
          <Select
            value={filterState.source || undefined}
            onValueChange={(value) => onFilterChange('source', value)}
          >
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
            <div className="flex w-full items-center justify-between gap-2.5">
              <CardTitle className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                Filters
              </CardTitle>
              <ListFilter className="size-5 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4 pt-3">
            {/*<FilterRow label="Date Range">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filterState.dateFrom || ''}
                  onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filterState.dateTo || ''}
                  onChange={(e) => onFilterChange('dateTo', e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="To"
                />
              </div>
            </FilterRow>*/}

            <FilterRow label="Category">
              <Select
                value={filterState.category || undefined}
                onValueChange={(value) => onFilterChange('category', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Category" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.categories.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterRow>

            <FilterRow label="Location">
              <Select
                value={filterState.location || undefined}
                onValueChange={(value) => onFilterChange('location', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Location" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.locations.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterRow>

            <FilterRow label="Status">
              <Select
                value={filterState.status || undefined}
                onValueChange={(value) => onFilterChange('status', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Status" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.statuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterRow>

            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
              <Button
                size="sm"
                onClick={onManualPreview}
                disabled={isLoading}
              >
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
