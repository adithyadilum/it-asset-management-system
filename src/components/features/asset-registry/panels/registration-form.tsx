'use client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import * as React from 'react';

import {
  SlidePanel,
  type SlidePanelAction,
} from '@/components/shared/slide-panel';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { RegistrationPillarInput } from '@/lib/validations/asset-registration';
import { ClassificationSection } from './sections/classification-section';
import { SoftwareLicensingSection } from './sections/software-licensing-section';
import { PhysicalAttributesSection } from './sections/physical-attributes-section';
import { CustomFieldsSection } from './sections/custom-fields-section';
import { PurchaseDetailsSection } from './sections/purchase-details-section';
import type {
  CategoryRegistrationOption,
  ModelRegistrationOption,
  RegistrationOption,
} from './form-field-primitives';
import {
  useRegistrationForm,
  formatDateForInput,
} from './use-registration-form';

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

const BILLING_CYCLE_OPTIONS: RegistrationOption[] = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Annual', label: 'Annual' },
];

const CONDITION_OPTIONS = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'];

const WARRANTY_MONTH_OPTIONS: RegistrationOption[] = [
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
  { value: '24', label: '24 Months' },
];

/** Straight-line depreciation terms, in years. 5 is the default. */
const EXPECTED_LIFESPAN_OPTIONS: RegistrationOption[] = [
  { value: '1', label: '1 Year' },
  { value: '2', label: '2 Years' },
  { value: '3', label: '3 Years' },
  { value: '4', label: '4 Years' },
  { value: '5', label: '5 Years' },
  { value: '7', label: '7 Years' },
  { value: '10', label: '10 Years' },
];

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
  const {
    formRef,
    invoiceInputRef,
    state,
    formAction,
    isPending,
    pillar,
    setPillar,
    serialNumber,
    setSerialNumber,
    categoryId,
    setCategoryId,
    brandId,
    setBrandId,
    modelId,
    setModelId,
    ownerId,
    setOwnerId,
    vendorId,
    setVendorId,
    currencyCode,
    setCurrencyCode,
    warrantyMonths,
    setWarrantyMonths,
    expectedLifespanYears,
    setExpectedLifespanYears,
    purchaseDate,
    setPurchaseDate,
    basePrice,
    setBasePrice,
    costPerSeat,
    setCostPerSeat,
    shippingCost,
    setShippingCost,
    tax,
    setTax,
    invoiceFileName,
    showInvoiceUploader,
    setShowInvoiceUploader,
    isInvoiceDragOver,
    setIsInvoiceDragOver,
    customFieldValues,
    setCustomFieldValues,
    licenseType,
    setLicenseType,
    billingCycle,
    setBillingCycle,
    totalSeats,
    setTotalSeats,
    licenseStartDate,
    setLicenseStartDate,
    licenseExpiryDate,
    setLicenseExpiryDate,
    condition,
    setCondition,
    locationId,
    setLocationId,
    handleInvoiceSelection,
    handleInvoiceDrop,
    filteredModelOptions,
    filteredBrandOptions,
    selectedModel,
    selectedModelLabel,
    assetTrackingFields,
    instanceAttributesPayload,
    config,
    isPillarLocked,
    modelEmptyMessage,
    brandEmptyMessage,
    derivedAssetName,
    purchaseDateLabel,
    purchaseDateValue,
    licenseStartDateLabel,
    licenseStartDateValue,
    licenseExpiryDateLabel,
    licenseExpiryDateValue,
    isFreeSoftwareLicense,
    currencySymbol,
    totalCost,
  } = useRegistrationForm({
    initialPillar,
    categoryOptions,
    brandOptions,
    modelOptions,
    CURRENCY_OPTIONS,
    onClose,
    onRegistrationSuccess,
  });

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
              <LoadingSpinner size="sm" />
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
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
        BILLING_CYCLE_OPTIONS={BILLING_CYCLE_OPTIONS}
        totalSeats={totalSeats}
        setTotalSeats={setTotalSeats}
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
        setBasePrice={setBasePrice}
        shippingCost={shippingCost}
        setShippingCost={setShippingCost}
        tax={tax}
        setTax={setTax}
        totalCost={totalCost}

        costPerSeat={costPerSeat}
        setCostPerSeat={setCostPerSeat}
        isFreeSoftwareLicense={isFreeSoftwareLicense}
        warrantyMonths={warrantyMonths}
        setWarrantyMonths={setWarrantyMonths}
        WARRANTY_MONTH_OPTIONS={WARRANTY_MONTH_OPTIONS}
        expectedLifespanYears={expectedLifespanYears}
        setExpectedLifespanYears={setExpectedLifespanYears}
        EXPECTED_LIFESPAN_OPTIONS={EXPECTED_LIFESPAN_OPTIONS}
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
