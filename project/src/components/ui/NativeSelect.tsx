import React from 'react'

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

/**
 * Simple native HTML select component for basic dropdowns.
 * For advanced dropdowns with search, use the Radix UI Select from './select'
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className = '', invalid, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={[
          'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          invalid ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
    )
  },
)

NativeSelect.displayName = 'NativeSelect'

// Keep Select as an alias for backwards compatibility
export const Select = NativeSelect

export default NativeSelect
