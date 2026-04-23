'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export interface PurchaseDetailsTabProps {
  currency: string;
  purchaseDate: string;
  basePrice: string;
  shippingCost: string;
  tax: string;
  totalCost: string;
  warrantyPeriod: string;
  totalRepairCost?: string;
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
  purchaseDate,
  basePrice,
  shippingCost,
  tax,
  totalCost,
  warrantyPeriod,
  totalRepairCost,
  invoicePdf,
  vendor,
  onCurrencyChange,
  onInvoiceClick,
  className = '',
}: PurchaseDetailsTabProps) {
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
          isMono && 'font-mono tracking-wide'
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
        <select
          value={currency}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="LKR">LKR</option>
        </select>
      </div>

      {/* Purchase Information */}
      <div className="grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {renderField('Purchase Date', purchaseDate)}
        {renderField('Base Price', basePrice)}
        {renderField('Shipping Cost', shippingCost)}
        {renderField('Tax', tax)}
        {renderField('Total Cost', totalCost)}
        {renderField('Warranty Period', warrantyPeriod)}
        {totalRepairCost && renderField('Total Repair Cost', totalRepairCost)}

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