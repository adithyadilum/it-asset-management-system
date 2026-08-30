'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  Wrench,
  Hash,
  ArrowUpRight,
} from 'lucide-react';
import type { RecentActivity } from '@/types/dashboard';

function getActionStyles(actionType: string) {
  const type = actionType.toUpperCase();

  if (type.includes('CREATE') || type.includes('ADD')) {
    return {
      icon: Hash,
      className:
        'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    };
  }
  if (
    type.includes('UPDATE') ||
    type.includes('REPAIR') ||
    type.includes('MAINTENANCE')
  ) {
    return {
      icon: Wrench,
      className:
        'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-400',
      iconColor: 'text-sky-500 dark:text-sky-400',
    };
  }
  if (
    type.includes('DELETE') ||
    type.includes('REMOVE') ||
    type.includes('LOST') ||
    type.includes('ACCESS_DENIED')
  ) {
    return {
      icon: AlertCircle,
      className:
        'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400',
      iconColor: 'text-rose-500 dark:text-rose-400',
    };
  }
  if (type.includes('DISPOSE')) {
    return {
      icon: AlertCircle,
      className:
        'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400',
      iconColor: 'text-orange-500 dark:text-orange-400',
    };
  }
  if (type.includes('LOGIN')) {
    return {
      icon: CheckCircle2,
      className:
        'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-400',
      iconColor: 'text-violet-500 dark:text-violet-400',
    };
  }

  return {
    icon: CheckCircle2,
    className:
      'border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
    iconColor: 'text-muted-foreground dark:text-zinc-400',
  };
}

interface RecentActivitiesListProps {
  activities: RecentActivity[];
}

export function RecentActivitiesList({
  activities,
}: RecentActivitiesListProps) {
  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-4 pb-2 shrink-0">
        <CardTitle
          className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-foreground')}
        >
          <Link
            href="/reports/audit-log"
            className="group inline-flex items-center gap-1 hover:text-primary transition-colors duration-200 cursor-pointer"
          >
            Recent Activities
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0 transition-all duration-200 text-primary shrink-0" />
          </Link>
        </CardTitle>
        <p
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textXsRegular,
            'text-muted-foreground'
          )}
        >
          latest actions, updates, and system events
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 pr-1">
            {activities.length > 0 ? (
              activities.map((item) => {
                const styles = getActionStyles(item.actionType);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-2.5 px-2.5 py-2 rounded-md border text-xs font-medium',
                      styles.className
                    )}
                  >
                    <styles.icon
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 mt-0.5',
                        styles.iconColor
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="leading-tight line-clamp-1">
                        {item.text}
                      </span>
                      <span className="text-[10px] font-normal opacity-70 mt-0.5">
                        {formatDate(item.performedAt, 'MMM dd, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md py-8">
                No recent activity found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
