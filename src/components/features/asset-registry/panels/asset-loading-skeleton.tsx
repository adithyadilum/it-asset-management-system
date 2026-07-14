'use client';

import React from 'react';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function AssetLoadingSkeleton() {
  return (
    <div className="flex w-full flex-col items-start gap-4 text-sm text-foreground">
      <div className="mt-2 flex w-full flex-col items-center gap-2.5">
        <SkeletonBlock className="h-30.25 w-38.25 rounded-md" />

        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-border/40 py-2.5"
          >
            <SkeletonBlock className="h-4 w-24 shrink-0" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
        ))}

        <div className="col-span-full mt-4 space-y-2">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-24 w-full rounded-lg" />
        </div>
      </div>

      <div className="my-2 h-px w-full bg-border" />

      <div className="flex w-full flex-col gap-3">
        <SkeletonBlock className="h-6 w-40" />

        <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
          <div className="grid grid-cols-[minmax(140px,auto)_1fr] gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <React.Fragment key={index}>
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-full" />
              </React.Fragment>
            ))}
          </div>

          <SkeletonBlock className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
