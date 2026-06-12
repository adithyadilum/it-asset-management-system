'use client';

import * as React from 'react';
import { LoaderCircle } from 'lucide-react';

import { registerAsset } from '@/actions/assets';
import {
  SlidePanel,
  type SlidePanelAction,
} from '@/components/shared/slide-panel';
import { tiqriToast } from '@/components/shared/sonner';
import {
  SUPPORTED_CURRENCIES,
  parseCurrencyAmount,
  formatCurrencySymbol,
} from '@/lib/currency';
import {
  isInvoiceAttachmentFile,
} from '@/lib/file-types';
import { cn } from '@/lib/utils';
import {
  initialRegisterAssetActionState,
  type RegistrationPillarInput,
} from '@/lib/validations/asset-registration';
import { getPillarFormConfig } from '@/components/features/asset-registry/panels/pillar-form-config';
import { ClassificationSection } from './sections/classification-section';
import { SoftwareLicensingSection } from './sections/software-licensing-section';
import { PhysicalAttributesSection } from './sections/physical-attributes-section';
import { CustomFieldsSection } from './sections/custom-fields-section';
import { PurchaseDetailsSection } from './sections/purchase-details-section';
import {
  type CategoryRegistrationOption,
  type ModelRegistrationOption,
  type RegistrationOption,
} from './form-field-primitives';

export type { RegistrationOption, ModelRegistrationOption };

type RegistrationFormProps = {
  isOpen: boolean;
  onClose: (open: boolean, didSucceed?: boolean) => void;
  onRegistrationSuccess?: (assetId: string, modelName: string) => void;
  isLoading?: boolean;
  initialPillar?: RegistrationPillarInput;
  categoryOptions?: CategoryRegistrationOption[];
  brandOptions?: RegistrationOption[];
  modelOptions?: ModelRegistrationOption[];
  ownerOptions?: RegistrationOption[];
  vendorOptions?: RegistrationOption[];
  locationOptions?: RegistrationOption[];
};

const CURRENCY_OPTIONS: RegistrationOption[] = SUPPORTED_CURRENCIES.map(
  (currencyCode) => ({
    value: currencyCode,
    label: currencyCode,
  })
);

const LICENSE_TYPE_OPTIONS: RegistrationOption[] = [
  { value: 'Perpetual', label: 'Perpetual' },
  { value: 'Subscription', label: 'Subscription' },
  { value: 'Open Source / Free', label: 'Open Source / Free' },
];

const CONDITION_OPTIONS = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'];

const WARRANTY_MONTH_OPTIONS: RegistrationOption[] = [
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
  { value: '24', label: '24 Months' },
];

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseInputDate(inputValue: string) {
  if (!inputValue) {
    return undefined;
  }

  const [year, month, day] = inputValue.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function formatPurchaseDateLabel(inputValue: string) {
  const date = parseInputDate(inputValue);
  if (!date) {
    return 'Select purchase date';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function resolveStartingPillar(
  initialPillar?: RegistrationPillarInput
): RegistrationPillarInput {
  return initialPillar ?? 'Hardware';
}

function RegistrationFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="mx-auto flex flex-col items-center gap-2 py-2">
        <div className="h-24 w-24 rounded-full border border-dashed border-border bg-muted/60" />
        <div className="h-3 w-28 rounded-full bg-muted/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-8 w-full rounded-lg bg-muted/60" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="h-5 w-32 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded-lg bg-muted/60" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <div className="h-4 w-24 rounded bg-muted/60" />
              <div className="h-8 w-full rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegistrationForm({
  isOpen,
  onClose,
  onRegistrationSuccess,
  isLoading = false,
  initialPillar,
  categoryOptions = [],
  brandOptions = [],
  modelOptions = [],
  ownerOptions = [],
  vendorOptions = [],
  locationOptions = [],
}: RegistrationFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
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
  const [basePrice, setBasePrice] = React.useState('');
  const [costPerSeat, setCostPerSeat] = React.useState('');
  const [shippingCost, setShippingCost] = React.useState('');
  const [tax, setTax] = React.useState('');
  const [invoiceFileName, setInvoiceFileName] = React.useState('');
  const [showInvoiceUploader, setShowInvoiceUploader] = React.useState(false);
  const [isInvoiceDragOver, setIsInvoiceDragOver] = React.useState(false);
  const [customFieldValues, setCustomFieldValues] = React.useState<Record<string, string>>({});

  const [licenseType, setLicenseType] = React.useState('');
  const [totalSeats, setTotalSeats] = React.useState('');

  const handleBasePriceChange = React.useCallback((val: string) => {
    setBasePrice(val);
    const parsedBase = parseCurrencyAmount(val);
    const seats = parseInt(totalSeats, 10);
    if (seats > 0) {
      setCostPerSeat((parsedBase / seats).toFixed(2));
    } else {
      setCostPerSeat('');
    }
  }, [totalSeats]);

  const handleCostPerSeatChange = React.useCallback((val: string) => {
    setCostPerSeat(val);
    const parsedCost = parseCurrencyAmount(val);
    const seats = parseInt(totalSeats, 10);
    if (seats > 0) {
      setBasePrice((parsedCost * seats).toFixed(2));
    }
  }, [totalSeats]);

  const handleTotalSeatsChange = React.useCallback((val: string) => {
    setTotalSeats(val);
    const seats = parseInt(val, 10);
    const parsedBase = parseCurrencyAmount(basePrice);
    if (seats > 0 && parsedBase > 0) {
      setCostPerSeat((parsedBase / seats).toFixed(2));
    } else {
      setCostPerSeat('');
    }
  }, [basePrice]);
  const [licenseStartDate, setLicenseStartDate] = React.useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = React.useState('');
  const [condition, setCondition] = React.useState('');
  const [locationId, setLocationId] = React.useState('');

  const lastToastKeyRef = React.useRef<string>('');

  const handleInvoiceSelection = React.useCallback((files: FileList | null) => {
    const selectedFile = files?.[0] ?? null;

    if (selectedFile && !isInvoiceAttachmentFile(selectedFile)) {
      tiqriToast.error(
        'Upload a supported document or image file for invoice attachment.'
      );
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
      setInvoiceFileName('');
      setIsInvoiceDragOver(false);
      return;
    }

    setInvoiceFileName(selectedFile?.name ?? '');
    setShowInvoiceUploader(true);
    setIsInvoiceDragOver(false);
  }, []);

  const handleInvoiceDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsInvoiceDragOver(false);
      handleInvoiceSelection(event.dataTransfer.files);
    },
    [handleInvoiceSelection]
  );

  const [prevInitialPillar, setPrevInitialPillar] = React.useState(initialPillar);
  if (initialPillar !== prevInitialPillar) {
    setPrevInitialPillar(initialPillar);
    setPillar(resolveStartingPillar(initialPillar));
  }

  const filteredModelOptions = React.useMemo(() => {
    if (categoryId.length === 0) return [];
    
    return modelOptions
      .filter((option) => {
        const matchesCategory = option.categoryId === categoryId;
        const matchesBrand = brandId.length === 0 || option.brandId === brandId;
        return matchesCategory && matchesBrand;
      })
      .map(({ value, label }) => ({ value, label }));
  }, [brandId, categoryId, modelOptions]);

  const filteredBrandOptions = React.useMemo(() => {
    if (categoryId.length === 0) return [];

    const validBrandIds = new Set(
      modelOptions
        .filter((option) => option.categoryId === categoryId)
        .map((option) => option.brandId)
    );

    return brandOptions.filter((option) => validBrandIds.has(option.value));
  }, [categoryId, modelOptions, brandOptions]);

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

  const [prevFilteredBrandOptions, setPrevFilteredBrandOptions] = React.useState(filteredBrandOptions);
  if (filteredBrandOptions !== prevFilteredBrandOptions) {
    setPrevFilteredBrandOptions(filteredBrandOptions);
    if (brandId.length > 0) {
      const stillValidBrand = filteredBrandOptions.some(
        (option) => option.value === brandId
      );
      if (!stillValidBrand) {
        setBrandId('');
      }
    }
  }

  const selectedCategory = React.useMemo(
    () => categoryOptions.find((option) => option.value === categoryId) ?? null,
    [categoryId, categoryOptions]
  );

  const selectedModel = React.useMemo(
    () => modelOptions.find((option) => option.value === modelId) ?? null,
    [modelId, modelOptions]
  );

  const assetTrackingFields = React.useMemo(
    () => selectedCategory?.customSchema?.assetTracking ?? [],
    [selectedCategory]
  );

  const instanceAttributesPayload = React.useMemo(() => {
    const payload: Record<string, string | boolean> = {};

    for (const field of assetTrackingFields) {
      const value = customFieldValues[field.fieldName] ?? '';

      if (field.inputType === 'Boolean') {
        payload[field.fieldName] = value === 'true';
        continue;
      }

      if (value.trim().length > 0) {
        payload[field.fieldName] = value.trim();
      }
    }

    return payload;
  }, [assetTrackingFields, customFieldValues]);

  const config = getPillarFormConfig(pillar);
  const isPillarLocked = Boolean(initialPillar);

  const formError = state.errors?.form?.[0];
  const modelEmptyMessage =
    categoryId.length === 0
      ? 'Please select a category first.'
      : brandId.length > 0
      ? config.modelFilteredEmptyMessage
      : config.modelEmptyMessage;
  const brandEmptyMessage =
    categoryId.length === 0
      ? 'Please select a category first.'
      : 'No brands found.';
  const selectedModelLabel =
    modelOptions.find((option) => option.value === modelId)?.label ?? '';
  const selectedBrandLabel =
    brandOptions.find((option) => option.value === brandId)?.label ?? '';
  const derivedAssetName = (selectedBrandLabel && selectedModelLabel)
    ? `${selectedBrandLabel.trim()} - ${selectedModelLabel.trim()}`
    : 'New Asset';
  const purchaseDateLabel = formatPurchaseDateLabel(purchaseDate);
  const purchaseDateValue = parseInputDate(purchaseDate);

  const licenseStartDateLabel = licenseStartDate ? formatPurchaseDateLabel(licenseStartDate) : 'Select start date';
  const licenseStartDateValue = parseInputDate(licenseStartDate);

  const licenseExpiryDateLabel = licenseExpiryDate ? formatPurchaseDateLabel(licenseExpiryDate) : 'Select expiry date';
  const licenseExpiryDateValue = parseInputDate(licenseExpiryDate);

  const [prevConfigCondition, setPrevConfigCondition] = React.useState(config.defaultCondition);
  if (config.defaultCondition !== prevConfigCondition) {
    setPrevConfigCondition(config.defaultCondition);
    if (config.defaultCondition && condition === '') {
      setCondition(config.defaultCondition);
    }
  }
  const currencySymbol = formatCurrencySymbol(currencyCode);
  const totalCost = React.useMemo(
    () =>
      parseCurrencyAmount(basePrice) +
      parseCurrencyAmount(shippingCost) +
      parseCurrencyAmount(tax),
    [basePrice, shippingCost, tax]
  );

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

      if (state.assetId && config.showSuccessTagDialog) {
        // Notify the parent to show the success dialog before closing the panel
        onRegistrationSuccess?.(state.assetId, selectedModelLabel);
      }
      onClose(false, true);
    } else {
      tiqriToast.error(resolvedMessage);
    }

    lastToastKeyRef.current = toastKey;
  }, [formError, state.message, state.success, state.assetId, config.showSuccessTagDialog, onRegistrationSuccess, selectedModelLabel, onClose]);

  const panelActions: SlidePanelAction[] = isLoading
    ? []
    : [
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
            <span>{config.submittingLabel}</span>
          </span>
        ) : (
          config.submitLabel
        ),
        onClick: () => formRef.current?.requestSubmit(),
        disabled: isPending,
      },
    ];

  const panelContent = isLoading ? (
    <RegistrationFormSkeleton />
  ) : (
    <form
      ref={formRef}
      action={formAction}
      className={cn('space-y-4', isPending && 'pointer-events-none opacity-70')}
    >
      <ClassificationSection
        config={config}
        state={state}
        pillar={pillar}
        isPillarLocked={isPillarLocked}
        onPillarChange={setPillar}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        brandId={brandId}
        onBrandChange={setBrandId}
        serialNumber={serialNumber}
        onSerialNumberChange={setSerialNumber}
        modelId={modelId}
        onModelChange={setModelId}
        categoryOptions={categoryOptions}
        brandOptions={filteredBrandOptions}
        filteredModelOptions={filteredModelOptions}
        selectedModel={selectedModel}
        selectedModelLabel={selectedModelLabel}
        modelEmptyMessage={modelEmptyMessage}
        brandEmptyMessage={brandEmptyMessage}
        derivedAssetName={derivedAssetName}
      />

      <PhysicalAttributesSection
        config={config}
        state={state}
        condition={condition}
        setCondition={setCondition}
        CONDITION_OPTIONS={CONDITION_OPTIONS}
        locationId={locationId}
        setLocationId={setLocationId}
        locationOptions={locationOptions}
      />

      <CustomFieldsSection
        config={config}
        state={state}
        assetTrackingFields={assetTrackingFields}
        customFieldValues={customFieldValues}
        setCustomFieldValues={setCustomFieldValues}
        instanceAttributesPayload={instanceAttributesPayload}
        ownerId={ownerId}
        onOwnerChange={setOwnerId}
        ownerOptions={ownerOptions}
      />

      <SoftwareLicensingSection
        config={config}
        state={state}
        licenseType={licenseType}
        setLicenseType={setLicenseType}
        LICENSE_TYPE_OPTIONS={LICENSE_TYPE_OPTIONS}
        totalSeats={totalSeats}
        setTotalSeats={handleTotalSeatsChange}
        licenseStartDate={licenseStartDate}
        setLicenseStartDate={setLicenseStartDate}
        licenseStartDateLabel={licenseStartDateLabel}
        licenseStartDateValue={licenseStartDateValue}
        licenseExpiryDate={licenseExpiryDate}
        setLicenseExpiryDate={setLicenseExpiryDate}
        licenseExpiryDateLabel={licenseExpiryDateLabel}
        licenseExpiryDateValue={licenseExpiryDateValue}
        formatDateForInput={formatDateForInput}
      />

      <hr className="my-5 border-border" />

      <PurchaseDetailsSection
        config={config}
        state={state}
        currencyCode={currencyCode}
        setCurrencyCode={setCurrencyCode}
        CURRENCY_OPTIONS={CURRENCY_OPTIONS}
        currencySymbol={currencySymbol}
        purchaseDate={purchaseDate}
        setPurchaseDate={setPurchaseDate}
        purchaseDateLabel={purchaseDateLabel}
        purchaseDateValue={purchaseDateValue}
        formatDateForInput={formatDateForInput}
        vendorId={vendorId}
        setVendorId={setVendorId}
        vendorOptions={vendorOptions}
        basePrice={basePrice}
        setBasePrice={handleBasePriceChange}
        shippingCost={shippingCost}
        setShippingCost={setShippingCost}
        tax={tax}
        setTax={setTax}
        totalCost={totalCost}

        costPerSeat={costPerSeat}
        setCostPerSeat={handleCostPerSeatChange}
        warrantyMonths={warrantyMonths}
        setWarrantyMonths={setWarrantyMonths}
        WARRANTY_MONTH_OPTIONS={WARRANTY_MONTH_OPTIONS}
        invoiceInputRef={invoiceInputRef}
        showInvoiceUploader={showInvoiceUploader}
        setShowInvoiceUploader={setShowInvoiceUploader}
        handleInvoiceSelection={handleInvoiceSelection}
        isInvoiceDragOver={isInvoiceDragOver}
        setIsInvoiceDragOver={setIsInvoiceDragOver}
        handleInvoiceDrop={handleInvoiceDrop}
        invoiceFileName={invoiceFileName}
      />

    </form>
  );

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={config.panelTitle}
        description={config.panelDescription}
        content={panelContent}
        actions={panelActions}
        contentClassName="pt-0 pb-2 sm:pt-0"
      />
    </>
  );
}
