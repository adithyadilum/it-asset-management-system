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
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full',
            iconColorClasses[iconColor]
          )}
        >
          {icon}
        </div>

        {!isLast && (
          <div
            className={cn(
              'w-1 flex-grow',
              lineColorClasses[iconColor]
            )}
          />
        )}
      </div>

      <div className="flex-1 pb-6">
        <div className="text-xs text-slate-400 text-right mb-1">
          {timestamp}
        </div>

        <div className="text-sm font-medium text-slate-900 mb-1">
          {title}
        </div>

        {performedBy && (
          <div className="text-xs text-slate-500 mb-2">
            Performed by {performedBy}
          </div>
        )}

        {description && (
          <div className="text-sm text-slate-600 mb-2">
            {description}
          </div>
        )}

        {details && (
          <div className="text-sm text-slate-600">
            {details}
          </div>
        )}
      </div>
    </div>
  );
}