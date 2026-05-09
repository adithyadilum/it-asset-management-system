'use client';

import React, { useMemo } from 'react';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { AssetDetailsTab } from './asset-details-tab';
import { RecentMaintenance } from './recent-maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';

export interface AssetAssignmentPanelProps {
  isOpen?: boolean;
  disableTransition?: boolean;
  isLoading?: boolean;
  assetId: string;
  assetTag: string;
  assetName?: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  department?: string;
  group: string;
  dateCreated: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  updatedAt: string;
  warranty: string;
  lastRepaired: string;
  note: string;
  status: string;
  state: string;
  imageUrl?: string;
  maintenanceEvents?: MaintenanceEvent[];
  onEdit?: () => void;
  onAssign?: () => void;
  onSendReminder?: () => void;
  onRequestReturn?: () => void;
  onMarkReceived?: () => void;
  onClose?: () => void;
}

export function AssetAssignmentDetailsPanel(props: AssetAssignmentPanelProps) {
  const isAssigned = ['Assigned', 'Requested', 'Overdue'].includes(props.status);
  const isOpen = props.isOpen ?? true;

  const detailsFields = useMemo(() => {
    const fields: { label: string; value: React.ReactNode }[] = [
      { label: 'Asset ID', value: props.assetTag || '-' },
      { label: 'Model', value: props.model || '-' },
      { label: 'Serial Number', value: props.serialNumber || '-' },
      { label: 'Category', value: props.category || '-' },
      { label: 'Brand', value: props.brand || '-' },
    ];

    if (!isAssigned) {
      fields.push({ label: 'Owner', value: props.owner || '-' });
    }

    fields.push(
      { label: 'Date Created', value: props.dateCreated || '-' },
      { label: 'Updated at', value: props.updatedAt || '-' },
      {
        label: 'Warranty',
        value: (
          <Badge
            variant="outline"
            className={cn(
              'h-5 rounded-full px-2 text-[11px] font-medium',
              props.warranty === 'Expired'
                ? 'border-red-300 bg-red-50 text-red-600'
                : 'border-blue-200 bg-blue-50 text-blue-600'
            )}
          >
            {props.warranty || '-'}
          </Badge>
        )
      },
      { label: 'Last Repaired', value: props.lastRepaired || '-' }
    );

    return fields;
  }, [props, isAssigned]);

  const titleNode = (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn('truncate text-foreground', TYPOGRAPHY_CLASSNAMES.textLgSemiBold)}>
        {props.assetName || props.model || 'Asset'}
      </span>
      <StatusBadge
        variant="metadata"
        label={`ID: ${props.assetTag || '-'}`}
      />
      <StatusBadge value={props.status} showIcon className="h-6 rounded-full px-2 text-[12px]" />
    </div>
  );
  const actions: SlidePanelAction[] = isAssigned ? [
    {
      id: 'received',
      label: 'Received',
      variant: 'outline',
      className: 'h-9 rounded-lg border-slate-200 px-4 text-sm',
      onClick: props.onMarkReceived,
    },
    {
      id: 'request-return',
      label: (props.state === 'pending approval' || props.state === 'requested') ? 'Send Reminder' : 'Request Return',
      className: 'h-9 rounded-lg bg-[#0B1D74] px-4 text-sm text-white hover:bg-[#0A175C]',
      onClick: (props.state === 'pending approval' || props.state === 'requested') ? props.onSendReminder : props.onRequestReturn,
    }
  ] : [
    {
      id: 'edit',
      label: 'Edit',
      variant: 'outline',
      className: 'h-9 rounded-lg border-slate-200 px-4 text-sm',
      onClick: props.onEdit,
    },
    {
      id: 'assign',
      label: 'Assign',
      className: 'h-9 rounded-lg bg-[#0B1D74] px-4 text-sm text-white hover:bg-[#0A175C]',
      onClick: props.onAssign,
    }
  ];

  const content = props.isLoading ? (
    <AssetLoadingSkeleton />
  ) : (
    <div className="flex flex-col gap-6 pb-6">
      <AssetDetailsTab
        imageUrl={props.imageUrl}
        note={props.note}
        assetTag={props.assetTag || '-'}
        fields={[...detailsFields, ...(isAssigned ? [
          { label: 'Assigned to', value: props.assignedTo || '-' },
          { label: 'Department', value: props.department || props.group || '-' },
          { label: 'Assigned Date', value: props.assignedDate || '-' },
          { label: 'Due Date', value: props.expectedReturnDate || '-' },
        ] : [])]}
        mode={props.category === 'Software' ? 'software' : 'default'}
        hideMaintenance={true}
      />
      {!isAssigned && props.category !== 'Software' && (
        <div className="-mx-2 mt-4">
          <RecentMaintenance
            assetTag={props.assetTag}
            isOpen={isOpen}
          />
        </div>
      )}
    </div>
  );

  return (
    <SlidePanel
      isOpen={isOpen}
      disableTransition={props.disableTransition}
      onClose={() => props.onClose?.()}
      title={titleNode}
      content={content}
      actions={actions}
    />
  );
}