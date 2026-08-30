import * as React from 'react';
import { type RegisterAssetActionState } from '@/lib/validations/asset-registration';
import { type PillarFormConfig } from '../pillar-form-config';
import {
  InlineFieldRow,
  SearchableFieldRow,
  getError,
  type RegistrationOption,
  type CustomSchemaField,
} from '../form-field-primitives';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CustomFieldsSectionProps = {
  config: PillarFormConfig;
  state: RegisterAssetActionState;
  assetTrackingFields: CustomSchemaField[];
  customFieldValues: Record<string, string>;
  setCustomFieldValues: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  instanceAttributesPayload: Record<string, string | boolean>;
  ownerId: string;
  onOwnerChange: (v: string) => void;
  ownerOptions: RegistrationOption[];
};

export function CustomFieldsSection({
  config,
  state,
  assetTrackingFields,
  customFieldValues,
  setCustomFieldValues,
  instanceAttributesPayload,
  ownerId,
  onOwnerChange,
  ownerOptions,
}: CustomFieldsSectionProps) {
  return (
    <>
      {assetTrackingFields.length > 0 ? (
        <div className="col-span-full rounded-lg border border-border bg-background p-4 sm:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3
                className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}
              >
                Custom Inputs
              </h3>
              <p
                className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
              >
                {`Fields are driven by the selected ${config.modelLabel.toLowerCase()}'s category.`}
              </p>
            </div>
          </div>

          <input
            type="hidden"
            name="instanceAttributes"
            value={JSON.stringify(instanceAttributesPayload)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {assetTrackingFields.map((field) => {
              const fieldValue = customFieldValues[field.fieldName] ?? '';

              if (field.inputType === 'Boolean') {
                return (
                  <div key={field.fieldName} className="space-y-2">
                    <label
                      className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
                    >
                      {field.fieldName}
                      {field.required ? (
                        <span className="text-red-500"> *</span>
                      ) : null}
                    </label>
                    <Select
                      value={fieldValue}
                      onValueChange={(value) =>
                        setCustomFieldValues((previous) => ({
                          ...previous,
                          [field.fieldName]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              return (
                <div key={field.fieldName} className="space-y-2">
                  <label
                    className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
                  >
                    {field.fieldName}
                    {field.required ? (
                      <span className="text-red-500"> *</span>
                    ) : null}
                  </label>
                  <Input
                    type={
                      field.inputType === 'Number'
                        ? 'number'
                        : field.inputType === 'Date'
                          ? 'date'
                          : 'text'
                    }
                    value={fieldValue}
                    onChange={(event) =>
                      setCustomFieldValues((previous) => ({
                        ...previous,
                        [field.fieldName]: event.target.value,
                      }))
                    }
                    required={field.required}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <SearchableFieldRow
        label="Owner :"
        name="ownerId"
        value={ownerId}
        onChange={onOwnerChange}
        options={ownerOptions}
        placeholder="Select Owner.."
        emptyMessage="No owners found."
        error={getError(state, 'ownerId')}
      />

      <div className="col-span-full">
        <InlineFieldRow label={config.noteLabel} htmlFor="displayNote" alignTop>
          <Textarea
            id="displayNote"
            name="displayNote"
            rows={3}
            placeholder={config.notePlaceholder}
            className="min-h-20 resize-y"
          />
        </InlineFieldRow>
      </div>
    </>
  );
}
