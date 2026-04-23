'use client';

import React from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';

import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { StatusBadge } from '@/components/shared/status-badge';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface AssetDetailsTabProps {
    imageUrl?: string;
    note?: string;
    status: string;
    assetTag: string;
    fields: { label: string; value: React.ReactNode }[];
    maintenanceRecords?: MaintenanceEvent[];
    hideMaintenance?: boolean;
    onQRCodeClick?: () => void;
    onViewAllMaintenance?: () => void;
    className?: string;
}

export function AssetDetailsTab({
    imageUrl,
    note,
    status,
    assetTag,
    fields,
    maintenanceRecords = [],
    hideMaintenance = false,
    onQRCodeClick,
    onViewAllMaintenance,
    className = '',
}: AssetDetailsTabProps) {
    const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

    return (
        <div className={cn('flex w-full flex-col items-start gap-4 text-sm text-foreground', className)}>
            <div className="mt-2 flex w-full flex-col items-center gap-2.5">
                {hasImage ? (
                    <Image
                        src={imageUrl}
                        alt="Asset Image"
                        width={153}
                        height={121}
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-30.25 w-38.25 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                        No image available
                    </div>
                )}
            </div>

            <div className="mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
                <div className="col-span-full mb-1 flex items-center gap-2">
                    <StatusBadge value={status} showIcon />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onQRCodeClick}
                        title={assetTag}
                        aria-label="Asset Tag"
                        className="h-7 rounded-full border-border bg-background px-3 text-xs font-medium text-foreground shadow-none hover:bg-muted"
                    >
                        <QrCode className="mr-1.5 h-3.5 w-3.5" />
                        Asset Tag
                    </Button>
                </div>

                {fields.map((item, index) => {
                    const isLongValue = typeof item.value === 'string' && item.value.length > 40;

                    return (
                        <div
                            key={index}
                            className={cn(
                                'flex items-center justify-between border-b border-border/40 py-2.5',
                                isLongValue && 'col-span-full'
                            )}
                        >
                            <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-slate-500')}>
                                {item.label}
                            </div>
                            <div
                                className={cn(
                                    TYPOGRAPHY_CLASSNAMES.textSmMedium,
                                    'text-right text-slate-900',
                                    item.label === 'Asset ID' && 'font-mono tracking-wide'
                                )}
                            >
                                {item.value || '-'}
                            </div>
                        </div>
                    );
                })}

                {note ? (
                    <div className="col-span-full mt-4 space-y-2">
                        <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-500')}>
                            Note
                        </div>
                        <Textarea
                            readOnly
                            value={note}
                            className="min-h-25 w-full resize-none bg-muted/30 text-slate-900 focus-visible:ring-0"
                        />
                    </div>
                ) : null}
            </div>

            <div className="my-2 h-px w-full bg-border" />

            {!hideMaintenance ? (
                <div className="flex w-full flex-col gap-3">
                    <h3 className="text-base font-medium leading-6 text-foreground">Audit & Repair Records</h3>

                    <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
                        {maintenanceRecords.length > 0 ? (
                            <>
                                <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-2.5 text-sm leading-5">
                                    {maintenanceRecords.slice(0, 3).map((record) => (
                                        <React.Fragment key={record.id}>
                                            <dt className="font-medium text-foreground">
                                                {new Date(record.createdAt).toLocaleDateString('en-GB')}
                                            </dt>
                                            <dd className="font-light text-foreground">{record.description}</dd>
                                        </React.Fragment>
                                    ))}
                                </dl>

                                {maintenanceRecords.length > 3 ? (
                                    <div className="flex flex-col gap-2.5 text-sm">
                                        <div className="font-medium text-foreground">Note</div>
                                        <div className="flex flex-col gap-2.5">
                                            <button
                                                onClick={onViewAllMaintenance}
                                                className="w-fit text-left font-light text-primary underline transition-colors hover:text-primary/80"
                                            >
                                                View all maintenance records
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <p className="text-sm font-light text-muted-foreground">No maintenance records found.</p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
