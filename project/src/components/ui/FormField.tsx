import React from 'react'

type FormFieldProps = {
  label?: React.ReactNode
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
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
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
      ) : null}
    </div>
  )
}

export default FormField
