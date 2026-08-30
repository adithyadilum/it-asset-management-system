import * as React from 'react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { cn } from '@/lib/utils';
import { parseCurrencyAmount } from '@/lib/currency';
import { type RegisterAssetActionState } from '@/lib/validations/asset-registration';

export function getError(
  state: RegisterAssetActionState,
  key: keyof NonNullable<RegisterAssetActionState['errors']>
) {
  return state.errors?.[key]?.[0];
}

export type RegistrationOption = React.ComponentProps<
  typeof SearchableDropdown
>['options'][number];

export type CustomSchemaField = {
  fieldName: string;
  inputType: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Boolean';
  required: boolean;
};

export type CategoryRegistrationOption = RegistrationOption & {
  pillar?: string;
  customSchema?: {
    modelSpecs: CustomSchemaField[];
    assetTracking: CustomSchemaField[];
  };
};

export type ModelRegistrationOption = RegistrationOption & {
  brandId: string;
  categoryId: string;
  imageUrl: string | null;
};

export type InlineFieldRowProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  alignTop?: boolean;
  children: React.ReactNode;
};

export type SearchableFieldRowProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RegistrationOption[];
  placeholder: string;
  emptyMessage: string;
  error?: string;
};

export function ErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-xs text-destructive">{error}</p>;
}

export function InlineFieldRow({
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
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} leading-tight text-foreground`}
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

export function SearchableFieldRow({
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
          value={value}
        />
        <input type="hidden" name={name} value={value} />
      </>
    </InlineFieldRow>
  );
}

export function sanitizeCurrencyInput(rawValue: string) {
  const normalizedValue = rawValue.replace(/[^\d.]/g, '');
  const [integerPart = '', ...fractionParts] = normalizedValue.split('.');
  const fractionPart = fractionParts.join('');

  if (normalizedValue.startsWith('.')) {
    return `.${fractionPart.slice(0, 2)}`;
  }

  if (fractionParts.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${fractionPart.slice(0, 2)}`;
}

export type CurrencyInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  currencySymbol: string;
  error?: string;
  readOnly?: boolean;
};

export function CurrencyInput({
  id,
  name,
  value,
  onChange,
  currencySymbol,
  error,
  readOnly = false,
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {currencySymbol}
      </span>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) =>
          onChange(sanitizeCurrencyInput(event.target.value))
        }
        onBlur={() => {
          if (value.length > 0) {
            onChange(parseCurrencyAmount(value).toFixed(2));
          }
        }}
        inputMode="decimal"
        placeholder="0.00"
        className={cn('pl-11', readOnly && 'bg-muted/40')}
        aria-invalid={Boolean(error)}
        readOnly={readOnly}
        aria-readonly={readOnly ? 'true' : undefined}
      />
    </div>
  );
}
