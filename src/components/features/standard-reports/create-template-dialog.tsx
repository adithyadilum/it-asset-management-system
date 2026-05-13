'use client';

import { useCallback, useState, useTransition } from 'react';

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListFilter } from 'lucide-react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

import { createReportTemplate } from '@/actions/report-templates';
import {
  REPORT_DATA_SOURCES,
  REPORT_FIELD_OPTIONS,
} from '@/types/standard-reports';
import { FilterRow } from './standard-reports-page';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  filterOptions: {
    categories: { name: string; pillar: string }[];
    locations: string[];
    statuses: string[];
  };
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
  filterOptions,
}: CreateTemplateDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Basic information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Data source
  const [dataSource, setDataSource] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');

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
    setDateFrom('');
    setDateTo('');
    setCategory('');
    setLocation('');
    setStatus('');
    setSelectedFields([]);
    setSortDirection('asc');
    setError(null);
  }, []);

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
      const result = await createReportTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
        dataSource,
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          category: category || undefined,
          location: location || undefined,
          status: status || undefined,
        },
        fields: selectedFields,
        sortDirection,
      });

      if (result.success) {
        resetForm();
        onOpenChange(false);
        onCreated();
      } else {
        setError(result.message);
      }
    });
  }, [
    name,
    description,
    isActive,
    dataSource,
    dateFrom,
    dateTo,
    category,
    location,
    status,
    selectedFields,
    sortDirection,
    resetForm,
    onOpenChange,
    onCreated,
  ]);

  // Split fields into two columns for the checkbox grid
  const midpoint = Math.ceil(REPORT_FIELD_OPTIONS.length / 2);
  const leftFields = REPORT_FIELD_OPTIONS.slice(0, midpoint);
  const rightFields = REPORT_FIELD_OPTIONS.slice(midpoint);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">
            Add New Template
          </DialogTitle>
          <DialogDescription>
            Create and configure reusable report templates with custom filters.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="flex flex-col gap-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className={TYPOGRAPHY_CLASSNAMES.textSmSemiBold}>
                Basic Information
              </h3>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                <Label htmlFor="template-name" className="text-sm font-medium">
                  <span className="text-destructive">*</span>Report Name:
                </Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Assets by Department - Q1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
                <Label className="text-sm font-medium">
                  Report Code:
                </Label>
                <Input
                  value="Auto-generated"
                  disabled
                  className="text-muted-foreground"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-start">
                <Label htmlFor="template-description" className="text-sm font-medium pt-2">
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
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            {/* Primary Data Source */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-center">
              <Label className="text-sm font-medium">
                Primary Data Source:
              </Label>
              <Select value={dataSource} onValueChange={setDataSource}>
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
                    <span className="text-destructive">*</span>Filters
                  </CardTitle>
                  <ListFilter className="size-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-4 pt-3">
                <FilterRow label="Date Range">
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </FilterRow>

                <FilterRow label="Category">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterRow>

                <FilterRow label="Location">
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterRow>

                <FilterRow label="Status">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterRow>
              </CardContent>
            </Card>

            {/* Report Fields */}
            <div className="space-y-3">
              <h3 className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                Report Fields:
              </h3>
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

        {/* Error display */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter className="px-6 py-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
