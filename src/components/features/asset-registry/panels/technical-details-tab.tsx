'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Textarea } from '@/components/ui/textarea';

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
      <div className="mt-2 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {specEntries.map(([key, value], index) => {
          const isLongValue = typeof value === 'string' && value.length > 40;
          return (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between border-b border-border/40 py-2.5',
                isLongValue && 'col-span-full'
              )}
            >
              <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-muted-foreground capitalize')}>
                {key.replace(/_/g, ' ')}
              </div>
              <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-right text-foreground')}>
                {value}
              </div>
            </div>
          );
        })}

        {/* Note Section */}
        {note && (
          <div className="col-span-full mt-4 space-y-2">
            <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-muted-foreground')}>
              Note
            </div>
            <Textarea
              readOnly
              value={note}
              className="min-h-25 w-full resize-none bg-muted/30 text-foreground focus-visible:ring-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}