'use client';

import React, { useMemo } from 'react';
import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from './asset-details-tab';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';

export interface AssetAssignmentDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  assetId: string;
  assetTag: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  group: string;
  dateCreated: string;
  updatedAt: string;
  warranty: string;
  lastRepaired: string;
  note: string;
  status: string;
  imageUrl?: string;
  maintenanceEvents?: MaintenanceEvent[];
  onEdit?: () => void;
  onAssign?: () => void;
}

export function AssetAssignmentDetailsPanel(props: AssetAssignmentDetailsPanelProps) {
  
  const content = useMemo(() => {
    if (props.isLoading) return <AssetLoadingSkeleton />;

    const identityFields = [
      { label: 'Asset ID :', value: props.assetId },
      { label: 'Category :', value: props.category },
      { label: 'Model :', value: props.model },
      { label: 'Brand :', value: props.brand },
      { label: 'Serial Number :', value: props.serialNumber },
      { label: 'Owner :', value: props.owner },
      { label: 'Assigned to :', value: props.assignedTo },
      { label: 'Group :', value: props.group },
      { label: 'Date Created :', value: props.dateCreated },
      { 
        label: 'Warranty :', 
        value: (
          <Badge 
            variant="outline" 
            className={cn(
              "h-5 rounded-full px-2 text-[11px] font-medium",
              props.warranty === 'Expired' ? "border-red-200 bg-red-50 text-red-600" : "border-blue-200 bg-blue-50 text-blue-600"
            )}
          >
            {props.warranty}
          </Badge>
        ) 
      },
      { label: 'Updated at :', value: props.updatedAt },
      { label: 'Last Repaired :', value: props.lastRepaired },
      { label: 'Note :', value: props.note },
      { 
        label: 'Asset Tag :', 
        value: (
          <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-700 hover:bg-slate-100">
            <QrCode className="size-3.5" />
            {props.assetTag}
          </Badge>
        ) 
      },
    ];

    return (
      <AssetDetailsTab
        assetTag={props.assetTag}
        imageUrl={props.imageUrl}
        status={props.status}
        note={props.note}
        fields={identityFields} 
        maintenanceRecords={props.maintenanceEvents}
      />
    );
  }, [props]);

  const actions: SlidePanelAction[] = [
    { id: 'edit', label: 'Edit', variant: 'outline', onClick: props.onEdit },
    { id: 'assign', label: 'Assign', variant: 'default', onClick: props.onAssign },
  ];

  return (
    <SlidePanel
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Asset Assignments"
      description="Asset Details"
      content={content}
      actions={actions}
    />
  );
}