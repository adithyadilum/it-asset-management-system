'use client';

import React from 'react';

export function AssetLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse">
      {/* Image Skeleton */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        <div className="w-full max-w-[153px] h-[121px] bg-slate-200 rounded-lg" />
        <div className="h-[22px] w-20 bg-slate-200 rounded-lg" />
      </div>

      {/* Details Grid Skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <React.Fragment key={index}>
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-32" />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="h-[34px] w-32 bg-slate-200 rounded-lg" />

      {/* Note Section Skeleton */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
        <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}