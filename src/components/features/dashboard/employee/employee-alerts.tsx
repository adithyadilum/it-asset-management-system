'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AssetAlert } from '@/components/shared/asset-alert';
import type { PortalAlerts } from '@/lib/data/portal-repo';
import { formatDate } from '@/lib/date';

interface EmployeeAlertsProps {
  alerts: PortalAlerts;
}

/**
 * Return reminders for the employee portal.
 *
 * Acceptance used to live here too, as one "Action Required" banner per pending
 * assignment. With three of them the banners were identical and the only way to
 * tell which asset a dialog belonged to was to open it, so Accept/Decline moved
 * onto the asset's own card. See `EmployeeAssetGrid`.
 */
export function EmployeeAlerts({ alerts }: EmployeeAlertsProps) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    const id = setInterval(refreshIfVisible, 300_000);
    const handleVisibilityChange = () => {
      refreshIfVisible();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return (
    <div className="flex w-full flex-col gap-3">
      {alerts.returnRequested.map((item) => (
        <AssetAlert
          key={`return-${item.assignmentId}`}
          variant="notice"
          title="Urgent Action Required"
          message={`IT has requested the immediate return of ${item.modelName}.`}
        />
      ))}

      {alerts.upcomingReturns.map((item) => (
        <AssetAlert
          key={`upcoming-${item.assignmentId}`}
          variant="reminder"
          title="Reminder"
          message={`Your ${item.modelName} is due for return on ${formatDate(item.expectedReturnDate, 'PP')}. Please back up your files.`}
        />
      ))}
    </div>
  );
}
