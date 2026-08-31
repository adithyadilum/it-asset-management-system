import * as React from 'react';
import { CalendarDays, Paperclip, Upload } from 'lucide-react';
import { type RegisterAssetActionState } from '@/lib/validations/asset-registration';
import { type PillarFormConfig } from '../pillar-form-config';
import {
  InlineFieldRow,
  SearchableFieldRow,
  CurrencyInput,
  getError,
  type RegistrationOption,
} from '../form-field-primitives';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { cn } from '@/lib/utils';
import { INVOICE_ATTACHMENT_ACCEPT } from '@/lib/file-types';

type PurchaseDetailsSectionProps = {
  config: PillarFormConfig;
  state: RegisterAssetActionState;

  currencyCode: string;
  setCurrencyCode: (v: string) => void;
  CURRENCY_OPTIONS: RegistrationOption[];
  currencySymbol: string;

  purchaseDate: string;
  setPurchaseDate: (v: string) => void;
  purchaseDateLabel: string;
  purchaseDateValue?: Date;
  formatDateForInput: (date: Date) => string;

  vendorId: string;
  setVendorId: (v: string) => void;
  vendorOptions: RegistrationOption[];

  basePrice: string;
  setBasePrice: (v: string) => void;
  shippingCost: string;
  setShippingCost: (v: string) => void;
  tax: string;
  setTax: (v: string) => void;
  totalCost: number;
  costPerSeat: string;
  setCostPerSeat: (v: string) => void;
  isFreeSoftwareLicense?: boolean;

  warrantyMonths: string;
  setWarrantyMonths: (v: string) => void;
  WARRANTY_MONTH_OPTIONS: RegistrationOption[];

  expectedLifespanYears: string;
  setExpectedLifespanYears: (v: string) => void;
  EXPECTED_LIFESPAN_OPTIONS: RegistrationOption[];

  estimatedSalvageValue: string;
  setEstimatedSalvageValue: (v: string) => void;

  invoiceInputRef: React.RefObject<HTMLInputElement | null>;
  showInvoiceUploader: boolean;
  setShowInvoiceUploader: (v: boolean) => void;
  handleInvoiceSelection: (files: FileList | null) => void;
  isInvoiceDragOver: boolean;
  setIsInvoiceDragOver: (v: boolean) => void;
  handleInvoiceDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  invoiceFileName: string;
};

export function PurchaseDetailsSection({
  config,
  state,
  currencyCode,
  setCurrencyCode,
  CURRENCY_OPTIONS,
  currencySymbol,
  purchaseDate,
  setPurchaseDate,
  purchaseDateLabel,
  purchaseDateValue,
  formatDateForInput,
  vendorId,
  setVendorId,
  vendorOptions,
  basePrice,
  setBasePrice,
  shippingCost,
  setShippingCost,
  tax,
  setTax,
  totalCost,
  costPerSeat,
  setCostPerSeat,
  isFreeSoftwareLicense = false,
  warrantyMonths,
  setWarrantyMonths,
  WARRANTY_MONTH_OPTIONS,
  expectedLifespanYears,
  setExpectedLifespanYears,
  EXPECTED_LIFESPAN_OPTIONS,
  estimatedSalvageValue,
  setEstimatedSalvageValue,
  invoiceInputRef,
  showInvoiceUploader,
  setShowInvoiceUploader,
  handleInvoiceSelection,
  isInvoiceDragOver,
  setIsInvoiceDragOver,
  handleInvoiceDrop,
  invoiceFileName,
}: PurchaseDetailsSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-muted/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3
          className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
        >
          {config.purchaseSectionTitle}
        </h3>

        <div className="w-24">
          <SearchableDropdown
            options={CURRENCY_OPTIONS}
            placeholder="USD"
            emptyMessage="No currencies found."
            onSelect={setCurrencyCode}
            value={currencyCode}
          />
          <input type="hidden" name="currencyCode" value={currencyCode} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
        <InlineFieldRow
          label="Purchase Date :"
          error={getError(state, 'purchaseDate')}
          alignTop
        >
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-9 w-full justify-between rounded-lg px-3 text-left font-normal',
                    !purchaseDate ? 'text-muted-foreground' : 'text-foreground'
                  )}
                  aria-invalid={Boolean(getError(state, 'purchaseDate'))}
                >
                  <span>{purchaseDateLabel}</span>
                  <CalendarDays className="size-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={purchaseDateValue}
                  onSelect={(date) =>
                    setPurchaseDate(date ? formatDateForInput(date) : '')
                  }
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <input
              type="hidden"
              id="purchaseDate"
              name="purchaseDate"
              value={purchaseDate}
            />
          </>
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
          label="Base Price :"
          htmlFor="basePrice"
          error={getError(state, 'basePrice')}
        >
          <CurrencyInput
            id="basePrice"
            name="basePrice"
            value={basePrice}
            onChange={setBasePrice}
            currencySymbol={currencySymbol}
            error={getError(state, 'basePrice')}
            readOnly={isFreeSoftwareLicense}
          />
        </InlineFieldRow>

        {config.showShippingCost && (
          <InlineFieldRow
            label="Shipping Cost :"
            htmlFor="shippingCost"
            error={getError(state, 'shippingCost')}
          >
            <CurrencyInput
              id="shippingCost"
              name="shippingCost"
              value={shippingCost}
              onChange={setShippingCost}
              currencySymbol={currencySymbol}
              error={getError(state, 'shippingCost')}
            />
          </InlineFieldRow>
        )}

        <InlineFieldRow
          label="Tax :"
          htmlFor="tax"
          error={getError(state, 'tax')}
        >
          <CurrencyInput
            id="tax"
            name="tax"
            value={tax}
            onChange={setTax}
            currencySymbol={currencySymbol}
            error={getError(state, 'tax')}
            readOnly={isFreeSoftwareLicense}
          />
        </InlineFieldRow>

        <InlineFieldRow label="Total Cost :" htmlFor="totalCost" alignTop>
          <CurrencyInput
            id="totalCost"
            name="totalCost"
            value={totalCost.toFixed(2)}
            onChange={() => {}}
            currencySymbol={currencySymbol}
            readOnly
          />
        </InlineFieldRow>

        {config.showCostPerSeat && (
          <InlineFieldRow
            label="Cost Per Seat :"
            htmlFor="costPerSeat"
            alignTop
          >
            <CurrencyInput
              id="costPerSeat"
              name="costPerSeat"
              value={costPerSeat}
              onChange={setCostPerSeat}
              currencySymbol={currencySymbol}
              error={getError(state, 'costPerSeat')}
              readOnly={isFreeSoftwareLicense}
            />
          </InlineFieldRow>
        )}

        <InlineFieldRow
          label="Expected Lifespan :"
          error={getError(state, 'expectedLifespanYears')}
          alignTop
        >
          <>
            <SearchableDropdown
              options={EXPECTED_LIFESPAN_OPTIONS}
              placeholder="Expected Lifespan.."
              emptyMessage="No lifespan options found."
              onSelect={setExpectedLifespanYears}
              value={expectedLifespanYears}
            />
            {/* Drives straight-line depreciation. Editable later from the
                asset edit panel. */}
            <input
              type="hidden"
              name="expectedLifespanYears"
              value={expectedLifespanYears}
            />
          </>
        </InlineFieldRow>

        {config.showWarrantyPeriod && (
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
                value={warrantyMonths}
              />
              <input
                type="hidden"
                name="warrantyMonths"
                value={warrantyMonths}
              />
            </>
          </InlineFieldRow>
        )}

        {config.showEstimatedSalvageValue && (
          <InlineFieldRow
            label="Estimated Salvage Value :"
            htmlFor="estimatedSalvageValue"
            error={getError(state, 'estimatedSalvageValue')}
            alignTop
          >
            <CurrencyInput
              id="estimatedSalvageValue"
              name="estimatedSalvageValue"
              value={estimatedSalvageValue}
              onChange={setEstimatedSalvageValue}
              currencySymbol={currencySymbol}
              error={getError(state, 'estimatedSalvageValue')}
            />
          </InlineFieldRow>
        )}

        <div className="col-span-full">
          <InlineFieldRow
            label="Note :"
            htmlFor="notes"
            error={getError(state, 'notes')}
            alignTop
          >
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Add purchase related notes"
              className="min-h-20 resize-y"
              aria-invalid={Boolean(getError(state, 'notes'))}
            />
          </InlineFieldRow>
        </div>

        {config.showInvoiceAttachment && (
          <div className="col-span-full">
            <InlineFieldRow
              label="Invoice Attachment :"
              htmlFor="invoiceFile"
              error={getError(state, 'invoiceFile')}
              alignTop
            >
              <div className="space-y-2 sm:max-w-72">
                <input
                  ref={invoiceInputRef}
                  id="invoiceFile"
                  name="invoiceFile"
                  type="file"
                  accept={INVOICE_ATTACHMENT_ACCEPT}
                  className="sr-only"
                  onChange={(event) =>
                    handleInvoiceSelection(event.target.files)
                  }
                />

                {!showInvoiceUploader ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={() => {
                      setShowInvoiceUploader(true);
                      invoiceInputRef.current?.click();
                    }}
                  >
                    <Paperclip className="h-4 w-4" />
                    Add Invoice
                  </Button>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => invoiceInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        invoiceInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsInvoiceDragOver(true);
                    }}
                    onDragLeave={() => setIsInvoiceDragOver(false)}
                    onDrop={handleInvoiceDrop}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors',
                      isInvoiceDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/50'
                    )}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p
                        className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
                      >
                        Drag and drop invoice attachment, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports documents and images. Max 4.5MB.
                      </p>
                    </div>
                  </div>
                )}

                {invoiceFileName ? (
                  <p className="text-xs text-muted-foreground">
                    {invoiceFileName}
                  </p>
                ) : null}
              </div>
            </InlineFieldRow>
          </div>
        )}
      </div>
    </section>
  );
}
