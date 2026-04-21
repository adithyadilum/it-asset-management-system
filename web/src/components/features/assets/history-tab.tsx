'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineItem } from './timeline-item';

import { type HistoryEvent } from '@/actions/assets';

export interface HistoryTabProps {
  events: HistoryEvent[];
  onViewAll?: () => void;
  className?: string;
}

const eventConfig = {
  'Asset Assigned': { icon: CheckCircle2, color: 'success' as const },
  'Status Updated': { icon: AlertCircle, color: 'warning' as const },
  'Condition Updated': { icon: AlertCircle, color: 'warning' as const },
  'Location Assigned': { icon: CheckCircle2, color: 'success' as const },
  'Maintenance Initiated': { icon: Wrench, color: 'warning' as const },
  'Repair Initiated': { icon: Wrench, color: 'warning' as const },
  'Asset Created': { icon: Plus, color: 'success' as const },
  'Asset Transferred': { icon: CheckCircle2, color: 'info' as const },
};

export function HistoryTab({
  events,
  onViewAll,
  className = '',
}: HistoryTabProps) {
  return (
    <div className={cn('flex flex-col gap-6 w-full', className)}>
      <div className="space-y-0">
        {events.map((event, index) => {
          // Add a fallback icon and color for unmapped events
          const config = eventConfig[event.eventType as keyof typeof eventConfig] || { icon: AlertCircle, color: 'info' };
          const IconComponent = config.icon;

          return (
            <TimelineItem
              key={event.id}
              timestamp={event.timestamp}
              title={event.eventType}
              description={event.description}
              performedBy={event.actor}
              details={event.details}
              icon={<IconComponent size={20} />}
              iconColor={config.color}
              isLast={index === events.length - 1}
            />
          );
        })}
      </div>

      {onViewAll && events.length > 0 && (
        <button
          onClick={onViewAll}
          className="text-sm font-light text-blue-500 hover:text-blue-600 transition-colors underline text-left"
        >
          View all history
        </button>
      )}
    </div>
  );
}