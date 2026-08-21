'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Option {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
  onSelect: (value: string) => void;
  value?: string;
}

/**
 * TiqriSearchableDropdown
 * A standardized combobox wrapper for selecting users, locations, or assets.
 */
export function SearchableDropdown({
  options,
  placeholder = 'Select an item...',
  emptyMessage = 'No results found.',
  onSelect,
  value,
}: SearchableDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState('');
  const currentValue = isControlled ? value : internalValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal min-w-0',
            currentValue ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span className="truncate text-left flex-1">
            {currentValue
              ? options.find((option) => option.value === currentValue)?.label
              : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    const newValue =
                      option.value === currentValue ? '' : option.value;
                    if (!isControlled) {
                      setInternalValue(newValue);
                    }
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentValue === option.value
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
