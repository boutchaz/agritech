import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}

// ============ Specialized Skeleton Components ============

/** Card skeleton for stat/KPI cards */
function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** Skeleton for parcel cards */
function ParcelCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

/** Skeleton for task cards */
function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for dashboard widgets */
function WidgetSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for table rows */
function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

/** Skeleton for list items */
function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

/** Skeleton for chart placeholders */
function ChartSkeleton({ className, height = "h-48" }: { className?: string; height?: string }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className={cn("w-full rounded", height)} />
    </div>
  )
}

/** Grid of stat card skeletons */
function StatsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  StatCardSkeleton,
  ParcelCardSkeleton,
  TaskCardSkeleton,
  WidgetSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
  StatsGridSkeleton,
}
