'use client';

import { ChevronRight, ListFilter, Plus } from 'lucide-react';
import { useState } from 'react';

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
  ReportTemplateCard,
  SOURCE_OPTIONS,
} from '@/components/features/standard-reports/standard-reports-page';
import type { FilterState, ReportTemplateData } from '@/types/standard-reports';
import { CreateTemplateDialog } from './create-template-dialog';

interface StandardReportsConfigPanelProps {
  filterState: FilterState;
  filterOptions: {
    assetTypes: string[];
    categories: { name: string; pillar: string }[];
    locations: string[];
    statuses: string[];
  };
  templates: ReportTemplateData[];
  onFilterChange: (field: keyof FilterState, value: string) => void;
  onTemplatePreview: (templateId: number) => void;
  onTemplateDelete: (templateId: number) => void;
  onManualPreview: () => void;
  onClearFilters: () => void;
  onTemplateCreated: () => void;
  isLoading: boolean;
  resetKey: number;
}

export function StandardReportsConfigPanel({
  filterState,
  filterOptions,
  templates,
  onFilterChange,
  onTemplatePreview,
  onTemplateDelete,
  onManualPreview,
  onClearFilters,
  onTemplateCreated,
  isLoading,
  resetKey,
}: StandardReportsConfigPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Map UI Asset Types to DB Pillars for filtering category options
  const typeToPillarMap: Record<string, string> = {
    'Hardware': 'IT & Digital',
    'Software': 'Software',
    'Electronics': 'Office Electronics',
    'Furniture': 'Office Furniture',
  };

  const selectedPillar = typeToPillarMap[filterState.assetType];

  const filteredCategories = filterOptions.categories
    .filter((cat) => !selectedPillar || cat.pillar === selectedPillar)
    .map((cat) => cat.name)
    .sort();

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
            {templates.map((template) => (
              <ReportTemplateCard
                key={template.id}
                template={template}
                onPreviewClick={onTemplatePreview}
                onDeleteClick={onTemplateDelete}
              />
            ))}

            <Card
              size="sm"
              className="h-full cursor-pointer items-center justify-center border-dashed border-border bg-background text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => setDialogOpen(true)}
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
      <div key={resetKey} className="flex flex-col gap-4 px-4 pt-4 pb-4 shrink-0">
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
            {filterState.source === 'Master Data' ? (
              <>
                <FilterRow label="Asset Type">
                  <Select
                    value={filterState.assetType || undefined}
                    onValueChange={(value) => onFilterChange('assetType', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Assets" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.assetTypes.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterRow>

                <FilterRow label="Record Type">
                  <Select
                    value={filterState.masterDataType || undefined}
                    onValueChange={(value) => onFilterChange('masterDataType', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Data Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset-categories">Asset Categories</SelectItem>
                      <SelectItem value="locations">Locations</SelectItem>
                      <SelectItem value="brands">Brands</SelectItem>
                      <SelectItem value="device-models">Device Models</SelectItem>
                      <SelectItem value="vendors">Vendors</SelectItem>
                      <SelectItem value="owners">Owners</SelectItem>
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
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterRow>
              </>
            ) : (
              <>
                <FilterRow label="Asset Type">
                  <Select
                    value={filterState.assetType || undefined}
                    onValueChange={(value) => onFilterChange('assetType', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Assets" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.assetTypes.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterRow>

                <FilterRow label="Category">
                  <Select
                    value={filterState.category || undefined}
                    onValueChange={(value) => onFilterChange('category', value)}
                    disabled={!filterState.assetType || filterState.assetType === 'All Assets'}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={!filterState.assetType || filterState.assetType === 'All Assets' ? 'Select Asset Type first' : 'All categories'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All categories">All categories</SelectItem>
                      {filteredCategories.map((option) => (
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
              </>
            )}

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

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onTemplateCreated}
        filterOptions={filterOptions}
      />
    </div>
  );
}
