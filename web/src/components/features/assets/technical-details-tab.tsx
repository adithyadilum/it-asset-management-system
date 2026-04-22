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
  const specEntries = Object.entries(specs).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );

  return (
    <div className={cn('flex flex-col gap-[32px] w-full text-[14px] text-slate-900', className)}>
      {/* Specifications Grid */}
      <div className="w-full mt-2">
        <dl className="grid grid-cols-[165px_1fr_165px_1fr] gap-x-[10px] gap-y-[24px] items-start leading-[20px]">
          {specEntries.map(([key, value], index) => (
            <React.Fragment key={index}>
              <dt className="font-medium text-slate-900 capitalize">
                {key.replace(/_/g, ' ')} :
              </dt>
              <dd className="font-light text-slate-900">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {/* Note Section */}
      {note && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-[24px] flex flex-col gap-[10px] w-full shadow-[0px_1px_3px_rgba(0,0,0,0.1)]">
          <div className="font-medium text-slate-900 leading-[20px]">Note :</div>
          <div className="font-light text-slate-900 leading-[20px]">
            {note}
          </div>
        </div>
      )}
    </div>
  );
}