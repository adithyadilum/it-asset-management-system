'use client';

import * as React from 'react';
import { Paperclip, Plus } from 'lucide-react';
import Image from 'next/image';

import { FormPanel } from '@/components/shared/slide-panels/form-panel';
import { tiqriToast } from '@/components/shared/sonner';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type RegistrationOption = React.ComponentProps<
  typeof SearchableDropdown
>['options'][number];

type FieldRowProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  alignTop?: boolean;
  children: React.ReactNode;
};

type DropdownFieldRowProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RegistrationOption[];
  placeholder: string;
  emptyMessage: string;
  error?: string;
};

const SOFTWARE_CATEGORY_OPTIONS: RegistrationOption[] = [
  { value: 'productivity', label: 'Productivity' },
  { value: 'design', label: 'Design & Media' },
  { value: 'security', label: 'Security' },
  { value: 'development', label: 'Development' },
  { value: 'erp', label: 'ERP' },
  { value: 'utilities', label: 'Utilities' },
];

const AGREEMENT_TYPE_OPTIONS: RegistrationOption[] = [
  { value: 'perpetual', label: 'Perpetual' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'trial', label: 'Trial' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'open-source', label: 'Open Source' },
];

const PAYMENT_MODEL_OPTIONS: RegistrationOption[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'per-seat', label: 'Per-seat' },
  { value: 'enterprise', label: 'Enterprise' },
];

const PUBLISHER_OPTIONS: RegistrationOption[] = [
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'adobe', label: 'Adobe' },
  { value: 'atlassian', label: 'Atlassian' },
  { value: 'jetbrains', label: 'JetBrains' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'google', label: 'Google' },
];

const VENDOR_OPTIONS: RegistrationOption[] = [
  { value: 'softline', label: 'Softline' },
  { value: 'ingram-micro', label: 'Ingram Micro' },
  { value: 'tech-data', label: 'Tech Data' },
  { value: 'synnex', label: 'Synnex' },
  { value: 'crayon', label: 'Crayon' },
];

const CURRENCY_OPTIONS: RegistrationOption[] = [
  { value: 'USD', label: 'USD' },
  { value: 'LKR', label: 'LKR' },
  { value: 'EUR', label: 'EUR' },
];

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function FieldRow({
  label,
  htmlFor,
  error,
  alignTop = false,
  children,
}: FieldRowProps) {
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
        <p className="pl-[140px] text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function DropdownFieldRow({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage,
  error,
}: DropdownFieldRowProps) {
  return (
    <FieldRow label={label} error={error} alignTop>
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
    </FieldRow>
  );
}

function BuildCircleUpload({
  inputId,
  inputName,
  previewUrl,
  onChange,
  label,
}: {
  inputId: string;
  inputName: string;
  previewUrl: string;
  onChange: (file: File | null) => void;
  label: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <input
        ref={inputRef}
        id={inputId}
        name={inputName}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />

      <Button
        type="button"
        variant="ghost"
        className="relative h-24 w-24 rounded-full border border-dashed border-border p-0 hover:bg-muted/20"
        onClick={() => inputRef.current?.click()}
        aria-label={label}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label}
            fill
            sizes="96px"
            unoptimized
            className="rounded-full object-cover"
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
  );
}

export function SoftwareRegistryPageClient() {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const { setOpen, setOpenMobile } = useSidebar();
  const invoiceInputRef = React.useRef<HTMLInputElement>(null);
  const [softwareName, setSoftwareName] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [agreementType, setAgreementType] = React.useState('');
  const [publisherId, setPublisherId] = React.useState('');
  const [paymentModel, setPaymentModel] = React.useState('');
  const [licenseKey, setLicenseKey] = React.useState('');
  const [licenseEmail, setLicenseEmail] = React.useState('');
  const [totalSeats, setTotalSeats] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState(getTodayDateValue);
  const [basePrice, setBasePrice] = React.useState('');
  const [tax, setTax] = React.useState('');
  const [vendorId, setVendorId] = React.useState('');
  const [currencyCode, setCurrencyCode] = React.useState(
    CURRENCY_OPTIONS[0]?.value ?? ''
  );
  const [note, setNote] = React.useState('');
  const [invoiceFileName, setInvoiceFileName] = React.useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState('');

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = React.useCallback((file: File | null) => {
    if (!file) {
      setImagePreviewUrl('');
      return;
    }

    setImagePreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return URL.createObjectURL(file);
    });
  }, []);

  const resetAndClose = () => {
    setIsPanelOpen(false);
  };

  const openRegistrationPanel = () => {
    setOpen(false);
    setOpenMobile(false);
    setIsPanelOpen(true);
  };

  const panelBody = (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-2">
        <BuildCircleUpload
          inputId="softwareImage"
          inputName="softwareImage"
          previewUrl={imagePreviewUrl}
          onChange={handleImageChange}
          label="Upload software image"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <FieldRow label="Software Name :" htmlFor="softwareName">
          <Input
            id="softwareName"
            name="softwareName"
            value={softwareName}
            onChange={(event) => setSoftwareName(event.target.value)}
            placeholder="Microsoft 365"
          />
        </FieldRow>

        <DropdownFieldRow
          label="Category :"
          name="category"
          value={categoryId}
          onChange={setCategoryId}
          options={SOFTWARE_CATEGORY_OPTIONS}
          placeholder="Select Category.."
          emptyMessage="No categories found."
        />

        <DropdownFieldRow
          label="Agreement Type :"
          name="agreementType"
          value={agreementType}
          onChange={setAgreementType}
          options={AGREEMENT_TYPE_OPTIONS}
          placeholder="Select Agreement.."
          emptyMessage="No agreement types found."
        />

        <DropdownFieldRow
          label="Publisher :"
          name="publisherId"
          value={publisherId}
          onChange={setPublisherId}
          options={PUBLISHER_OPTIONS}
          placeholder="Select Publisher.."
          emptyMessage="No publishers found."
        />

        <DropdownFieldRow
          label="Payment Model :"
          name="paymentModel"
          value={paymentModel}
          onChange={setPaymentModel}
          options={PAYMENT_MODEL_OPTIONS}
          placeholder="Select Payment.."
          emptyMessage="No payment models found."
        />

        <FieldRow label="License Key :" htmlFor="licenseKey">
          <Input
            id="licenseKey"
            name="licenseKey"
            value={licenseKey}
            onChange={(event) => setLicenseKey(event.target.value)}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          />
        </FieldRow>

        <FieldRow label="Licensed Email :" htmlFor="licenseEmail">
          <Input
            id="licenseEmail"
            name="licenseEmail"
            type="email"
            value={licenseEmail}
            onChange={(event) => setLicenseEmail(event.target.value)}
            placeholder="admin@tiqri.com"
          />
        </FieldRow>

        <FieldRow label="Total Seats :" htmlFor="totalSeats">
          <Input
            id="totalSeats"
            name="totalSeats"
            type="number"
            min="1"
            value={totalSeats}
            onChange={(event) => setTotalSeats(event.target.value)}
            placeholder="50"
          />
        </FieldRow>
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
          <FieldRow label="Purchase Date :" htmlFor="purchaseDate">
            <Input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </FieldRow>

          <FieldRow label="Base Price :" htmlFor="basePrice">
            <Input
              id="basePrice"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              placeholder="0.00"
            />
          </FieldRow>

          <FieldRow label="Tax :" htmlFor="tax">
            <Input
              id="tax"
              name="tax"
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              placeholder="0.00"
            />
          </FieldRow>

          <DropdownFieldRow
            label="Vendor :"
            name="vendorId"
            value={vendorId}
            onChange={setVendorId}
            options={VENDOR_OPTIONS}
            placeholder="Select Vendor.."
            emptyMessage="No vendors found."
          />

          <FieldRow label="Note :" htmlFor="note">
            <Input
              id="note"
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Additional notes"
            />
          </FieldRow>

          <FieldRow label="Invoice PDF :" htmlFor="invoiceFile" alignTop>
            <div className="space-y-2">
              <input
                id="invoiceFile"
                name="invoiceFile"
                type="file"
                accept="application/pdf"
                className="sr-only"
                ref={invoiceInputRef}
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
          </FieldRow>
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-4 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-background">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Software Registry</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage software licenses and subscriptions.
            </p>
          </div>

          <Button type="button" onClick={openRegistrationPanel} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Software Asset
          </Button>
        </div>

        <div className="min-h-0 flex-1 p-6">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-dashed border-border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              Software table integration can be mounted here.
            </p>
          </div>
        </div>
      </div>

      <FormPanel
        isOpen={isPanelOpen}
        onClose={setIsPanelOpen}
        title="Software Asset Registry"
        description="Create and track software licenses and subscriptions"
        onSubmit={(event) => {
          event.preventDefault();
          tiqriToast.success('Software registration UI is ready for backend wiring.');
          resetAndClose();
        }}
        submitLabel="Save Software Asset"
        submittingLabel="Saving software asset..."
        cancelLabel="Discard"
      >
        {panelBody}
      </FormPanel>
    </div>
  );
}