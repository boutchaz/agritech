
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page-level skeleton for the dashboard.
 * Mirrors the exact layout of the regular dashboard (header + 3-row widget grid)
 * so there's zero layout shift when real content loads.
 *
 * Rendered when `currentOrganization` is null (auth still loading).
 * Once org loads, individual widget skeletons take over (Layer 2).
 */
const DashboardSkeleton = () => {
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
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="space-y-8">
          {/* Farm selector skeleton */}
          <Skeleton className="h-20 w-full rounded-3xl" />

          {/* KPI Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((_, row1Idx) => (
              <WidgetCardSkeleton key={`row1-${row1Idx}`} variant="stat" />
            ))}
          </div>

          {/* Operational Tier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              <WidgetCardSkeleton variant="list" lines={4} rounded="rounded-[2.5rem]" />
              <WidgetCardSkeleton variant="list" lines={3} rounded="rounded-[2.5rem]" />
            </div>
            <div className="lg:col-span-5 space-y-8">
              <WidgetCardSkeleton variant="list" lines={3} rounded="rounded-[2.5rem]" />
              <WidgetCardSkeleton variant="list" lines={3} rounded="rounded-[2.5rem]" />
            </div>
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
function WidgetCardSkeleton({ 
  variant, 
  lines = 3, 
  rounded = "rounded-3xl" 
}: { 
  variant: 'stat' | 'list'; 
  lines?: number;
  rounded?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 p-6 ${rounded} h-full`}>
      {/* Header: icon + title + link */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>

      {variant === 'stat' ? (
        <>
          {/* 2-column stat boxes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          {/* Small list items */}
          <div className="space-y-2 mt-auto">
            <div className="flex items-center justify-between px-1 mb-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-px flex-1 mx-3 rounded" />
            </div>
            {Array.from({ length: 2 }).map((_, skIdx) => (
              <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Calendar / tab bar placeholder */}
          <Skeleton className="h-12 w-full rounded-2xl mb-6" />
          {/* List items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 mb-4">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-px flex-1 mx-3 rounded" />
            </div>
            {Array.from({ length: lines }).map((_, skIdx) => (
              <Skeleton key={"sk-" + skIdx} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardSkeleton;
