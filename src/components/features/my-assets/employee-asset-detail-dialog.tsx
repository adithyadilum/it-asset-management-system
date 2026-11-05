'use client';

import Image from 'next/image';
import { AppWindow, AlertCircle, Copy, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  EmployeeAssignedAsset,
  EmployeeSoftwareAsset,
} from '@/actions/employee';
import { StatusBadge } from '@/components/shared/status-badge';
import { tiqriToast } from '@/components/shared/sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { employeeAssetSpecs } from '@/lib/employee-asset-specs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatAssetName } from '@/lib/asset-name';
import { formatAssignmentState } from '@/lib/assignments/labels';
import { SUPPORT_EMAIL } from '@/lib/constants';

export type EmployeeAssetDialogTarget =
  | { kind: 'equipment'; asset: EmployeeAssignedAsset; icon?: ReactNode }
  | { kind: 'software'; asset: EmployeeSoftwareAsset; icon?: ReactNode };

interface EmployeeAssetDetailDialogProps {
  target: EmployeeAssetDialogTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestAccept?: (asset: EmployeeAssignedAsset) => void;
  onRequestReject?: (asset: EmployeeAssignedAsset) => void;
}

function formatDay(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Colombo',
      }).format(date);
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\b(Os|Ram|Cpu|Gpu|Ssd|Usb|Hdmi|Id)\b/g, (word) =>
      word.toUpperCase()
    );
}

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value))
    return value.map(formatValue).filter(Boolean).join(', ');
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, item]) => {
        const text = formatValue(item);
        return text ? `${formatLabel(key)}: ${text}` : '';
      })
      .filter(Boolean)
      .join('; ');
  return String(value);
}

function entries(record: Record<string, unknown> | null | undefined) {
  return Object.entries(record ?? {}).flatMap(([key, value]) => {
    const text = formatValue(value);
    return text ? [{ label: formatLabel(key), value: text }] : [];
  });
}

function Details({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="divide-y divide-border/50">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-start gap-5 py-3 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-start justify-end gap-1.5">
      <span className="break-all font-mono text-xs leading-7">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            tiqriToast.success(`${label} copied to clipboard.`);
          } catch {
            tiqriToast.error(`Could not copy ${label.toLowerCase()}.`);
          }
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </span>
  );
}

export function EmployeeAssetDetailDialog({
  target,
  open,
  onOpenChange,
  onRequestAccept,
  onRequestReject,
}: EmployeeAssetDetailDialogProps) {
  if (!target) return null;
  const asset = target.asset;
  const name = formatAssetName(asset.brandName, asset.modelName);
  const pending =
    target.kind === 'equipment' &&
    target.asset.assignmentState === 'pending approval';
  const overdue = target.kind === 'equipment' && target.asset.isOverdue;
  const technical = entries(employeeAssetSpecs(asset.technicalDetails)),
    attributes = entries(employeeAssetSpecs(asset.instanceAttributes));
  const hasSpecifications = technical.length > 0 || attributes.length > 0;
  const subject = encodeURIComponent(
    `Support Request: ${name} (${asset.assetTag})`
  );
  const body = encodeURIComponent(
    `Hi IT Support,\n\nI need assistance with ${name} (${asset.assetTag}).\n\nDetails:\n`
  );
  const identifiers = [
    {
      label: 'Asset tag',
      value: <CopyValue label="asset tag" value={asset.assetTag} />,
    },
    { label: 'Category', value: asset.categoryName || asset.pillar },
    ...(target.kind === 'equipment'
      ? [
          {
            label: 'Serial number',
            value: target.asset.serialNumber ? (
              <CopyValue
                label="serial number"
                value={target.asset.serialNumber}
              />
            ) : (
              'Not recorded'
            ),
          },
        ]
      : []),
  ];

  const overview = (
    <div className="space-y-6 pt-1">
      {pending || overdue ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">
              {pending ? 'Confirm your assignment' : 'This asset is overdue'}
            </p>
            <p className="leading-relaxed text-muted-foreground">
              {pending
                ? 'Check the equipment and its recorded condition before accepting. You can report an issue if anything is incorrect.'
                : `The return date was ${target.kind === 'equipment' ? formatDay(target.asset.expectedReturnDate) : ''}. Contact IT to arrange a return or extension.`}
            </p>
          </div>
        </div>
      ) : null}
      <Details title="Asset information" rows={identifiers} />
      {target.kind === 'equipment' ? (
        <Details
          title="Assignment"
          rows={[
            {
              label: 'Assigned on',
              value: formatDay(target.asset.assignedDate),
            },
            {
              label: 'Return by',
              value: target.asset.expectedReturnDate
                ? formatDay(target.asset.expectedReturnDate)
                : 'Open-ended',
            },
            {
              label: 'Assigned by',
              value: target.asset.assignedByName || 'Not recorded',
            },
            {
              label: 'Location',
              value: target.asset.locationName || 'Not recorded',
            },
            {
              label: 'Condition',
              value: target.asset.condition ? (
                <StatusBadge value={target.asset.condition} showIcon={false} />
              ) : (
                'Not recorded'
              ),
            },
            {
              label: 'Acknowledgement',
              value: target.asset.acceptedAt
                ? `Accepted ${formatDay(target.asset.acceptedAt)}`
                : formatAssignmentState(target.asset.assignmentState),
            },
          ]}
        />
      ) : (
        <Details
          title="Software access"
          rows={[
            {
              label: 'Allocated on',
              value: formatDay(target.asset.allocatedDate),
            },
            { label: 'Licence type', value: target.asset.licenseType },
            {
              label: 'Expiry date',
              value: target.asset.expiryDate
                ? formatDay(target.asset.expiryDate)
                : target.asset.licenseType === 'Perpetual'
                  ? 'No expiry'
                  : 'Not recorded',
            },
          ]}
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(46rem,90dvh)] flex-col gap-0 overflow-hidden border border-border bg-background p-0 shadow-xl shadow-black/10 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14 text-left">
          <DialogTitle className="text-lg font-semibold">
            Asset details
          </DialogTitle>
          <DialogDescription>
            {target.kind === 'equipment'
              ? 'Your equipment and assignment information.'
              : 'Your software licence and access information.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea type="auto" className="min-h-0 flex-1">
          <div className="px-6 py-5">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 p-2 text-muted-foreground">
                {asset.imageUrl ? (
                  <Image
                    src={asset.imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="size-full object-contain"
                  />
                ) : (
                  (target.icon ?? <AppWindow className="size-8" />)
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <h2 className="break-words text-lg font-semibold leading-snug">
                  {name}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    value={
                      pending
                        ? 'pending approval'
                        : overdue
                          ? 'overdue'
                          : asset.status
                    }
                    showIcon={false}
                  />
                  <span className="text-xs text-muted-foreground">
                    {asset.categoryName || asset.pillar}
                  </span>
                </div>
              </div>
            </div>
            {hasSpecifications ? (
              <Tabs
                defaultValue="overview"
                key={`${target.kind}:${asset.assetId}`}
              >
                <TabsList
                  variant="line"
                  className="mb-4 border-b border-border"
                >
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="specifications">
                    Specifications
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">{overview}</TabsContent>
                <TabsContent value="specifications" className="space-y-6 pt-1">
                  {attributes.length > 0 ? (
                    <Details title="Unit details" rows={attributes} />
                  ) : null}
                  {technical.length > 0 ? (
                    <Details
                      title="Technical specifications"
                      rows={technical}
                    />
                  ) : null}
                </TabsContent>
              </Tabs>
            ) : (
              overview
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0 gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            asChild
            className="text-muted-foreground"
          >
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}>
              <Mail className="size-4" />
              Contact IT support
            </a>
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {target.kind === 'equipment' && pending ? (
              <>
                {onRequestReject ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onRequestReject(target.asset);
                    }}
                  >
                    Report issue
                  </Button>
                ) : null}
                {onRequestAccept ? (
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onRequestAccept(target.asset);
                    }}
                  >
                    Review &amp; accept
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
