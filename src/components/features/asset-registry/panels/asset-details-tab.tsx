'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { QrCode, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AssetTagDialog } from '@/components/features/asset-registry/tags/asset-tag-dialog';

export interface AssetDetailsTabProps {
    imageUrl?: string;
    note?: string;
    assetTag: string;
    modelName?: string;
    fields: { label: string; value: React.ReactNode }[];
    mode?: 'default' | 'software';
    softwareSections?: {
        title: string;
        rows: { label: string; value: React.ReactNode }[];
    }[];
    totalSeats?: number;
    allocatedCount?: number;
    maintenanceRecords?: MaintenanceEvent[];
    hideMaintenance?: boolean;
    onQRCodeClick?: () => void;
    onViewAllMaintenance?: () => void;
    className?: string;
}

export function AssetDetailsTab({
    imageUrl,
    note,
    assetTag,
    modelName,
    fields,
    mode = 'default',
    softwareSections = [],
    totalSeats = 0,
    allocatedCount = 0,
    maintenanceRecords = [],
    hideMaintenance = false,
    onQRCodeClick,
    onViewAllMaintenance,
    className = '',
}: AssetDetailsTabProps) {
    const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;
    const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

    const handleTagButtonClick = () => {
        setIsTagDialogOpen(true);
        if (onQRCodeClick) {
            onQRCodeClick();
        }
    };

    if (mode === 'software') {
        return (
            <div className={cn('flex w-full flex-col gap-6 text-sm text-foreground', className)}>
                <div className="mt-2 flex w-full flex-col items-center gap-3">
                    {hasImage ? (
                        <Image
                            src={imageUrl}
                            alt="Software Product Image"
                            width={153}
                            height={121}
                            className="rounded object-cover shadow-sm"
                        />
                    ) : (
                        <div className="flex h-30.25 w-38.25 items-center justify-center rounded border border-dashed border-border bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                            No product image available
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTagButtonClick}
                        title={assetTag}
                        aria-label="Asset Tag"
                        className="h-7 rounded-full border-border bg-background px-3 text-xs font-medium text-foreground shadow-none hover:bg-muted"
                    >
                        <QrCode className="mr-1.5 h-3.5 w-3.5" />
                        Asset Tag
                    </Button>
                </div>

                {/* Seat Allocation Overview */}
                <section className="rounded-lg border border-border/60 bg-card p-5 shadow-xs">
                    <div className="space-y-4">
                        <div className="flex items-baseline justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-500" />
                                <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'text-foreground')}>
                                    Seat Allocation
                                </h3>
                            </div>
                            <span className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-600')}>
                                {allocatedCount} of {totalSeats} seats
                            </span>
                        </div>
                        <Progress
                            value={totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0}
                            className="h-2"
                            aria-label={`${allocatedCount} of ${totalSeats} seats allocated`}
                        />
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                            <span>{Math.max(0, totalSeats - allocatedCount)} seats available</span>
                            <span>{totalSeats > 0 ? Math.round((allocatedCount / totalSeats) * 100) : 0}% used</span>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {softwareSections.map((section) => (
                        <section key={section.title} className="rounded-lg border border-border/60 bg-card p-5 shadow-xs">
                            <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-sm text-foreground')}>
                                {section.title}
                            </h3>
                            <div className="space-y-0">
                                {section.rows.map((row, index) => {
                                    const isLastRow = index === section.rows.length - 1;
                                    return (
                                        <div
                                            key={`${section.title}-${index}`}
                                            className={cn(
                                                'flex items-center justify-between py-2.5 min-w-0 gap-4',
                                                !isLastRow && 'border-b border-border/40'
                                            )}
                                        >
                                            <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-slate-500')}>
                                                {row.label}
                                            </div>
                                            <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-right text-slate-900 min-w-0')}>
                                                {row.value || '-'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                {note ? (
                    <section className="space-y-2 rounded-lg border border-border/60 bg-card p-5 shadow-xs">
                        <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'text-foreground')}>
                            Access Notes
                        </div>
                        <Textarea
                            readOnly
                            value={note}
                            className="min-h-24 w-full resize-none bg-muted/20 text-slate-900 focus-visible:ring-0"
                        />
                    </section>
                ) : null}
            </div>
        );
    }

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
                <div className="col-span-full mb-1 flex items-center justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTagButtonClick}
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
                                            <dd className="font-light text-foreground">{record.reportedIssue}</dd>
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

            <AssetTagDialog
                isOpen={isTagDialogOpen}
                onOpenChange={setIsTagDialogOpen}
                assetId={assetTag}
                modelName={modelName}
            />
        </div>
    );
}
