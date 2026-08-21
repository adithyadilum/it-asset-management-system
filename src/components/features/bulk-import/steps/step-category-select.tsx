import React, { useState } from 'react';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import type { WizardState, WizardAction } from '../use-bulk-import-reducer';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';

interface StepCategorySelectProps {
  categories: { id: number; name: string; pillar: string }[];
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function StepCategorySelect({
  categories,
  state,
  dispatch,
}: StepCategorySelectProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    state.categoryId
  );

  const handleNext = () => {
    if (!selectedCategoryId) return;
    const category = categories.find((c) => c.id === selectedCategoryId);
    if (category) {
      dispatch({
        type: 'SET_CATEGORY',
        categoryId: category.id,
        categoryName: category.name,
        pillar: category.pillar,
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-visible">
      <div className="flex flex-col flex-1 gap-6 px-8 py-6 relative overflow-visible">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="category-select"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Asset Category
          </label>
          <SearchableDropdown
            options={categories.map((c) => ({
              value: String(c.id),
              label: `${c.name} (${c.pillar})`,
            }))}
            value={selectedCategoryId ? String(selectedCategoryId) : ''}
            onSelect={(val) => setSelectedCategoryId(Number(val))}
            placeholder="Select a category..."
            emptyMessage="No category found."
          />
        </div>

        <div className="flex items-start justify-center gap-3 rounded-lg bg-secondary/50 p-4 border border-border">
          <InfoIcon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            The import template and validation rules are specific to the
            selected category. You will be able to download the correct template
            on the next step.
          </p>
        </div>
      </div>

      <DialogFooter className="px-8 py-5 border-t border-border mt-auto bg-muted/20">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!selectedCategoryId}
        >
          Next
        </Button>
      </DialogFooter>
    </div>
  );
}
