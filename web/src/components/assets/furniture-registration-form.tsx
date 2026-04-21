'use client';

import * as React from 'react';
import { Filter, Paperclip, Plus, Search } from 'lucide-react';
import Image from 'next/image';

import { useOpenRegistrationPanel } from '@/components/assets/use-open-registration-panel';
import { FormPanel } from '@/components/shared/slide-panels/form-panel';
import { tiqriToast } from '@/components/shared/sonner';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type RegistrationOption = React.ComponentProps<
  typeof SearchableDropdown
>['options'][number];

type ModelRegistrationOption = RegistrationOption & {
  manufacturerId: string;
  categoryId: string;
};

type FurnitureRegistryPageClientProps = {
  categoryOptions: RegistrationOption[];
  manufacturerOptions: RegistrationOption[];
  productLineOptions: ModelRegistrationOption[];
  locationOptions: RegistrationOption[];
  vendorOptions: RegistrationOption[];
};

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

const CONDITION_OPTIONS: RegistrationOption[] = [
  { value: 'New', label: 'New' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Fair', label: 'Fair' },
  { value: 'Poor', label: 'Poor' },
  { value: 'Damaged', label: 'Damaged' },
];

const CURRENCY_OPTIONS: RegistrationOption[] = [
  { value: 'USD', label: 'USD' },
  { value: 'LKR', label: 'LKR' },
  { value: 'EUR', label: 'EUR' },
];

const WARRANTY_MONTH_OPTIONS: RegistrationOption[] = [
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '12', label: '12 Months' },
  { value: '24', label: '24 Months' },
  { value: '36', label: '36 Months' },
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

      {error ? <p className="pl-[140px] text-xs text-destructive">{error}</p> : null}
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

function CircleImageUpload({
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

export function FurnitureRegistryPageClient({
  categoryOptions,
  manufacturerOptions,
  productLineOptions,
  locationOptions,
  vendorOptions,
}: FurnitureRegistryPageClientProps) {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const openRegistrationPanel = useOpenRegistrationPanel(setIsPanelOpen);

  const invoiceInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [categoryId, setCategoryId] = React.useState('');
  const [manufacturerId, setManufacturerId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [productLineId, setProductLineId] = React.useState('');
  const [floor, setFloor] = React.useState('');
  const [condition, setCondition] = React.useState('');
  const [material, setMaterial] = React.useState('');
  const [headerNote, setHeaderNote] = React.useState('');
  const [dimensions, setDimensions] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState(getTodayDateValue);
  const [basePrice, setBasePrice] = React.useState('');
  const [shippingCost, setShippingCost] = React.useState('');
  const [tax, setTax] = React.useState('');
  const [vendorId, setVendorId] = React.useState('');
  const [warrantyMonths, setWarrantyMonths] = React.useState('');
  const [purchaseNote, setPurchaseNote] = React.useState('');
  const [currencyCode, setCurrencyCode] = React.useState(
    CURRENCY_OPTIONS[0]?.value ?? ''
  );
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

  const filteredProductLineOptions = React.useMemo(
    () =>
      productLineOptions
        .filter((option) => {
          const matchesCategory =
            categoryId.length === 0 || option.categoryId === categoryId;
          const matchesManufacturer =
            manufacturerId.length === 0 ||
            option.manufacturerId === manufacturerId;

          return matchesCategory && matchesManufacturer;
        })
        .map(({ value, label }) => ({ value, label })),
    [categoryId, manufacturerId, productLineOptions]
  );

  React.useEffect(() => {
    if (!productLineId) {
      return;
    }

    const selectedStillValid = filteredProductLineOptions.some(
      (option) => option.value === productLineId
    );

    if (!selectedStillValid) {
      setProductLineId('');
    }
  }, [filteredProductLineOptions, productLineId]);

  const productLineEmptyMessage =
    categoryId.length > 0 || manufacturerId.length > 0
      ? 'No product lines found for selected category and manufacturer.'
      : 'No product lines found.';

  const panelBody = (
    <div className={cn('space-y-4', isSubmitting && 'pointer-events-none opacity-70')}>
      <input type="hidden" name="pillar" value="Office Furniture" />

      <CircleImageUpload
        inputId="furnitureImage"
        inputName="furnitureImage"
        previewUrl={imagePreviewUrl}
        onChange={handleImageChange}
        label="Upload furniture image"
      />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <DropdownFieldRow
          label="Category :"
          name="categoryId"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
          placeholder="Select Category.."
          emptyMessage="No categories found."
        />

        <DropdownFieldRow
          label="Manufacturer :"
          name="manufacturerId"
          value={manufacturerId}
          onChange={setManufacturerId}
          options={manufacturerOptions}
          placeholder="Select Manufacturer.."
          emptyMessage="No manufacturers found."
        />

        <DropdownFieldRow
          label="Location :"
          name="locationId"
          value={locationId}
          onChange={setLocationId}
          options={locationOptions}
          placeholder="Select Location.."
          emptyMessage="No locations found."
        />

        <DropdownFieldRow
          label="Product Line :"
          name="productLineId"
          value={productLineId}
          onChange={setProductLineId}
          options={filteredProductLineOptions}
          placeholder="Select Product.."
          emptyMessage={productLineEmptyMessage}
        />

        <FieldRow label="Floor :" htmlFor="floor">
          <Input
            id="floor"
            name="floor"
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
            placeholder="3"
          />
        </FieldRow>

        <DropdownFieldRow
          label="Condition :"
          name="condition"
          value={condition}
          onChange={setCondition}
          options={CONDITION_OPTIONS}
          placeholder="Select Condition.."
          emptyMessage="No conditions found."
        />

        <FieldRow label="Material :" htmlFor="material">
          <Input
            id="material"
            name="material"
            value={material}
            onChange={(event) => setMaterial(event.target.value)}
            placeholder="Wood"
          />
        </FieldRow>

        <FieldRow label="Note :" htmlFor="headerNote">
          <Input
            id="headerNote"
            name="headerNote"
            value={headerNote}
            onChange={(event) => setHeaderNote(event.target.value)}
            placeholder="Additional details"
          />
        </FieldRow>

        <FieldRow label="Dimensions :" htmlFor="dimensions">
          <Input
            id="dimensions"
            name="dimensions"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
            placeholder="60x30x29 in"
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

          <FieldRow label="Shipping Cost :" htmlFor="shippingCost">
            <Input
              id="shippingCost"
              name="shippingCost"
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(event) => setShippingCost(event.target.value)}
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
            options={vendorOptions}
            placeholder="Select Vendor.."
            emptyMessage="No vendors found."
          />

          <DropdownFieldRow
            label="Warranty Period :"
            name="warrantyMonths"
            value={warrantyMonths}
            onChange={setWarrantyMonths}
            options={WARRANTY_MONTH_OPTIONS}
            placeholder="Warranty Period.."
            emptyMessage="No warranty periods found."
          />

          <FieldRow label="Note :" htmlFor="purchaseNote">
            <Input
              id="purchaseNote"
              name="purchaseNote"
              value={purchaseNote}
              onChange={(event) => setPurchaseNote(event.target.value)}
              placeholder="Purchase notes"
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
            <h1 className="text-lg font-semibold text-foreground">Furniture Registry</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Register and manage furniture and fixture assets.
            </p>
          </div>

          <Button type="button" onClick={openRegistrationPanel} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>

        <div className="min-h-0 flex-1 p-4 md:p-6">
          <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>
                Furniture Assets
              </h2>

              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search assets..." />
                </div>

                <Button type="button" variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Condition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-36 text-center text-sm text-muted-foreground"
                    >
                      Furniture list integration can be mounted here.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <FormPanel
        isOpen={isPanelOpen}
        onClose={setIsPanelOpen}
        title="Asset Registry"
        description="Furniture & Fixtures"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);

          // Frontend-first form shell for furniture registration.
          await Promise.resolve();

          setIsSubmitting(false);
          setIsPanelOpen(false);
          tiqriToast.success('Furniture registration form is ready for backend integration.');
        }}
        isSubmitting={isSubmitting}
        submitLabel="Add Asset"
        submittingLabel="Adding asset..."
        cancelLabel="Discard"
      >
        {panelBody}
      </FormPanel>
    </div>
  );
}