import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
}

/**
 * Full-page centered loader for route-level loading states.
 * Replaces: <div className="flex items-center justify-center min-h-screen"><spinner/></div>
 */
function PageLoader({ className }: LoaderProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[60vh]', className)}>
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-600 border-t-transparent" />
    </div>
  )
}

/**
 * Section-level loader for widgets, cards, and content areas.
 * Replaces: <div className="flex justify-center p-8"><spinner/></div>
 */
function SectionLoader({ className }: LoaderProps) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
    </div>
  )
}

/**
 * Inline loader for buttons and small inline contexts.
 * Replaces: <div className="animate-spin h-5 w-5 border-b-2 border-white"></div>
 */
function ButtonLoader({ className }: LoaderProps) {
  return (
    <div className={cn('animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent', className)} />
  )
}

export { PageLoader, SectionLoader, ButtonLoader }
