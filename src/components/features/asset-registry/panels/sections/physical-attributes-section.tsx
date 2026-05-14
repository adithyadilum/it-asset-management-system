import * as React from 'react';
import { type RegisterAssetActionState } from '@/lib/validations/asset-registration';
import { type PillarFormConfig } from '../pillar-form-config';
import {
  InlineFieldRow,
  SearchableFieldRow,
  getError,
  type RegistrationOption,
} from '../form-field-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PhysicalAttributesSectionProps = {
  config: PillarFormConfig;
  state: RegisterAssetActionState;

  condition: string;
  setCondition: (v: string) => void;
  CONDITION_OPTIONS: string[];

  locationId: string;
  setLocationId: (v: string) => void;
  locationOptions: RegistrationOption[];
};

export function PhysicalAttributesSection({
  config,
  state,
  condition,
  setCondition,
  CONDITION_OPTIONS,
  locationId,
  setLocationId,
  locationOptions,
}: PhysicalAttributesSectionProps) {
  if (!config.showConditionField && !config.showLocationField) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 mt-3">
      {config.showConditionField && (
        <InlineFieldRow
          label="Condition :"
          htmlFor="condition"
          error={getError(state, 'condition')}
        >
          <>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="condition" className="h-9 w-full rounded-lg">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="condition" value={condition} />
          </>
        </InlineFieldRow>
      )}

      {config.showLocationField && (
        <SearchableFieldRow
          label="Location :"
          name="locationId"
          value={locationId}
          onChange={setLocationId}
          options={locationOptions}
          placeholder="Select Location.."
          emptyMessage="No locations found."
          error={getError(state, 'locationId')}
        />
      )}
    </div>
  );
}
