'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineItemProps {
  timestamp: string;
  title: string;
  description?: string;
  performedBy?: string;
  details?: string;
  icon: React.ReactNode;
  iconColor: 'success' | 'warning' | 'info' | 'error';
  isLast?: boolean;
}

export function TimelineItem({
  timestamp,
  title,
  description,
  performedBy,
  details,
  icon,
  iconColor,
  isLast = false,
}: TimelineItemProps) {
  const iconColorClasses = {
    success: 'bg-green-50 text-green-500',
    warning: 'bg-orange-50 text-orange-500',
    info: 'bg-blue-50 text-blue-500',
    error: 'bg-red-50 text-red-500',
  };

  const lineColorClasses = {
    success: 'bg-green-200',
    warning: 'bg-orange-200',
    info: 'bg-blue-200',
    error: 'bg-red-200',
  };

  return (
    <div className="flex gap-4 w-full">
      {/* Icon & Line Column */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
            iconColorClasses[iconColor]
          )}
        >
          {icon}
        </div>

        {!isLast && (
          <div
            className={cn(
              'w-0.5 grow',
              lineColorClasses[iconColor]
            )}
          />
        )}
      </div>

      {/* Content Column */}
      <div className="flex-1 pb-8 flex flex-col mt-1">
        <div className="flex justify-between items-start w-full">
          <div className="text-[14px] font-medium text-slate-900 leading-5">
            {title}
          </div>
          <div className="text-[12px] font-light text-slate-500 leading-5">
            {timestamp}
          </div>
        </div>

        {performedBy && (
          <div className="text-[14px] font-light text-slate-500 mt-0.5 leading-5">
            Performed by {performedBy}
          </div>
        )}

        {description && (
          <div className="text-[14px] font-light text-slate-500 mt-1.5 leading-5">
            {description}
          </div>
        )}

        {details && (
          <div className="text-[14px] font-light text-slate-500 mt-0.5 leading-5">
            {details}
          </div>
        )}
      </div>
    </div>
  );
}