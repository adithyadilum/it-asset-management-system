'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { useDashboardRefresh } from './dashboard-refresh-provider';
import { QuickActionsMenu } from './quick-actions-menu';
import type { UserRole } from '@/types/auth';

interface DashboardHeaderProps {
  userName: string;
  userRole: UserRole;
}

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHrs = Math.floor(diffMins / 60);
  return `${diffHrs}h ago`;
}

export function DashboardHeader({ userName, userRole }: DashboardHeaderProps) {
  const { lastRefreshedAt, refresh } = useDashboardRefresh();

  // Compute initial value synchronously instead of calling setState in effect
  const initialRelativeTime = useMemo(
    () => getRelativeTimeString(lastRefreshedAt),
    [lastRefreshedAt]
  );
  const [relativeTime, setRelativeTime] = useState(initialRelativeTime);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Re-sync when lastRefreshedAt changes and tick every 30s
  useEffect(() => {
    // Update immediately asynchronously to avoid synchronous effect state updates
    const t = setTimeout(() => {
      setRelativeTime(getRelativeTimeString(lastRefreshedAt));
    }, 0);

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTimeString(lastRefreshedAt));
    }, 30_000);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [lastRefreshedAt]);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    // Reset spinning state after animation completes
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="flex items-center justify-between shrink-0 pb-2">
      {/* Left: Greeting + Date */}
      <div className="space-y-0.5">
        <h1
          className={cn(
            TYPOGRAPHY_CLASSNAMES.text2xlSemiBold,
            'text-foreground'
          )}
        >
          Welcome back, {userName.split(' ')[0]}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-3 py-1.5 rounded-md">
          <span>{formattedDate}</span>
          <span className="text-border">·</span>
          <span>Last refreshed {relativeTime}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          aria-label="Refresh dashboard data"
        >
          <RotateCcw
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-500',
              isRefreshing && 'animate-spin'
            )}
          />
        </Button>
        <QuickActionsMenu userRole={userRole} />
      </div>
    </div>
  );
}
