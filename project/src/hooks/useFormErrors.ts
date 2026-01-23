import { ApiError, FieldError } from '@/lib/api-client-axios';
import { toast } from 'sonner';
import { UseFormSetError } from 'react-hook-form';

/**
 * Generic hook to handle form submission errors
 * Parses NestJS validation errors and sets them on form fields
 *
 * @example
 * const { handleFormError } = useFormErrors();
 *
 * try {
 *   await submitForm(data);
 * } catch (error) {
 *   handleFormError(error, setError);
 * }
 */
export function useFormErrors<FieldValues extends Record<string, any> = any>() {
  /**
   * Handle form submission error
   * Parses ApiError and sets field-level errors using react-hook-form's setError
   *
   * @param error - The error caught from form submission
   * @param setError - react-hook-form's setError function
   * @param options - Optional configuration
   */
  const handleFormError = (
    error: unknown,
    setError: UseFormSetError<FieldValues>,
    options?: {
      toastOnError?: boolean;
      toastMessage?: string;
      logError?: boolean;
    }
  ): boolean => {
    const {
      toastOnError = true,
      toastMessage,
      logError = true,
    } = options || {};

    if (logError) {
      console.error('Form error:', error);
    }

    // Handle ApiError with field errors
    if (error instanceof ApiError) {
      if (error.hasFieldErrors()) {
        // Set each field error
        error.fieldErrors.forEach((fieldError) => {
          setError(fieldError.field as any, {
            type: 'manual',
            message: fieldError.message,
          });
        });

        if (toastOnError) {
          toast.error(toastMessage || 'Please correct the errors in the form');
        }
        return true;
      }

      // No field errors, show generic error toast
      if (toastOnError) {
        toast.error(toastMessage || error.message);
      }
      return true;
    }

    // Handle standard Error
    if (error instanceof Error) {
      if (toastOnError) {
        toast.error(toastMessage || error.message);
      }
      return true;
    }

    // Unknown error type
    if (toastOnError) {
      toast.error(toastMessage || 'An unexpected error occurred');
    }

    return true;
  };

  /**
   * Set field errors from an array of field errors
   * Useful when you have manual validation errors
   */
  const setFieldErrors = (
    errors: FieldError[],
    setError: UseFormSetError<FieldValues>
  ): void => {
    errors.forEach((fieldError) => {
      setError(fieldError.field as any, {
        type: 'manual',
        message: fieldError.message,
      });
    });
  };

  /**
   * Clear all form errors
   */
  const clearAllErrors = (clearErrors: UseFormSetError<FieldValues>): void => {
    clearErrors();
  };

  return {
    handleFormError,
    setFieldErrors,
    clearAllErrors,
  };
}

/**
 * Utility function to parse field errors from an error object
 * Can be used outside of React components
 */
export function parseFieldErrors(error: unknown): FieldError[] {
  if (error instanceof ApiError) {
    return error.fieldErrors;
  }

  // Try to parse from plain object
  if (error && typeof error === 'object') {
    const err = error as any;

    // Handle NestJS ValidationPipe array format
    if (Array.isArray(err.message)) {
      const fieldErrors: FieldError[] = [];
      err.message.forEach((errorMsg: string) => {
        const match = errorMsg.match(/^(\w+)\s+(.+)$/);
        if (match) {
          fieldErrors.push({
            field: match[1],
            message: match[2],
          });
        }
      });
      return fieldErrors;
    }

    // Handle custom details format
    if (err.details && typeof err.details === 'object') {
      return Object.entries(err.details).map(([field, message]: [string, any]) => ({
        field,
        message: typeof message === 'string' ? message : message?.message || String(message),
      }));
    }
  }

  return [];
}

/**
 * Check if an error has field-level validation errors
 */
export function hasFieldErrors(error: unknown): boolean {
  return parseFieldErrors(error).length > 0;
}
