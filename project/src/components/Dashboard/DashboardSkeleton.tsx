import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page-level skeleton for the dashboard.
 * Mirrors the exact layout of the regular dashboard (header + 3-row widget grid)
 * so there's zero layout shift when real content loads.
 *
 * Rendered when `currentOrganization` is null (auth still loading).
 * Once org loads, individual widget skeletons take over (Layer 2).
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <>
      {/* ===== HEADER SKELETON ===== */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {/* Mobile header */}
        <div className="lg:hidden">
          <div className="flex gap-2 py-2 px-3 items-center">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex items-center gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs row */}
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>

            {/* Title row */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
                  <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-16 rounded-md" />
                  <Skeleton className="h-9 w-32 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT SKELETON ===== */}
      <div className="p-3 sm:p-4 lg:p-6 pb-6 space-y-6">
        {/* Unified view heading */}
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="space-y-6">
          {/* Farm selector skeleton */}
          <Skeleton className="h-14 w-full rounded-lg" />

          {/* Row 1: 4 stat cards (Parcels, Stock, Harvest, Sales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <WidgetCardSkeleton key={`row1-${i}`} variant="stat" />
            ))}
          </div>

          {/* Row 2: 2 wide cards (Tasks, Accounting) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCardSkeleton variant="list" lines={3} />
            <WidgetCardSkeleton variant="list" lines={3} />
          </div>

          {/* Row 3: 2 wide cards (Analysis, Workers) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCardSkeleton variant="list" lines={3} />
            <WidgetCardSkeleton variant="list" lines={3} />
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Individual widget card skeleton.
 * "stat" variant matches Row 1 cards (header + 2-col stats + small list).
 * "list" variant matches Row 2/3 cards (header + taller list items).
 */
function WidgetCardSkeleton({ variant, lines = 3 }: { variant: 'stat' | 'list'; lines?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
      {/* Header: icon + title + link */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      {variant === 'stat' ? (
        <>
          {/* 2-column stat boxes */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          {/* Small list items */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 mb-1" />
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Calendar / tab bar placeholder */}
          <Skeleton className="h-12 w-full rounded-lg mb-4" />
          {/* List items */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 mb-1" />
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardSkeleton;
