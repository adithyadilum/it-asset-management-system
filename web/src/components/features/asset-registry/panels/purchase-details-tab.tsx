'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="w-full">
        <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-2.5 gap-y-6 leading-5">
          <dt className="font-medium">Purchase Date</dt>
          <dd className="font-light">{purchaseDate}</dd>

          <dt className="font-medium">Base Price</dt>
          <dd className="font-light">{basePrice}</dd>

          <dt className="font-medium">Shipping Cost</dt>
          <dd className="font-light">{shippingCost}</dd>

          <dt className="font-medium">Tax</dt>
          <dd className="font-light">{tax}</dd>

          <dt className="font-medium">Total Cost</dt>
          <dd className="font-light">{totalCost}</dd>

          <dt className="font-medium">Warranty Period</dt>
          <dd className="font-light">{warrantyPeriod}</dd>

          {totalRepairCost && (
            <>
              <dt className="font-medium">Total Repair Cost</dt>
              <dd className="font-light">{totalRepairCost}</dd>
            </>
          )}

          <dt className="font-medium">Invoice PDF</dt>
          <dd>
            {invoicePdf ? (
              <a
                href={invoicePdf}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onInvoiceClick}
                className="flex w-fit items-center justify-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent"
              >
                <FileText size={16} />
                <span>Invoice.pdf</span>
              </a>
            ) : (
              <span className="font-light text-muted-foreground">-</span>
            )}
          </dd>
        </dl>
      </div>

      {/* Vendor Details */}
      <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
        <h3 className="text-base font-medium leading-6 text-foreground">Vendor Details</h3>
        <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-2.5 gap-y-3.5 leading-5">
          <dt className="font-medium text-foreground">Vendor ID</dt>
          <dd className="font-light text-muted-foreground">{vendor.vendorId}</dd>

          <dt className="font-medium text-foreground">Vendor Name</dt>
          <dd className="font-light text-muted-foreground">{vendor.vendorName}</dd>

          <dt className="font-medium text-foreground">Contact Person</dt>
          <dd className="font-light text-muted-foreground">{vendor.contactPerson || '-'}</dd>

          <dt className="font-medium text-foreground">Contact Number</dt>
          <dd className="font-light text-muted-foreground">{vendor.contactNumber || '-'}</dd>

          <dt className="font-medium text-foreground">Email</dt>
          <dd className="font-light text-muted-foreground">{vendor.email || '-'}</dd>

          <dt className="font-medium text-foreground">Website</dt>
          <dd className="font-light text-muted-foreground">{vendor.website || '-'}</dd>

          <dt className="font-medium text-foreground">Address</dt>
          <dd className="font-light text-muted-foreground">{vendor.address || '-'}</dd>
        </dl>
      </div>
    </div>
  );
}