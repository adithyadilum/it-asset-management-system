'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import {
  convertCurrencyAmount,
  formatMoneyByCurrency,
  SUPPORTED_CURRENCIES,
  tryParseCurrencyAmount,
} from '@/lib/currency';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PurchaseDetailsTabProps {
  currency: string;
  sourceCurrency?: string;
  purchaseDate: string;
  basePrice: string;
  shippingCost: string;
  tax: string;
  totalCost: string;
  warrantyPeriod: string;
  totalRepairCost?: string;
  currentBookValue?: number;
  totalTCO?: number;
  invoicePdf?: string;
  vendor: {
    vendorId: string;
    vendorName: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  onCurrencyChange?: (currency: string) => void;
  onInvoiceClick?: () => void;
  className?: string;
}

export function PurchaseDetailsTab({
  currency,
  sourceCurrency,
  purchaseDate,
  basePrice,
  shippingCost,
  tax,
  totalCost,
  warrantyPeriod,
  totalRepairCost,
  currentBookValue,
  totalTCO,
  invoicePdf,
  vendor,
  onCurrencyChange,
  onInvoiceClick,
  className = '',
}: PurchaseDetailsTabProps) {
  const resolvedSourceCurrency = sourceCurrency ?? currency;

  const formatConvertedMoney = (value: string | undefined) => {
    const parsedValue = tryParseCurrencyAmount(value);
    if (parsedValue === null) {
      return value || '-';
    }

    const convertedValue = convertCurrencyAmount(
      parsedValue,
      resolvedSourceCurrency,
      currency
    );

    return formatMoneyByCurrency(convertedValue, currency);
  };

  const formattedBasePrice = formatConvertedMoney(basePrice);
  const formattedShippingCost = formatConvertedMoney(shippingCost);
  const formattedTax = formatConvertedMoney(tax);
  const formattedTotalCost = formatConvertedMoney(totalCost);
  const formattedTotalRepairCost = totalRepairCost
    ? formatConvertedMoney(totalRepairCost)
    : undefined;
  const formattedBookValue = currentBookValue != null
    ? formatConvertedMoney(String(currentBookValue))
    : undefined;
  const formattedTCO = totalTCO != null
    ? formatConvertedMoney(String(totalTCO))
    : undefined;

  const renderField = (label: string, value: React.ReactNode, isMono: boolean = false, isLong: boolean = false) => (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border/40 py-2.5',
        isLong && 'col-span-full'
      )}
    >
      <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-slate-500')}>
        {label}
      </div>
      <div
        className={cn(
          TYPOGRAPHY_CLASSNAMES.textSmMedium,
          'text-right text-slate-900',
          isMono && 'font-mono tabular-nums tracking-wide'
        )}
      >
        {value || '-'}
      </div>
    </div>
  );

  return (
    <div className={cn('flex w-full flex-col gap-8 text-sm text-foreground', className)}>
      {/* Currency Selector */}
      <div className="mt-2 flex w-full items-center">
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="h-8 w-28">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((currencyOption) => (
              <SelectItem key={currencyOption} value={currencyOption}>
                {currencyOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Purchase Information */}
      <div className="grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {renderField('Purchase Date', purchaseDate)}
        {renderField('Base Price', formattedBasePrice, true)}
        {renderField('Shipping Cost', formattedShippingCost, true)}
        {renderField('Tax', formattedTax, true)}
        {renderField('Total Cost', formattedTotalCost, true)}
        {renderField('Warranty Period', warrantyPeriod)}
        {formattedTotalRepairCost &&
          renderField('Total Repair Cost', formattedTotalRepairCost, true)}
        {formattedBookValue &&
          renderField('Current Book Value', formattedBookValue, true)}
        {formattedTCO &&
          renderField('Total Cost of Ownership (TCO)', formattedTCO, true)}

        <div className="flex items-center justify-between border-b border-border/40 py-2.5">
          <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-500')}>
            Invoice PDF
          </div>
          <div>
            {invoicePdf ? (
              <a
                href={invoicePdf}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onInvoiceClick}
                className="flex w-fit items-center justify-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent"
              >
                <FileText size={16} />
                <span className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Invoice.pdf</span>
              </a>
            ) : (
              <span className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-400')}>-</span>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-muted/30 p-6 shadow-sm">
        <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textLgSemiBold, 'text-slate-900')}>Vendor Details</h3>
        <div className="grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
          {renderField('Vendor ID', vendor.vendorId, true)}
          {renderField('Vendor Name', vendor.vendorName)}
          {renderField('Contact Person', vendor.contactPerson)}
          {renderField('Contact Number', vendor.contactNumber)}
          {renderField('Email', vendor.email)}
          {renderField('Website', vendor.website)}
          {renderField('Address', vendor.address, false, true)}
        </div>
      </div>
    </div>
  );
}