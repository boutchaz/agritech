import { cn } from '@/lib/utils'
import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'

interface LoaderProps {
  className?: string
}

/**
 * Full-page skeleton loader for route-level loading states.
 * Shows a realistic page skeleton instead of a spinner.
 */
function PageLoader({ className }: LoaderProps) {
  return (
    <div className={cn('space-y-6 p-6 animate-in fade-in duration-300', className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

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
  )
}

/**
 * Section-level skeleton for widgets, cards, and content areas.
 * Shows a compact content skeleton instead of a spinner.
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
