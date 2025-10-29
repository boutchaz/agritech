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
          'px-3 py-2 sm:text-sm rounded-md border border-input bg-background text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
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
