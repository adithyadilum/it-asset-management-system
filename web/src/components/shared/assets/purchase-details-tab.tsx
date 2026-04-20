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
    <div className={cn('flex flex-col gap-6 w-full', className)}>
      {/* Currency Selector */}
      <div className="flex items-center gap-2">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="LKR">LKR</option>
        </select>
      </div>

      {/* Purchase Information */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {[
            { label: 'Base Price :', value: basePrice },
            { label: 'Purchase Date :', value: purchaseDate },
            { label: 'Tax :', value: tax },
            { label: 'Shipping Cost :', value: shippingCost },
            { label: 'Warranty Period :', value: warrantyPeriod },
            { label: 'Total Cost :', value: totalCost },
            ...(totalRepairCost ? [{ label: 'Total Repair Cost :', value: totalRepairCost }] : []),
          ].map((item, index) => (
            <React.Fragment key={index}>
              <dt className="text-sm font-medium text-slate-900">{item.label}</dt>
              <dd className="text-sm font-light text-slate-900">{item.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {/* Invoice Button */}
      {invoicePdf && (
        <button
          onClick={onInvoiceClick}
          className="h-[34px] rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-900 w-fit"
        >
          <FileText size={24} />
          <span>{invoicePdf}</span>
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-slate-200" />

      {/* Vendor Details */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
        <h3 className="text-base font-medium text-slate-900 mb-4">Vendor Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: 'Vendor ID :', value: vendor.vendorId },
            { label: 'Vendor Name :', value: vendor.vendorName },
            { label: 'Contact Person :', value: vendor.contactPerson || '-' },
            { label: 'Contact Number :', value: vendor.contactNumber || '-' },
            { label: 'Email :', value: vendor.email || '-' },
            { label: 'Website :', value: vendor.website || '-' },
            { label: 'Address :', value: vendor.address || '-' },
          ].map((item, index) => (
            <React.Fragment key={index}>
              <dt className="text-sm font-medium text-slate-900">{item.label}</dt>
              <dd className="text-sm font-light text-slate-900">{item.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}