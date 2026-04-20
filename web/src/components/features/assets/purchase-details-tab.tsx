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
    <div className={cn('flex flex-col gap-[32px] w-full text-[14px] text-slate-900', className)}>
      {/* Currency Selector */}
      <div className="flex items-center w-full mt-2">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
          className="h-[34px] px-[12px] rounded-md bg-white border border-slate-200 shadow-sm text-[14px] font-medium text-slate-900 hover:bg-slate-50 focus:outline-none"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="LKR">LKR</option>
        </select>
      </div>

      {/* Purchase Information */}
      <div className="w-full">
        <dl className="grid grid-cols-[165px_1fr_165px_1fr] gap-x-[10px] gap-y-[24px] items-center leading-[20px]">
          <dt className="font-medium">Purchase Date :</dt>
          <dd className="font-light">{purchaseDate}</dd>

          <dt className="font-medium">Base Price :</dt>
          <dd className="font-light">{basePrice}</dd>

          <dt className="font-medium">Shipping Cost :</dt>
          <dd className="font-light">{shippingCost}</dd>

          <dt className="font-medium">Tax :</dt>
          <dd className="font-light">{tax}</dd>

          <dt className="font-medium">Total Cost :</dt>
          <dd className="font-light">{totalCost}</dd>

          <dt className="font-medium">Warranty Period :</dt>
          <dd className="font-light">{warrantyPeriod}</dd>

          {totalRepairCost && (
            <>
              <dt className="font-medium">Total Repair Cost :</dt>
              <dd className="font-light">{totalRepairCost}</dd>
            </>
          )}

          <dt className="font-medium">Invoice PDF :</dt>
          <dd>
            {invoicePdf ? (
              <button
                onClick={onInvoiceClick}
                className="h-[34px] px-[16px] py-[8px] rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center gap-[10px] font-medium text-slate-900 w-fit"
              >
                <FileText size={16} />
                <span>Invoice.pdf</span>
              </button>
            ) : (
              <span className="font-light text-slate-500">-</span>
            )}
          </dd>
        </dl>
      </div>

      {/* Vendor Details */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-[24px] flex flex-col gap-[24px] w-full shadow-[0px_1px_3px_rgba(0,0,0,0.1)]">
        <h3 className="text-[16px] font-medium leading-[24px] text-slate-900">Vendor Details</h3>
        <dl className="grid grid-cols-[165px_1fr] gap-x-[10px] gap-y-[14px] items-start leading-[20px]">
          <dt className="font-medium text-slate-900">Vendor ID :</dt>
          <dd className="font-light text-slate-600">{vendor.vendorId}</dd>

          <dt className="font-medium text-slate-900">Vendor Name :</dt>
          <dd className="font-light text-slate-600">{vendor.vendorName}</dd>

          <dt className="font-medium text-slate-900">Contact Person :</dt>
          <dd className="font-light text-slate-600">{vendor.contactPerson || '-'}</dd>

          <dt className="font-medium text-slate-900">Contact Number :</dt>
          <dd className="font-light text-slate-600">{vendor.contactNumber || '-'}</dd>

          <dt className="font-medium text-slate-900">Email :</dt>
          <dd className="font-light text-slate-600">{vendor.email || '-'}</dd>

          <dt className="font-medium text-slate-900">Website :</dt>
          <dd className="font-light text-slate-600">{vendor.website || '-'}</dd>

          <dt className="font-medium text-slate-900">Address :</dt>
          <dd className="font-light text-slate-600">{vendor.address || '-'}</dd>
        </dl>
      </div>
    </div>
  );
}