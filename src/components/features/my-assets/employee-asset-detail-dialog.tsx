'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  AppWindow,
  Calendar,
  Check,
  Copy,
  Cpu,
  KeyRound,
  Layers,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
} from 'lucide-react';

import type {
  EmployeeAssignedAsset,
  EmployeeSoftwareAsset,
} from '@/actions/employee';
import { StatusBadge } from '@/components/shared/status-badge';
import { tiqriToast } from '@/components/shared/sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAssetName } from '@/lib/asset-name';
import { formatAssignmentState } from '@/lib/assignments/labels';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type EmployeeAssetDialogTarget =
  | { kind: 'equipment'; asset: EmployeeAssignedAsset; icon?: React.ReactNode }
  | { kind: 'software'; asset: EmployeeSoftwareAsset; icon?: React.ReactNode };

interface EmployeeAssetDetailDialogProps {
  target: EmployeeAssetDialogTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestAccept?: (asset: EmployeeAssignedAsset) => void;
  onRequestReject?: (asset: EmployeeAssignedAsset) => void;
}

function formatFullDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatKeyLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bOs\b/g, 'OS')
    .replace(/\bRam\b/g, 'RAM')
    .replace(/\bCpu\b/g, 'CPU')
    .replace(/\bGpu\b/g, 'GPU')
    .replace(/\bSsd\b/g, 'SSD')
    .replace(/\bUsb\b/g, 'USB')
    .replace(/\bHdmi\b/g, 'HDMI')
    .replace(/\bId\b/g, 'ID');
}

function formatAttributeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatAttributeValue(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? items.join(', ') : null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function extractEntries(
  record: Record<string, unknown> | null | undefined
): Array<{ label: string; value: string }> {
  if (!record || typeof record !== 'object') return [];
  const entries: Array<{ label: string; value: string }> = [];
  for (const [key, rawValue] of Object.entries(record)) {
    const formattedValue = formatAttributeValue(rawValue);
    if (formattedValue) {
      entries.push({
        label: formatKeyLabel(key),
        value: formattedValue,
      });
    }
  }
  return entries;
}

function CopyableChip({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      tiqriToast.success(`${label} copied to clipboard.`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      tiqriToast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            'truncate text-sm font-semibold text-foreground',
            mono && 'font-mono'
          )}
          title={value}
        >
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
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

  const isEquipment = target.kind === 'equipment';
  const asset = target.asset;
  const fullName = formatAssetName(asset.brandName, asset.modelName);

  const showAssignmentBadge =
    isEquipment &&
    Boolean(target.asset.assignmentState) &&
    formatAssignmentState(target.asset.assignmentState).toLowerCase() !==
      target.asset.status.toLowerCase();

  const instanceEntries = extractEntries(asset.instanceAttributes);
  const technicalEntries = extractEntries(asset.technicalDetails);

  const supportSubject = encodeURIComponent(
    `Support Request: ${fullName} (${asset.assetTag})`
  );
  const supportBody = encodeURIComponent(
    `Hi IT Support,\n\nI need assistance regarding the following assigned asset:\n- Asset Name: ${fullName}\n- Asset Tag: ${asset.assetTag}\n- Category: ${asset.categoryName}\n\nDetails:\n`
  );
  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${supportSubject}&body=${supportBody}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3.5">
              {asset.imageUrl ? (
                <Image
                  src={asset.imageUrl}
                  alt={fullName}
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-lg border border-border bg-muted object-cover"
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                  {target.icon ?? <AppWindow className="size-7" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {isEquipment
                    ? asset.categoryName || asset.pillar
                    : `${target.asset.licenseType} Software Seat`}
                </p>
                <DialogTitle className="mt-0.5 text-xl font-semibold text-foreground">
                  {fullName}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detailed information and specifications for {fullName} (
                  {asset.assetTag}).
                </DialogDescription>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {showAssignmentBadge ? (
                <StatusBadge
                  value={target.asset.assignmentState}
                  showIcon={false}
                  className="text-xs"
                />
              ) : null}
              <StatusBadge
                value={asset.status}
                showIcon={true}
                className="text-xs"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Overdue or Pending Acknowledgement Banner */}
          {isEquipment && target.asset.isOverdue ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Return Overdue</p>
                <p className="text-xs opacity-90">
                  This asset was due back on{' '}
                  {formatFullDate(target.asset.expectedReturnDate)}. Please
                  coordinate with IT Operations to return or extend your
                  assignment.
                </p>
              </div>
            </div>
          ) : null}

          {isEquipment &&
          target.asset.assignmentState === 'pending approval' ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Awaiting Your Acknowledgement</p>
                <p className="text-xs opacity-90">
                  Please inspect this equipment and confirm receipt or report an
                  issue using the actions below.
                </p>
              </div>
            </div>
          ) : null}

          {/* Primary Identifiers */}
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyableChip label="Asset Tag" value={asset.assetTag} />
            {isEquipment ? (
              target.asset.serialNumber ? (
                <CopyableChip
                  label="Serial Number"
                  value={target.asset.serialNumber}
                />
              ) : (
                <div className="flex flex-col justify-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Serial Number
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Not applicable
                  </p>
                </div>
              )
            ) : target.asset.licenseKey ? (
              <CopyableChip
                label="License Key"
                value={target.asset.licenseKey}
              />
            ) : (
              <div className="flex flex-col justify-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Activation Method
                </p>
                <p className="text-sm font-medium text-foreground">
                  SSO / Cloud Account
                </p>
              </div>
            )}
          </div>

          {/* Assignment & Custody Details */}
          <div className="rounded-lg border border-border bg-card p-3.5">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              {isEquipment
                ? 'Custody & Assignment Details'
                : 'License & Access Details'}
            </h4>

            {isEquipment ? (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Assigned Date
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatFullDate(target.asset.assignedDate)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Expected Return Date
                    </dt>
                    <dd
                      className={cn(
                        'font-medium',
                        target.asset.isOverdue
                          ? 'text-destructive'
                          : 'text-foreground'
                      )}
                    >
                      {target.asset.expectedReturnDate
                        ? formatFullDate(target.asset.expectedReturnDate)
                        : 'Open-ended (Standard Custody)'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <UserCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Assigned By
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.assignedByName ?? 'IT Operations'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Recorded Condition
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.condition ?? 'Good'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Primary Location
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.locationName ?? 'Assigned to Employee'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Acknowledgement
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.acceptedAt
                        ? `Accepted ${formatFullDate(target.asset.acceptedAt)}`
                        : target.asset.assignmentState === 'pending approval'
                          ? 'Pending your confirmation'
                          : formatAssignmentState(target.asset.assignmentState)}
                    </dd>
                  </div>
                </div>
              </dl>
            ) : (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Allocated Date
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatFullDate(target.asset.allocatedDate)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      License Model
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.licenseType}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      License Valid Until
                    </dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.expiryDate
                        ? formatFullDate(target.asset.expiryDate)
                        : 'Perpetual / No Expiration'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Category</dt>
                    <dd className="font-medium text-foreground">
                      {target.asset.categoryName}
                    </dd>
                  </div>
                </div>
              </dl>
            )}

            {isEquipment && target.asset.notes ? (
              <div className="mt-3 border-t border-border pt-2.5">
                <p className="text-xs text-muted-foreground">Assignment Note</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {target.asset.notes}
                </p>
              </div>
            ) : null}
          </div>

          {/* Unit Attributes (e.g., Color, Configuration, Included Accessories) */}
          {instanceEntries.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-3.5">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5" />
                Unit Details & Configuration
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                {instanceEntries.map((entry) => (
                  <div key={entry.label} className="min-w-0">
                    <dt className="truncate text-xs text-muted-foreground">
                      {entry.label}
                    </dt>
                    <dd
                      className="truncate font-medium text-foreground"
                      title={entry.value}
                    >
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* Model Technical Specifications */}
          {technicalEntries.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-3.5">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="size-3.5" />
                Technical Specifications
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                {technicalEntries.map((entry) => (
                  <div key={entry.label} className="min-w-0">
                    <dt className="truncate text-xs text-muted-foreground">
                      {entry.label}
                    </dt>
                    <dd
                      className="truncate font-medium text-foreground"
                      title={entry.value}
                    >
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <a href={supportHref}>
              <Mail className="size-3.5" />
              Contact IT Support
            </a>
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isEquipment &&
            target.asset.assignmentState === 'pending approval' ? (
              <>
                {onRequestReject ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onOpenChange(false);
                      onRequestReject(target.asset);
                    }}
                  >
                    Report Issue
                  </Button>
                ) : null}
                {onRequestAccept ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onRequestAccept(target.asset);
                    }}
                  >
                    Review & Accept
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
