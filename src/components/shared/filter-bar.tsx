'use client';

import { useState } from 'react';
import { Search, ChevronDown, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type FilterOperator = 'is' | 'is not';

export interface AppliedFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterFieldConfig {
  value: string;
  label: string;
  options?: string[]; // If undefined/empty, render text input
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  fields: FilterFieldConfig[];
  appliedFilters: AppliedFilter[];
  onApplyFilter: (filter: AppliedFilter) => void;
  onClearFilter: (field: string) => void;
  onClearAllFilters: () => void;
  children?: React.ReactNode; // Custom actions next to the Filter button
  defaultField?: string; // Which field to select by default in the dropdown
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  fields,
  appliedFilters,
  onApplyFilter,
  onClearFilter,
  onClearAllFilters,
  children,
  defaultField,
}: FilterBarProps) {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [draftField, setDraftField] = useState<string>(defaultField || fields[0]?.value || '');
  const [draftOperator, setDraftOperator] = useState<FilterOperator>('is');
  const [draftValue, setDraftValue] = useState<string>('');

  const currentFieldConfig = fields.find((f) => f.value === draftField);

  const handleFieldChange = (newField: string) => {
    setDraftField(newField);
    const nextFieldConfig = fields.find((f) => f.value === newField);
    if (nextFieldConfig?.options && nextFieldConfig.options.length > 0) {
      setDraftValue(nextFieldConfig.options[0]);
    } else {
      setDraftValue('');
    }
  };

  const handleApplyFilter = () => {
    if (draftValue.trim().length > 0) {
      onApplyFilter({ field: draftField, operator: draftOperator, value: draftValue });
      setIsFilterPopoverOpen(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[320px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm font-normal placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">

          <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Filter className="mr-2 size-3.5 text-slate-500" />
                Filters
                <ChevronDown className="ml-2 size-4 text-slate-500" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={10}
              className="z-50 w-80 rounded-lg border border-slate-200 bg-white p-0 shadow-xl"
            >
              <div className="border-b border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-700">Filter by</h3>
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-slate-600"
                    onClick={() => setIsFilterPopoverOpen(false)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 px-3 py-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Field</label>
                  <Select value={draftField} onValueChange={handleFieldChange}>
                    <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      className="size-4 accent-primary"
                      checked={draftOperator === 'is'}
                      onChange={() => setDraftOperator('is')}
                    />
                    is
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      className="size-4 accent-primary"
                      checked={draftOperator === 'is not'}
                      onChange={() => setDraftOperator('is not')}
                    />
                    is not
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Value</label>
                  {currentFieldConfig?.options && currentFieldConfig.options.length > 0 ? (
                    <Select value={draftValue} onValueChange={setDraftValue}>
                      <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentFieldConfig.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      placeholder={`Enter ${currentFieldConfig?.label?.toLowerCase() || 'value'}`}
                      className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyFilter();
                        }
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-sm text-slate-600 hover:bg-slate-100"
                    onClick={onClearAllFilters}
                    disabled={appliedFilters.length === 0}
                  >
                    Clear all
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
                    onClick={handleApplyFilter}
                    disabled={draftValue.trim().length === 0}
                  >
                    Apply filter
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {children}
        </div>
      </div>

      {/* Applied Filters Badges */}
      {appliedFilters.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {appliedFilters.map((filter) => (
              <Badge
                key={`${filter.field}-${filter.operator}-${filter.value}`}
                variant="outline"
                className="h-7 gap-2 rounded-full border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <span>
                  {filter.field} {filter.operator} {filter.value}
                </span>
                <button
                  type="button"
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  onClick={() => onClearFilter(filter.field)}
                  aria-label={`Clear ${filter.field} filter`}
                >
                  <X className="size-3.5" />
                </button>
              </Badge>
            ))}

            <button
              type="button"
              className="ml-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
              onClick={onClearAllFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
