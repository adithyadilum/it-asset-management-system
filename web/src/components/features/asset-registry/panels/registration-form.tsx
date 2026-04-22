'use client';

import * as React from 'react';
import { LoaderCircle, Paperclip, Plus } from 'lucide-react';
import Image from 'next/image';

import { registerAsset } from '@/actions/assets';
import {
  SlidePanel,
  type SlidePanelAction,
} from '@/components/shared/slide-panel';
import { tiqriToast } from '@/components/shared/sonner';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { cn } from '@/lib/utils';
import { useOpenRegistrationPanel } from '@/components/features/asset-registry/panels/use-open-registration-panel';
import {
  DB_PILLAR_VALUES,
  initialRegisterAssetActionState,
  type RegisterAssetActionState,
  type RegistrationPillarInput,
} from '@/lib/validations/asset-registration';

type RegistrationOption = React.ComponentProps<
  typeof SearchableDropdown
>['options'][number];

type ModelRegistrationOption = RegistrationOption & {
  brandId: string;
  categoryId: string;
};

export type { RegistrationOption, ModelRegistrationOption };

type RegistrationFormProps = {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  initialPillar?: RegistrationPillarInput;
  categoryOptions?: RegistrationOption[];
  brandOptions?: RegistrationOption[];
  modelOptions?: ModelRegistrationOption[];
  ownerOptions?: RegistrationOption[];
  vendorOptions?: RegistrationOption[];
};

type InlineFieldRowProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  alignTop?: boolean;
  children: React.ReactNode;
};

type SearchableFieldRowProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RegistrationOption[];
  placeholder: string;
  emptyMessage: string;
  error?: string;
};

const CURRENCY_OPTIONS: RegistrationOption[] = [
  { value: 'USD', label: 'USD' },
  { value: 'LKR', label: 'LKR' },
  { value: 'NOK', label: 'NOK' },
];

const WARRANTY_MONTH_OPTIONS: RegistrationOption[] = [
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
  { value: '24', label: '24 Months' },
];

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function resolveStartingPillar(
  initialPillar?: RegistrationPillarInput
): RegistrationPillarInput {
  return initialPillar ?? 'IT & Digital';
}

function resolvePanelDescription(initialPillar?: RegistrationPillarInput) {
  if (initialPillar === 'IT & Digital') {
    return 'Hardware';
  }

  return initialPillar ?? 'Register a new asset';
}

function getError(
  state: RegisterAssetActionState,
  key: keyof NonNullable<RegisterAssetActionState['errors']>
) {
  return state.errors?.[key]?.[0];
}

function ErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-xs text-destructive">{error}</p>;
}

function InlineFieldRow({
  label,
  htmlFor,
  error,
  alignTop = false,
  children,
}: InlineFieldRowProps) {
  return (
    <div className="space-y-1">
      <div
        className={cn(
          'grid grid-cols-[132px_minmax(0,1fr)] gap-2',
          alignTop ? 'items-start' : 'items-center'
        )}
      >
        <Label
          htmlFor={htmlFor}
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} whitespace-nowrap text-foreground`}
        >
          {label}
        </Label>
        <div className="min-w-0">{children}</div>
      </div>

      {error ? (
        <div className="pl-35">
          <ErrorText error={error} />
        </div>
      ) : null}
    </div>
  );
}

function SearchableFieldRow({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  error,
}: SearchableFieldRowProps) {
  return (
    <InlineFieldRow label={label} error={error} alignTop>
      <>
        <SearchableDropdown
          options={options}
          placeholder={placeholder}
          emptyMessage={emptyMessage}
          onSelect={onChange}
          defaultValue={value}
        />
        <input type="hidden" name={name} value={value} />
      </>
    </InlineFieldRow>
  );
}

export function RegistrationForm({
  isOpen,
  onClose,
  initialPillar,
  categoryOptions = [],
  brandOptions = [],
  modelOptions = [],
  ownerOptions = [],
  vendorOptions = [],
}: RegistrationFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const invoiceInputRef = React.useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = React.useActionState(
    registerAsset,
    initialRegisterAssetActionState
  );

  const [pillar, setPillar] = React.useState<RegistrationPillarInput>(() =>
    resolveStartingPillar(initialPillar)
  );
  const [serialNumber, setSerialNumber] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [brandId, setBrandId] = React.useState('');
  const [modelId, setModelId] = React.useState('');
  const [ownerId, setOwnerId] = React.useState('');
  const [vendorId, setVendorId] = React.useState('');
  const [currencyCode, setCurrencyCode] = React.useState(
    CURRENCY_OPTIONS[0]?.value ?? ''
  );
  const [warrantyMonths, setWarrantyMonths] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState(getTodayDateValue);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState('');
  const [invoiceFileName, setInvoiceFileName] = React.useState('');
  const lastToastKeyRef = React.useRef<string>('');

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const [prevInitialPillar, setPrevInitialPillar] = React.useState(initialPillar);
  if (initialPillar !== prevInitialPillar) {
    setPrevInitialPillar(initialPillar);
    setPillar(resolveStartingPillar(initialPillar));
  }

  const filteredModelOptions = React.useMemo(
    () =>
      modelOptions
        .filter((option) => {
          const matchesCategory =
            categoryId.length === 0 || option.categoryId === categoryId;
          const matchesBrand =
            brandId.length === 0 || option.brandId === brandId;

          return matchesCategory && matchesBrand;
        })
        .map(({ value, label }) => ({ value, label })),
    [brandId, categoryId, modelOptions]
  );

  const [prevFilteredModelOptions, setPrevFilteredModelOptions] = React.useState(filteredModelOptions);
  if (filteredModelOptions !== prevFilteredModelOptions) {
    setPrevFilteredModelOptions(filteredModelOptions);
    if (modelId.length > 0) {
      const stillValidModel = filteredModelOptions.some(
        (option) => option.value === modelId
      );
      if (!stillValidModel) {
        setModelId('');
      }
    }
  }

  const isPillarLocked = Boolean(initialPillar);
  const formError = state.errors?.form?.[0];
  const modelEmptyMessage =
    brandId.length > 0 || categoryId.length > 0
      ? 'No models found for selected category and brand.'
      : 'No models found.';
  const selectedModelLabel =
    modelOptions.find((option) => option.value === modelId)?.label ?? '';
  const derivedAssetName =
    serialNumber.trim() || selectedModelLabel.trim() || 'Hardware Asset';
  const panelDescription = resolvePanelDescription(initialPillar);

  React.useEffect(() => {
    const resolvedMessage = state.message || formError;

    if (!resolvedMessage) {
      return;
    }

    const toastKey = `${state.success ? 'success' : 'error'}:${resolvedMessage}`;

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    if (state.success) {
      tiqriToast.success(resolvedMessage);
    } else {
      tiqriToast.error(resolvedMessage);
    }

    lastToastKeyRef.current = toastKey;
  }, [formError, state.message, state.success]);

  const panelActions: SlidePanelAction[] = [
    {
      id: 'discard',
      label: 'Discard',
      variant: 'outline',
      onClick: () => onClose(false),
      disabled: isPending,
    },
    {
      id: 'submit',
      label: isPending ? (
        <span className="inline-flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Adding asset...</span>
        </span>
      ) : (
        'Add Asset'
      ),
      onClick: () => formRef.current?.requestSubmit(),
      disabled: isPending,
    },
  ];

  const panelContent = (
    <form
      ref={formRef}
      action={formAction}
      className={cn('space-y-4', isPending && 'pointer-events-none opacity-70')}
    >
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
              setPillar(event.target.value as RegistrationPillarInput)
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

      <div className="flex flex-col items-center gap-2 py-2">
        <input
          ref={imageInputRef}
          id="assetImage"
          name="assetImage"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (!selectedFile) {
              setImagePreviewUrl('');
              return;
            }

            setImagePreviewUrl((previous) => {
              if (previous) {
                URL.revokeObjectURL(previous);
              }
              return URL.createObjectURL(selectedFile);
            });
          }}
        />

        <Button
          type="button"
          variant="ghost"
          className="relative h-24 w-24 rounded-full border border-dashed border-border p-0 hover:bg-muted/20"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Upload asset image"
        >
          {imagePreviewUrl ? (
            <Image
              src={imagePreviewUrl}
              alt="Selected asset"
              fill
              sizes="96px"
              unoptimized
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
              <span className="text-xs">IMG</span>
            </div>
          )}
          <span className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-background/40" />
        </Button>

        <p className="text-xs text-muted-foreground">Click to upload image</p>
      </div>

      <hr className="my-5 border-border" />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <SearchableFieldRow
          label="Category :"
          name="categoryId"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          placeholder="Select Category.."
          emptyMessage="No categories found."
          error={getError(state, 'categoryId')}
        />

        <SearchableFieldRow
          label="Brand :"
          name="brandId"
          value={brandId}
          onChange={setBrandId}
          options={brandOptions}
          placeholder="Select Brand.."
          emptyMessage="No brands found."
          error={getError(state, 'brandId')}
        />

        <InlineFieldRow
          label="Serial Number :"
          htmlFor="serialNumber"
          error={getError(state, 'serialNumber')}
        >
          <Input
            id="serialNumber"
            name="serialNumber"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            aria-invalid={Boolean(getError(state, 'serialNumber'))}
          />
        </InlineFieldRow>

        <SearchableFieldRow
          label="Model :"
          name="modelId"
          value={modelId}
          onChange={setModelId}
          options={filteredModelOptions}
          placeholder="Select Model.."
          emptyMessage={modelEmptyMessage}
          error={getError(state, 'modelId')}
        />

        <SearchableFieldRow
          label="Owner :"
          name="ownerId"
          value={ownerId}
          onChange={setOwnerId}
          options={ownerOptions}
          placeholder="Select Owner.."
          emptyMessage="No owners found."
          error={getError(state, 'ownerId')}
        />

        <InlineFieldRow label="Note :" htmlFor="displayNote">
          <Input id="displayNote" name="displayNote" />
        </InlineFieldRow>
      </div>

      <hr className="my-5 border-border" />

      <section className="rounded-lg border border-border bg-muted/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>
            Purchase Details
          </h3>

          <div className="w-24">
            <SearchableDropdown
              options={CURRENCY_OPTIONS}
              placeholder="USD"
              emptyMessage="No currencies found."
              onSelect={setCurrencyCode}
              defaultValue={currencyCode}
            />
            <input type="hidden" name="currencyCode" value={currencyCode} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
          <InlineFieldRow
            label="Purchase Date :"
            htmlFor="purchaseDate"
            error={getError(state, 'purchaseDate')}
          >
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              aria-invalid={Boolean(getError(state, 'purchaseDate'))}
            />
          </InlineFieldRow>

          <InlineFieldRow
            label="Base Price :"
            htmlFor="basePrice"
            error={getError(state, 'basePrice')}
          >
            <Input
              id="basePrice"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              aria-invalid={Boolean(getError(state, 'basePrice'))}
            />
          </InlineFieldRow>

          <InlineFieldRow
            label="Shipping Cost :"
            htmlFor="shippingCost"
            error={getError(state, 'shippingCost')}
          >
            <Input
              id="shippingCost"
              name="shippingCost"
              type="number"
              min="0"
              step="0.01"
              aria-invalid={Boolean(getError(state, 'shippingCost'))}
            />
          </InlineFieldRow>

          <InlineFieldRow label="Tax :" htmlFor="tax" error={getError(state, 'tax')}>
            <Input
              id="tax"
              name="tax"
              type="number"
              min="0"
              step="0.01"
              aria-invalid={Boolean(getError(state, 'tax'))}
            />
          </InlineFieldRow>

          <SearchableFieldRow
            label="Vendor :"
            name="vendorId"
            value={vendorId}
            onChange={setVendorId}
            options={vendorOptions}
            placeholder="Select Vendor.."
            emptyMessage="No vendors found."
            error={getError(state, 'vendorId')}
          />

          <InlineFieldRow
            label="Warranty Period :"
            error={getError(state, 'warrantyMonths')}
            alignTop
          >
            <>
              <SearchableDropdown
                options={WARRANTY_MONTH_OPTIONS}
                placeholder="Warranty Period.."
                emptyMessage="No warranty periods found."
                onSelect={setWarrantyMonths}
                defaultValue={warrantyMonths}
              />
              <input type="hidden" name="warrantyMonths" value={warrantyMonths} />
            </>
          </InlineFieldRow>

          <InlineFieldRow
            label="Note :"
            htmlFor="notes"
            error={getError(state, 'notes')}
          >
            <Input
              id="notes"
              name="notes"
              aria-invalid={Boolean(getError(state, 'notes'))}
            />
          </InlineFieldRow>

          <InlineFieldRow
            label="Invoice PDF :"
            htmlFor="invoiceFile"
            error={getError(state, 'invoiceFile')}
            alignTop
          >
            <div className="space-y-2">
              <input
                ref={invoiceInputRef}
                id="invoiceFile"
                name="invoiceFile"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  setInvoiceFileName(selectedFile?.name ?? '');
                }}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => invoiceInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Attach Invoice
              </Button>

              {invoiceFileName ? (
                <p className="text-xs text-muted-foreground">{invoiceFileName}</p>
              ) : null}
            </div>
          </InlineFieldRow>
        </div>
      </section>

    </form>
  );

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Asset Registry"
      description={panelDescription}
      content={panelContent}
      actions={panelActions}
      contentClassName="pt-1 pb-2 sm:pt-2"
    />
  );
}

type HardwareRegistryPageClientProps = {
  categoryOptions: RegistrationOption[];
  brandOptions: RegistrationOption[];
  modelOptions: ModelRegistrationOption[];
  ownerOptions: RegistrationOption[];
  vendorOptions: RegistrationOption[];
};

export function HardwareRegistryPageClient({
  categoryOptions,
  brandOptions,
  modelOptions,
  ownerOptions,
  vendorOptions,
}: HardwareRegistryPageClientProps) {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const openRegistrationPanel = useOpenRegistrationPanel(setIsPanelOpen);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h1
              className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
            >
              Hardware Registry
            </h1>
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
            >
              Register and manage hardware assets.
            </p>
          </div>

          <Button
            type="button"
            onClick={openRegistrationPanel}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>

        <div className="min-h-0 flex-1 p-6">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-dashed border-border bg-background p-6">
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
            >
              Asset table integration can be mounted here.
            </p>
          </div>
        </div>
      </div>

      <RegistrationForm
        isOpen={isPanelOpen}
        onClose={setIsPanelOpen}
        initialPillar="IT & Digital"
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        modelOptions={modelOptions}
        ownerOptions={ownerOptions}
        vendorOptions={vendorOptions}
      />
    </div>
  );
}
