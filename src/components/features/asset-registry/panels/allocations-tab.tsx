'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export interface AllocationUser {
  id: string;
  name: string;
  email: string;
  assignedDate?: string;
}

export interface AllocationsTabProps {
  totalSeats?: number;
  allocatedCount?: number;
  allocations?: AllocationUser[];
  onRevoke?: (userId: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AllocationsTab({
  totalSeats = 0,
  allocatedCount = 0,
  allocations = [],
  onRevoke,
  isReadOnly = true,
  className = '',
}: AllocationsTabProps) {
  const allocatedPercentage =
    totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0;
  const availableSeats = Math.max(0, totalSeats - allocatedCount);

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 text-sm text-foreground',
        className
      )}
    >
      {/* Seat Allocation Summary */}
      <section className="rounded-lg border border-border/60 bg-card p-5 shadow-xs">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textSmSemiBold,
                  'text-foreground'
                )}
              >
                Seat Allocation
              </h3>
              <span
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textSmMedium,
                  'text-muted-foreground'
                )}
              >
                {allocatedCount} of {totalSeats} seats
              </span>
            </div>
            <Progress
              value={allocatedPercentage}
              className="h-2"
              aria-label={`${allocatedCount} of ${totalSeats} seats allocated`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted/40 p-3">
              <div
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textXsRegular,
                  'text-muted-foreground mb-1'
                )}
              >
                Allocated
              </div>
              <div
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                  'text-foreground'
                )}
              >
                {allocatedCount}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <div
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textXsRegular,
                  'text-muted-foreground mb-1'
                )}
              >
                Available
              </div>
              <div
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                  'text-foreground'
                )}
              >
                {availableSeats}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Allocated Users List */}
      <section className="space-y-3">
        <h3
          className={cn(
            TYPOGRAPHY_CLASSNAMES.textSmSemiBold,
            'text-foreground'
          )}
        >
          Allocated Users
        </h3>

        {allocations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {allocations.map((user) => (
              <div
                key={user.id}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        TYPOGRAPHY_CLASSNAMES.textSmMedium,
                        'text-foreground truncate'
                      )}
                    >
                      {user.name}
                    </div>
                    <div
                      className={cn(
                        TYPOGRAPHY_CLASSNAMES.textXsRegular,
                        'text-muted-foreground truncate'
                      )}
                    >
                      {user.email}
                    </div>
                  </div>
                </div>

                {!isReadOnly && onRevoke && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevoke(user.id)}
                    className="h-7 w-7 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    title="Revoke allocation"
                    aria-label={`Revoke allocation for ${user.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <p
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textSmRegular,
                'text-muted-foreground'
              )}
            >
              No users allocated to this software license yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
