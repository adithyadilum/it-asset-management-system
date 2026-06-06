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
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { FilterRow, SOURCE_OPTIONS } from '@/components/features/standard-reports/standard-reports-page';
import { ReportTemplateCard } from '@/components/features/standard-reports/report-template-card';
import {
  type FilterState,
  type ReportTemplateData,
  type FilterOptions,
  REPORT_FILTERS_BY_SOURCE,
} from '@/types/standard-reports';
import { CreateTemplateDialog } from './create-template-dialog';

interface StandardReportsConfigPanelProps {
  filterState: FilterState;
  filterOptions: FilterOptions;
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
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplateData | undefined>();

  // Map UI Asset Types to DB Pillars for filtering category options
  const typeToPillarMap: Record<string, string> = {
    'Hardware': 'Hardware',
    'Software': 'Software',
    'Electronics': 'Office Electronics',
    'Furniture': 'Office Furniture',
  };

  const selectedPillar = typeToPillarMap[filterState.assetType];

  const filteredCategories = filterOptions.categories
    .filter((cat) => !selectedPillar || cat.pillar === selectedPillar)
    .map((cat) => cat.name)
    .sort();

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...filteredCategories.map((opt) => ({ value: opt, label: opt })),
  ];

  const locationOptions = [
    { value: '', label: 'All Locations' },
    ...filterOptions.locations.filter((x) => x !== 'All locations').map((opt) => ({ value: opt, label: opt })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.statuses.filter((x) => x !== 'All statuses').map((opt) => ({ value: opt, label: opt })),
  ];

  const assignmentStateOptions = [
    { value: '', label: 'All States' },
    ...filterOptions.assignmentStates.filter((x) => x !== 'All States').map((opt) => ({ value: opt, label: opt })),
  ];

  const returnConditionOptions = [
    { value: '', label: 'All Conditions' },
    ...filterOptions.returnConditions.filter((x) => x !== 'All Conditions').map((opt) => ({ value: opt, label: opt })),
  ];

  const maintenanceStatusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.maintenanceStatuses.filter((x) => x !== 'All Statuses').map((opt) => ({ value: opt, label: opt })),
  ];

  const disposalStatusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.disposalStatuses.filter((x) => x !== 'All Statuses').map((opt) => ({ value: opt, label: opt })),
  ];

  const licenseTypeOptions = [
    { value: '', label: 'All Types' },
    ...filterOptions.licenseTypes.filter((x) => x !== 'All Types').map((opt) => ({ value: opt, label: opt })),
  ];

  const auditActionOptions = [
    { value: '', label: 'All Actions' },
    ...filterOptions.auditActionTypes.filter((x) => x !== 'All Actions').map((opt) => ({ value: opt, label: opt })),
  ];

  const vendorOptions = [
    { value: '', label: 'All Vendors' },
    ...filterOptions.vendors.filter((x) => x !== 'All Vendors').map((opt) => ({ value: opt, label: opt })),
  ];

  const masterDataTypeOptions = filterOptions.masterDataTypes;

  const optionsMap: Record<string, { value: string; label: string }[]> = {
    categories: categoryOptions,
    locations: locationOptions,
    statuses: statusOptions,
    assignmentStates: assignmentStateOptions,
    returnConditions: returnConditionOptions,
    maintenanceStatuses: maintenanceStatusOptions,
    disposalStatuses: disposalStatusOptions,
    licenseTypes: licenseTypeOptions,
    auditActionTypes: auditActionOptions,
    vendors: vendorOptions,
    masterDataTypes: masterDataTypeOptions,
  };

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
                onEditClick={(template) => {
                  setEditingTemplate(template);
                  setDialogOpen(true);
                }}
                onDeleteClick={onTemplateDelete}
              />
            ))}

            <Card
              size="sm"
              className="h-full cursor-pointer items-center justify-center border-dashed border-border bg-background text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => {
                setEditingTemplate(undefined);
                setDialogOpen(true);
              }}
            >
              <CardContent className="flex flex-col items-center justify-center gap-4 p-4 text-center">
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
            {filterState.source && REPORT_FILTERS_BY_SOURCE[filterState.source] ? (
              REPORT_FILTERS_BY_SOURCE[filterState.source].map((filter) => {
                if (filter.type === 'select') {
                  const opts = filter.optionsKey === 'ticketTypes'
                    ? ['All Types', 'VENDOR', 'INTERNAL']
                    : filterOptions.assetTypes;

                  const placeholderVal = filter.optionsKey === 'ticketTypes' ? 'All Types' : 'All Assets';

                  return (
                    <FilterRow key={filter.key} label={filter.label}>
                      <Select
                        value={filterState[filter.key] || '__all__'}
                        onValueChange={(value) => onFilterChange(filter.key, value === '__all__' ? '' : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={placeholderVal} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">{placeholderVal}</SelectItem>
                          {opts.filter(x => x !== 'All Assets' && x !== 'All Types').map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterRow>
                  );
                }

                if (filter.type === 'searchable') {
                  const opts = filter.optionsKey ? optionsMap[filter.optionsKey] : [];
                  const emptyMsg = `No ${filter.label.toLowerCase()} found.`;
                  return (
                    <FilterRow key={filter.key} label={filter.label}>
                      <SearchableDropdown
                        value={filterState[filter.key] || ''}
                        onSelect={(value) => onFilterChange(filter.key, value)}
                        placeholder={`Select ${filter.label}`}
                        emptyMessage={emptyMsg}
                        options={opts}
                      />
                    </FilterRow>
                  );
                }

                if (filter.type === 'date') {
                  return (
                    <FilterRow key={filter.key} label={filter.label}>
                      <Input
                        type="date"
                        value={filterState[filter.key] || ''}
                        onChange={(e) => onFilterChange(filter.key, e.target.value)}
                        className="w-full bg-background"
                      />
                    </FilterRow>
                  );
                }

                return null;
              })
            ) : (
              <div className="text-center text-sm py-4 text-muted-foreground">
                Please select a primary data source first.
              </div>
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
        editingTemplate={editingTemplate}
      />
    </div>
  );
}
