'use client';

import { useCallback, useState, useTransition, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListFilter } from 'lucide-react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { tiqriToast } from '@/components/shared/sonner';

import {
  createReportTemplate,
  updateReportTemplate,
} from '@/actions/report-templates';
import {
  REPORT_DATA_SOURCES,
  REPORT_FIELD_OPTIONS_BY_SOURCE,
  REPORT_FILTERS_BY_SOURCE,
  getPrimaryIdColumn,
  type ReportTemplateData,
  type FilterOptions,
} from '@/types/standard-reports';
import { formatAssignmentState } from '@/lib/assignments/labels';
import { FilterRow } from './standard-reports-page';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  filterOptions: FilterOptions;
  editingTemplate?: ReportTemplateData;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
  filterOptions,
  editingTemplate,
}: CreateTemplateDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Basic information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Data source
  const [dataSource, setDataSource] = useState('');

  // Filters
  const [assetType, setAssetType] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [masterDataType, setMasterDataType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fields
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Sort
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Error state
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setIsActive(true);
    setDataSource('');
    setAssetType('');
    setCategory('');
    setLocation('');
    setStatus('');
    setMasterDataType('');
    setDateFrom('');
    setDateTo('');
    setSelectedFields([]);
    setSortDirection('asc');
    setError(null);
  }, []);

  useEffect(() => {
    if (open && editingTemplate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(editingTemplate.name);
      setDescription(editingTemplate.description || '');
      setIsActive(editingTemplate.isActive);
      setDataSource(editingTemplate.dataSource);
      setAssetType(editingTemplate.filters?.assetType || '');
      setCategory(editingTemplate.filters?.category || '');
      setLocation(editingTemplate.filters?.location || '');
      setStatus(editingTemplate.filters?.status || '');
      setMasterDataType(editingTemplate.filters?.masterDataType || '');
      setDateFrom(editingTemplate.filters?.dateFrom || '');
      setDateTo(editingTemplate.filters?.dateTo || '');

      const fields = editingTemplate.fields || [];
      const primaryIdField = getPrimaryIdColumn(editingTemplate.dataSource);
      const primaryIdFields = [
        'Record ID',
        'Business Key',
        'Asset ID',
        'Asset Tag',
        'Record Code',
        'Assignment ID',
        'Return ID',
        'Ticket ID',
        'Disposal ID',
        'Purchase ID',
        'License ID',
        'Log ID',
      ];
      const normalizedFields = Array.from(
        new Set(
          fields.map((f) => (primaryIdFields.includes(f) ? primaryIdField : f))
        )
      );
      if (normalizedFields.includes(primaryIdField)) {
        normalizedFields.splice(normalizedFields.indexOf(primaryIdField), 1);
        normalizedFields.unshift(primaryIdField);
      }
      setSelectedFields(normalizedFields);

      setSortDirection(
        (editingTemplate.sortDirection as 'asc' | 'desc') || 'asc'
      );
    } else if (open && !editingTemplate) {
      resetForm();
    }
  }, [open, editingTemplate, resetForm]);

  const typeToPillarMap: Record<string, string> = {
    Hardware: 'Hardware',
    Software: 'Software',
    Electronics: 'Office Electronics',
    Furniture: 'Office Furniture',
  };

  const selectedPillar = typeToPillarMap[assetType];
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
    ...filterOptions.locations
      .filter((x) => x !== 'All locations')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.statuses
      .filter((x) => x !== 'All statuses')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const assignmentStateOptions = [
    { value: '', label: 'All States' },
    // Value stays the stored enum so the query is unaffected; only the option
    // text is humanised.
    ...filterOptions.assignmentStates
      .filter((x) => x !== 'All States')
      .map((opt) => ({ value: opt, label: formatAssignmentState(opt) })),
  ];

  const returnConditionOptions = [
    { value: '', label: 'All Conditions' },
    ...filterOptions.returnConditions
      .filter((x) => x !== 'All Conditions')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const maintenanceStatusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.maintenanceStatuses
      .filter((x) => x !== 'All Statuses')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const disposalStatusOptions = [
    { value: '', label: 'All Statuses' },
    ...filterOptions.disposalStatuses
      .filter((x) => x !== 'All Statuses')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const licenseTypeOptions = [
    { value: '', label: 'All Types' },
    ...filterOptions.licenseTypes
      .filter((x) => x !== 'All Types')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const auditActionOptions = [
    { value: '', label: 'All Actions' },
    ...filterOptions.auditActionTypes
      .filter((x) => x !== 'All Actions')
      .map((opt) => ({ value: opt, label: opt })),
  ];

  const vendorOptions = [
    { value: '', label: 'All Vendors' },
    ...filterOptions.vendors
      .filter((x) => x !== 'All Vendors')
      .map((opt) => ({ value: opt, label: opt })),
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

  const hasSelectedFieldChanges = (() => {
    if (!editingTemplate) return true;
    const oldFields = editingTemplate.fields || [];
    const primaryIdField = getPrimaryIdColumn(editingTemplate.dataSource);
    const primaryIdFields = [
      'Record ID',
      'Business Key',
      'Asset ID',
      'Asset Tag',
      'Record Code',
      'Assignment ID',
      'Return ID',
      'Ticket ID',
      'Disposal ID',
      'Purchase ID',
      'License ID',
      'Log ID',
    ];
    const normalizedOldFields = Array.from(
      new Set(
        oldFields.map((f) => (primaryIdFields.includes(f) ? primaryIdField : f))
      )
    );
    if (normalizedOldFields.includes(primaryIdField)) {
      normalizedOldFields.splice(
        normalizedOldFields.indexOf(primaryIdField),
        1
      );
      normalizedOldFields.unshift(primaryIdField);
    }

    if (selectedFields.length !== normalizedOldFields.length) return true;
    return selectedFields.some(
      (field, index) => field !== normalizedOldFields[index]
    );
  })();

  const hasTemplateChanges =
    !editingTemplate ||
    name.trim() !== editingTemplate.name ||
    description.trim() !== (editingTemplate.description || '') ||
    isActive !== editingTemplate.isActive ||
    dataSource !== editingTemplate.dataSource ||
    (assetType || '') !== (editingTemplate.filters?.assetType || '') ||
    (category || '') !== (editingTemplate.filters?.category || '') ||
    (location || '') !== (editingTemplate.filters?.location || '') ||
    (status || '') !== (editingTemplate.filters?.status || '') ||
    (masterDataType || '') !==
      (editingTemplate.filters?.masterDataType || '') ||
    (dateFrom || '') !== (editingTemplate.filters?.dateFrom || '') ||
    (dateTo || '') !== (editingTemplate.filters?.dateTo || '') ||
    sortDirection !== (editingTemplate.sortDirection as 'asc' | 'desc') ||
    hasSelectedFieldChanges;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm]
  );

  const toggleField = useCallback((field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!name.trim()) {
      setError('Report name is required.');
      return;
    }

    if (!dataSource) {
      setError('Please select a primary data source.');
      return;
    }

    if (selectedFields.length === 0) {
      setError('Please select at least one report field.');
      return;
    }

    startTransition(async () => {
      try {
        const templateData = {
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
          dataSource,
          filters: {
            assetType: assetType || undefined,
            category: category || undefined,
            location: location || undefined,
            status: status || undefined,
            masterDataType: masterDataType || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
          fields: selectedFields,
          sortDirection,
        };

        const result = editingTemplate
          ? await updateReportTemplate(editingTemplate.id, templateData)
          : await createReportTemplate(templateData);

        if (result.success) {
          tiqriToast.success(result.message);
          resetForm();
          onOpenChange(false);
          onCreated();
        } else {
          tiqriToast.error(result.message);
          setError(result.message);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';
        tiqriToast.error(message);
        setError(message);
      }
    });
  }, [
    name,
    description,
    isActive,
    dataSource,
    assetType,
    category,
    location,
    status,
    masterDataType,
    dateFrom,
    dateTo,
    selectedFields,
    sortDirection,
    onOpenChange,
    onCreated,
    editingTemplate,
    resetForm,
  ]);

  // Split fields into two columns for the checkbox grid
  const currentOptions =
    dataSource && REPORT_FIELD_OPTIONS_BY_SOURCE[dataSource]
      ? REPORT_FIELD_OPTIONS_BY_SOURCE[dataSource]
      : [];
  const midpoint = Math.ceil(currentOptions.length / 2);
  const leftFields = currentOptions.slice(0, midpoint);
  const rightFields = currentOptions.slice(midpoint);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-165 h-[90vh] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">
            {editingTemplate ? 'Update Report Template' : 'Add New Template'}
          </DialogTitle>
          <DialogDescription>
            {editingTemplate
              ? 'Update the details for this report template.'
              : 'Create and configure reusable report templates with custom filters.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 min-h-0 h-full overflow-hidden px-6">
            <div className="flex flex-col gap-6 py-4 pr-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className={TYPOGRAPHY_CLASSNAMES.textSmSemiBold}>
                  Basic Information
                </h3>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                  <Label
                    htmlFor="template-name"
                    className="text-sm font-medium"
                  >
                    Report Name<span className="text-destructive">*</span>:
                  </Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Assets by Department - Q1"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                  <Label className="text-sm font-medium">Report Code:</Label>
                  <Input
                    value="Auto-generated"
                    disabled
                    className="text-muted-foreground"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-start">
                  <Label
                    htmlFor="template-description"
                    className="text-sm font-medium pt-2"
                  >
                    Description:
                  </Label>
                  <Textarea
                    id="template-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe briefly about the report"
                    rows={3}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                  <Label className="text-sm font-medium">Is Active:</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>

              {/* Primary Data Source */}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                <Label className="text-sm font-medium">
                  Primary Data Source:
                </Label>
                <Select
                  value={dataSource}
                  onValueChange={(val) => {
                    setDataSource(val);
                    const sourceFields = REPORT_FIELD_OPTIONS_BY_SOURCE[val];
                    setSelectedFields(sourceFields ? [sourceFields[0]] : []);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose source" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_DATA_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filters */}
              <Card className="gap-0 border-border bg-card">
                <CardHeader className="flex flex-col items-start gap-4 p-4">
                  <div className="flex w-full items-center justify-between gap-2.5">
                    <CardTitle className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                      Filters<span className="text-destructive">*</span>
                    </CardTitle>
                    <ListFilter className="size-5 text-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-4 pt-3">
                  {dataSource && REPORT_FILTERS_BY_SOURCE[dataSource] ? (
                    REPORT_FILTERS_BY_SOURCE[dataSource].map((filter) => {
                      const valueMap: Record<string, string> = {
                        assetType,
                        category,
                        location,
                        status,
                        masterDataType,
                        dateFrom,
                        dateTo,
                      };

                      const setterMap: Record<string, (val: string) => void> = {
                        assetType: (val) => {
                          setAssetType(val);
                          if (filter.key === 'assetType') setCategory('');
                        },
                        category: setCategory,
                        location: setLocation,
                        status: setStatus,
                        masterDataType: setMasterDataType,
                        dateFrom: setDateFrom,
                        dateTo: setDateTo,
                      };

                      if (filter.type === 'select') {
                        const opts =
                          filter.optionsKey === 'ticketTypes'
                            ? ['All Types', 'VENDOR', 'INTERNAL']
                            : filterOptions.assetTypes;

                        const placeholderVal =
                          filter.optionsKey === 'ticketTypes'
                            ? 'All Types'
                            : 'All Assets';

                        return (
                          <FilterRow key={filter.key} label={filter.label}>
                            <Select
                              value={valueMap[filter.key] || '__all__'}
                              onValueChange={(value) =>
                                setterMap[filter.key](
                                  value === '__all__' ? '' : value
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={placeholderVal} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">
                                  {placeholderVal}
                                </SelectItem>
                                {opts
                                  .filter(
                                    (x) =>
                                      x !== 'All Assets' && x !== 'All Types'
                                  )
                                  .map((option) => (
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
                        const opts = filter.optionsKey
                          ? optionsMap[filter.optionsKey]
                          : [];
                        const emptyMsg = `No ${filter.label.toLowerCase()} found.`;
                        return (
                          <FilterRow key={filter.key} label={filter.label}>
                            <SearchableDropdown
                              value={valueMap[filter.key] || ''}
                              onSelect={setterMap[filter.key]}
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
                              value={valueMap[filter.key] || ''}
                              onChange={(e) =>
                                setterMap[filter.key](e.target.value)
                              }
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
                </CardContent>
              </Card>

              {/* Report Fields */}
              <div className="space-y-3">
                <h3 className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                  Report Fields:
                </h3>
                {currentOptions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div className="flex flex-col gap-3">
                      {leftFields.map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2.5 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedFields.includes(field)}
                            onCheckedChange={() => toggleField(field)}
                          />
                          {field}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {rightFields.map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2.5 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedFields.includes(field)}
                            onCheckedChange={() => toggleField(field)}
                          />
                          {field}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Please select a primary data source first to configure
                      report fields.
                    </p>
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="space-y-3">
                <h3 className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Sort:</h3>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sortDirection"
                      value="asc"
                      checked={sortDirection === 'asc'}
                      onChange={() => setSortDirection('asc')}
                      className="accent-primary h-4 w-4"
                    />
                    Ascending
                  </label>
                  <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sortDirection"
                      value="desc"
                      checked={sortDirection === 'desc'}
                      onChange={() => setSortDirection('desc')}
                      className="accent-primary h-4 w-4"
                    />
                    Descending
                  </label>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Error display */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending || (editingTemplate ? !hasTemplateChanges : false)
            }
          >
            {isPending
              ? 'Saving...'
              : editingTemplate
                ? 'Update Template'
                : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
