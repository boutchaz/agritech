import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center',
  {
    variants: {
      variant: {
        card: 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12',
        table: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center',
        'full-page': 'min-h-[400px] w-full p-8',
        inline: 'p-6 text-center',
      },
    },
    defaultVariants: {
      variant: 'card',
    },
  }
)

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Icon to display (Lucide icon component) */
  icon?: LucideIcon
  /** Additional classes for the icon container */
  iconClassName?: string
  /** Optional title (h3) */
  title?: string
  /** Description text (required) */
  description: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'destructive'
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Whether to show a circular container around the icon */
  showCircularContainer?: boolean
}

/**
 * A reusable empty state component for displaying consistent empty data states.
 *
 * @example
 * // Card variant with action
 * <EmptyState
 *   variant="card"
 *   icon={Building2}
 *   title="No farms found"
 *   description="Get started by creating your first farm."
 *   action={{ label: "Create Farm", onClick: () => setShowAddForm(true) }}
 * />
 *
 * @example
 * // Inline variant for tables
 * <EmptyState
 *   variant="inline"
 *   icon={Inbox}
 *   description="No items match your filters."
 * />
 */
export function EmptyState({
  icon: Icon,
  iconClassName,
  title,
  description,
  action,
  secondaryAction,
  showCircularContainer = true,
  variant = 'card',
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(emptyStateVariants({ variant }), className)}
      {...props}
    >
      {Icon && (
        showCircularContainer ? (
          <div className={cn(
            'inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4',
            iconClassName
          )}>
            <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        ) : (
          <Icon className={cn('w-12 h-12 text-gray-400 dark:text-gray-500 mb-4', iconClassName)} />
        )
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
          {title}
        </h3>
      )}
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className={cn(
                action.variant === 'default' && 'bg-green-600 hover:bg-green-700 text-white'
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="text-gray-700 dark:text-gray-300"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
