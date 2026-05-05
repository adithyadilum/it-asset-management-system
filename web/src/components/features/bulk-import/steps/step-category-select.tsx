import React, { useState } from 'react';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import type { WizardState, WizardAction } from '../use-bulk-import-reducer';

interface StepCategorySelectProps {
  categories: { id: number; name: string; pillar: string }[];
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function StepCategorySelect({ categories, state, dispatch }: StepCategorySelectProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(state.categoryId);

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
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-2">
          <label htmlFor="category-select" className="text-sm font-medium text-slate-700">
            Asset Category
          </label>
          <select
            id="category-select"
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(Number(e.target.value) || null)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00145a]/20 focus:border-[#00145a] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Select asset category"
          >
            <option value="" disabled>
              Select a category...
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.pillar})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 p-4 border border-blue-100">
          <InfoIcon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">
            The import template and validation rules are specific to the selected category. You will be able to download the correct template on the next step.
          </p>
        </div>
      </div>

      <DialogFooter className="px-6 py-4 border-t border-slate-200">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!selectedCategoryId}
          className="bg-[#00145a] hover:bg-[#00145a]/90 text-white"
        >
          Next
        </Button>
      </DialogFooter>
    </div>
  );
}
