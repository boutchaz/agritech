import { cn } from '@/lib/utils'
import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'

interface LoaderProps {
  className?: string
}

/**
 * Full-page skeleton loader for route-level loading states.
 * Mirrors the real page layout: header (breadcrumbs + title) → stat cards → content table.
 * Used when a page component guards on `!currentOrganization`.
 */
function PageLoader({ className }: LoaderProps) {
  return (
    <div className={cn('animate-in fade-in duration-300', className)}>
      {/* ===== HEADER SKELETON (mirrors ModernPageHeader) ===== */}
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
        <div className="hidden lg:block px-4 sm:px-6 lg:px-8">
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
                  <Skeleton className="h-7 w-48 mb-2" />
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

      {/* ===== CONTENT SKELETON ===== */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Content area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-600">
            <Skeleton className="h-10 w-64 rounded-md" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} columns={4} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Section-level skeleton for widgets, cards, and content areas within a page.
 */
function SectionLoader({ className }: LoaderProps) {
  return (
    <div className={cn('space-y-3 py-6 px-4 animate-in fade-in duration-300', className)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className={cn('h-4 mb-1', i % 2 === 0 ? 'w-3/4' : 'w-1/2')} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Inline loader for buttons and small inline contexts.
 * Keeps the spinner pattern since it's inside interactive elements.
 */
function ButtonLoader({ className }: LoaderProps) {
  return (
    <div className={cn('animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent', className)} />
  )
}

export { PageLoader, SectionLoader, ButtonLoader }
