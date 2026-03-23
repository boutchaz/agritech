import React from 'react'

import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm',
          'placeholder:text-gray-400',
          'transition-[color,box-shadow,border-color] duration-150 ease-out',
          'hover:border-gray-400',
          'focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-100',
          'file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:text-sm file:font-medium file:text-primary-700 file:transition-colors hover:file:bg-primary-100',
          'dark:border-gray-600 dark:bg-gray-800/70 dark:text-gray-100 dark:placeholder:text-gray-500',
          'dark:hover:border-gray-500',
          'dark:focus-visible:ring-offset-gray-950',
          'dark:disabled:bg-gray-700/60 dark:disabled:text-gray-400',
          'dark:file:bg-primary-950/40 dark:file:text-primary-300 dark:hover:file:bg-primary-950/60',
          invalid &&
            'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30 dark:border-red-500/70',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

export default Input

