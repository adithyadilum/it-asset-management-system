import Image from 'next/image';
import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';

interface AssetCardProps {
  name: string;
  assetType?: string;
  status?: string;
  icon?: ReactNode;
  assetId?: string;
  assignedDate?: string;
  /** Assignment lifecycle state, shown beside the asset status. */
  assignmentState?: string;
  /** ISO date the asset is due back; rendered with an overdue treatment. */
  expectedReturnDate?: string | null;
  /**
   * Whether that date has passed. Decided by the caller rather than read from
   * the clock here: this renders on the server, and comparing against `now`
   * mid-render is exactly the impurity the compiler rejects.
   */
  isOverdue?: boolean;
  /** Model photo. The icon is the fallback when there is none. */
  imageUrl?: string | null;
  /** Accept/Decline and similar, so the action sits with the asset it concerns. */
  actions?: ReactNode;
  className?: string;
}

function formatDay(value: string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function AssetCard({
  name,
  assetType,
  status = 'active',
  icon,
  assetId = '-',
  assignedDate = '-',
  assignmentState,
  expectedReturnDate,
  isOverdue = false,
  imageUrl,
  actions,
  className,
}: AssetCardProps) {
  return (
    <article
      className={cn('rounded-lg border border-border bg-card p-4', className)}
    >
      <header className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{assetType ?? 'Asset'}</p>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* The holder could not tell an acknowledged asset from one still
              waiting on them; the asset status alone never said. */}
          {assignmentState ? (
            <StatusBadge
              value={assignmentState}
              showIcon={false}
              className="text-xs"
            />
          ) : null}
          <StatusBadge value={status} showIcon={true} className="text-xs" />
        </div>
      </header>

      <div className="mt-4 flex items-center gap-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-md object-cover"
          />
        ) : icon ? (
          <span className="text-muted-foreground">{icon}</span>
        ) : null}
        <h4 className="text-lg font-semibold tracking-tight text-card-foreground">
          {name}
        </h4>
      </div>

      <div className="mt-3 flex flex-col space-y-1">
        {/* Asset ID Line */}
        <div className="text-sm font-medium leading-5 text-muted-foreground">
          Asset ID: <span>{assetId}</span>
        </div>

        {/* Assigned Date Line */}
        <div className="text-sm font-medium leading-5 text-muted-foreground">
          Assigned: <span>{assignedDate}</span>
        </div>

        {expectedReturnDate ? (
          <div
            className={cn(
              'text-sm font-medium leading-5',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {isOverdue ? 'Overdue since: ' : 'Due back: '}
            <span>{formatDay(expectedReturnDate)}</span>
          </div>
        ) : null}
      </div>

      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
