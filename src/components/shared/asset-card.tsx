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
  className?: string;
}

export function AssetCard({
  name,
  assetType,
  status = 'active',
  icon,
  assetId = '-',
  assignedDate = '-',
  className,
}: AssetCardProps) {
  return (
    <article
      className={cn('rounded-lg border border-border bg-card p-4', className)}
    >
      <header className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{assetType ?? 'Asset'}</p>
        <StatusBadge value={status} showIcon={true} className="text-xs" />
      </header>

      <div className="mt-4 flex items-center gap-3">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
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
      </div>
    </article>
  );
}
