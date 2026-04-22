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
    <div className={cn('flex w-full flex-col gap-8 text-sm text-foreground', className)}>
      {/* Specifications Grid */}
      <div className="mt-2 w-full">
        <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-2.5 gap-y-6 text-sm leading-5">
          {specEntries.map(([key, value], index) => (
            <React.Fragment key={index}>
              <dt className="font-medium capitalize text-foreground">
                {key.replace(/_/g, ' ')}
              </dt>
              <dd className="font-light text-foreground">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {/* Note Section */}
      {note && (
        <div className="flex w-full flex-col gap-2.5 rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
          <div className="font-medium leading-5 text-foreground">Note</div>
          <div className="font-light leading-5 text-foreground">
            {note}
          </div>
        </div>
      )}
    </div>
  );
}