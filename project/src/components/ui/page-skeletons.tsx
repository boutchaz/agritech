import { Skeleton, TableRowSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Full-page skeleton for report/accounting pages.
 * Shows: header area + filter bar + table rows
 */
export function ReportPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Table header */}
        <div className="flex items-center gap-4 p-4 border-b-2 border-gray-200 dark:border-gray-600">
          {Array.from({ length: 5 }).map((_, headerIdx) => (
            <Skeleton key={"sk-" + headerIdx} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, rowIdx) => (
          <TableRowSkeleton key={"sk-" + rowIdx} columns={5} />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for accounting report pages (trial balance, balance sheet, etc.)
 * Shows: card filter + data table
 */
export function AccountingReportSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Filter card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, cardIdx) => (
          <div key={"sk-" + cardIdx} className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center gap-4 p-4 border-b-2 border-gray-200 dark:border-gray-600">
          {Array.from({ length: 4 }).map((_, headerIdx) => (
            <Skeleton key={"sk-" + headerIdx} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, rowIdx) => (
          <TableRowSkeleton key={"sk-" + rowIdx} columns={4} />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for list/CRUD pages (payments, invoices, workers, etc.)
 * Shows: search bar + table with actions
 */
export function ListPageSkeleton({ columns = 5, rows = 8, className }: { columns?: number; rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and filters */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-72 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* Tab bar (optional) */}
      <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, tabIdx) => (
            <Skeleton key={"sk-" + tabIdx} className="h-8 w-20 rounded-md" />
          ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 p-4 border-b-2 border-gray-200 dark:border-gray-600">
          {Array.from({ length: columns }).map((_, headerIdx) => (
            <Skeleton key={"sk-" + headerIdx} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRowSkeleton key={"sk-" + rowIdx} columns={columns} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, pageIdx) => (
            <Skeleton key={"sk-" + pageIdx} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for card grid pages (parcels overview, stock items, etc.)
 */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-72 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, cardIdx) => (
          <div key={"sk-" + cardIdx} className="bg-white dark:bg-gray-800 rounded-lg border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for detail pages (parcel detail, worker detail, task detail)
 */
export function DetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, statIdx) => (
          <StatCardSkeleton key={"sk-" + statIdx} />
        ))}
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, lineIdx) => (
            <div key={"sk-" + lineIdx} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for settings pages
 */
export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 max-w-4xl', className)}>
      {/* Section */}
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <div key={"sk-" + sectionIdx} className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for kanban/board views
 */
export function KanbanSkeleton({ columns = 4, cardsPerColumn = 3, className }: { columns?: number; cardsPerColumn?: number; className?: string }) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: cardsPerColumn }).map((_, card) => (
            <div key={card} className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Inline content skeleton (replaces section loaders within a page)
 */
export function ContentSkeleton({ className, lines = 5 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('space-y-3 py-4', className)}>
      {Array.from({ length: lines }).map((_, lineIdx) => (
        <Skeleton key={"sk-" + lineIdx} className={cn('h-4', lineIdx % 3 === 0 ? 'w-full' : lineIdx % 3 === 1 ? 'w-3/4' : 'w-1/2')} />
      ))}
    </div>
  )
}

/**
 * Chat/AI page skeleton
 */
export function ChatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex-1 space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, messageIdx) => (
          <div key={"sk-" + messageIdx} className={cn('flex gap-3', messageIdx % 2 === 0 ? '' : 'justify-end')}>
            {messageIdx % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
            <div className={cn('space-y-2', messageIdx % 2 === 0 ? 'max-w-[70%]' : 'max-w-[60%]')}>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
