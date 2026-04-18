import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FormFieldProps = {
  label?: ReactNode
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  helper,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium leading-snug tracking-tight text-gray-800 dark:text-gray-200"
        >
          {label}
          {required ? <span className="text-red-500 dark:text-red-400"> *</span> : null}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs leading-relaxed text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{helper}</p>
      ) : null}
    </div>
  )
}

export default FormField
