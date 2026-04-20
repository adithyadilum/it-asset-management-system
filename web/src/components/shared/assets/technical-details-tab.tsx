'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TechnicalDetailsTabProps {
  specs: Record<string, string | number | undefined>;
  note?: string;
  className?: string;
}

export function TechnicalDetailsTab({
  specs,
  note,
  className = '',
}: TechnicalDetailsTabProps) {
  const specEntries = Object.entries(specs)
    .filter(([, value]) => value !== undefined && value !== null);

  return (
    <div className={cn('flex flex-col gap-6 w-full', className)}>
      {/* Specifications Grid */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {specEntries.map(([key, value], index) => (
            <React.Fragment key={index}>
              <dt className="text-sm font-medium text-slate-900">
                {key.replace(/_/g, ' ')} :
              </dt>
              <dd className="text-sm font-light text-slate-900">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {/* Note Section */}
      {note && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
          <div className="text-sm font-medium text-slate-900 mb-2">Note :</div>
          <div className="text-sm font-light text-slate-900 leading-5">
            {note}
          </div>
        </div>
      )}
    </div>
  );
}