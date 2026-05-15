import Image from 'next/image';
import {
  DB_PILLAR_VALUES,
  type RegisterAssetActionState,
  type RegistrationPillarInput,
} from '@/lib/validations/asset-registration';
import { type PillarFormConfig } from '../pillar-form-config';
import {
  InlineFieldRow,
  SearchableFieldRow,
  getError,
  type CategoryRegistrationOption,
  type ModelRegistrationOption,
  type RegistrationOption,
} from '../form-field-primitives';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Input } from '@/components/ui/input';

type ClassificationSectionProps = {
  config: PillarFormConfig;
  state: RegisterAssetActionState;
  pillar: RegistrationPillarInput;
  isPillarLocked: boolean;
  onPillarChange: (pillar: RegistrationPillarInput) => void;
  categoryId: string;
  onCategoryChange: (v: string) => void;
  brandId: string;
  onBrandChange: (v: string) => void;
  serialNumber: string;
  onSerialNumberChange: (v: string) => void;
  modelId: string;
  onModelChange: (v: string) => void;
  categoryOptions: CategoryRegistrationOption[];
  brandOptions: RegistrationOption[];
  filteredModelOptions: RegistrationOption[];
  selectedModel: ModelRegistrationOption | null;
  selectedModelLabel: string;
  modelEmptyMessage: string;
  derivedAssetName: string;
};

export function ClassificationSection({
  config,
  state,
  pillar,
  isPillarLocked,
  onPillarChange,
  categoryId,
  onCategoryChange,
  brandId,
  onBrandChange,
  serialNumber,
  onSerialNumberChange,
  modelId,
  onModelChange,
  categoryOptions,
  brandOptions,
  filteredModelOptions,
  selectedModel,
  selectedModelLabel,
  modelEmptyMessage,
  derivedAssetName,
}: ClassificationSectionProps) {
  const selectedModelImageUrl = selectedModel?.imageUrl ?? '';

  return (
    <>
      <input type="hidden" name="name" value={derivedAssetName} />

      {isPillarLocked ? (
        <input type="hidden" name="pillar" value={pillar} />
      ) : (
        <InlineFieldRow
          label="Pillar :"
          htmlFor="pillar"
          error={getError(state, 'pillar')}
        >
          <select
            id="pillar"
            name="pillar"
            value={pillar}
            onChange={(event) =>
              onPillarChange(event.target.value as RegistrationPillarInput)
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            aria-invalid={Boolean(getError(state, 'pillar'))}
          >
            {DB_PILLAR_VALUES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </InlineFieldRow>
      )}

      <hr className="my-5 border-border" />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <SearchableFieldRow
          label="Category :"
          name="categoryId"
          value={categoryId}
          onChange={onCategoryChange}
          options={categoryOptions}
          placeholder="Select Category.."
          emptyMessage="No categories found."
          error={getError(state, 'categoryId')}
        />

        <SearchableFieldRow
          label="Brand :"
          name="brandId"
          value={brandId}
          onChange={onBrandChange}
          options={brandOptions}
          placeholder="Select Brand.."
          emptyMessage="No brands found."
          error={getError(state, 'brandId')}
        />

        <InlineFieldRow
          label={config.serialLabel}
          htmlFor="serialNumber"
          error={getError(state, 'serialNumber')}
        >
          <Input
            id="serialNumber"
            name="serialNumber"
            type="text"
            value={serialNumber}
            onChange={(event) => onSerialNumberChange(event.target.value)}
            aria-invalid={Boolean(getError(state, 'serialNumber'))}
          />
        </InlineFieldRow>

        <SearchableFieldRow
          label={`${config.modelLabel} :`}
          name="modelId"
          value={modelId}
          onChange={onModelChange}
          options={filteredModelOptions}
          placeholder={`Select ${config.modelLabel}..`}
          emptyMessage={modelEmptyMessage}
          error={getError(state, 'modelId')}
        />

        <div className="col-span-full rounded-lg border border-border bg-muted/30 p-4 sm:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
              {selectedModelImageUrl ? (
                <Image
                  src={selectedModelImageUrl}
                  alt={selectedModelLabel || `Selected ${config.modelLabel.toLowerCase()}`}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No image</span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                {`Selected ${config.modelLabel}`}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {selectedModelLabel || `Select a ${config.modelLabel.toLowerCase()} to load its image and custom inputs.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
