import { ApiError, FieldError } from '@/lib/api-client-axios';
import { toast } from 'sonner';
import { type FieldValues as ReactHookFormFieldValues, type Path, type UseFormClearErrors, type UseFormSetError } from 'react-hook-form';

/**
 * Generic hook to handle form submission errors
 * Parses NestJS validation errors and sets them on form fields
 *
 * ## Supported Error Formats
 *
 * 1. NestJS ValidationPipe array format (default):
 *    { message: ["email should not be empty", "first_name must be longer..."] }
 *
 * 2. Custom details format:
 *    { details: { email: "Email is required", ... } }
 *
 * 3. Detailed errors format (from custom exception factory):
 *    { errors: [{ field: "email", errors: ["Email is required"] }] }
 *
 * ## Field Name Matching
 *
 * Field names from API must match form field names exactly. Use `fieldMappings` for
 * cases where they differ (e.g., API uses snake_case, form uses camelCase):
 *
 * @example
 * const { handleFormError } = useFormErrors();
 *
 * try {
 *   await submitForm(data);
 * } catch (error) {
 *   handleFormError(error, setError);
 * }
 *
 * @example With custom field mappings for API/Form name differences
 * const { handleFormError } = useFormErrors({
 *   fieldMappings: {
 *     'first_name': 'firstName',  // API: first_name -> Form: firstName
 *     'user_id': 'userId',
 *   }
 * });
 */
export function useFormErrors<FieldValues extends ReactHookFormFieldValues = ReactHookFormFieldValues>(
  options?: {
    fieldMappings?: Record<string, string>;
    defaultFieldError?: string;
  }
) {
  const { fieldMappings = {}, defaultFieldError } = options || {};

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
        // Set each field error with optional field name mapping
        error.fieldErrors.forEach((fieldError) => {
          // Apply field name mapping if configured
          const formField = fieldMappings[fieldError.field] || fieldError.field;

          setError(formField as Path<FieldValues>, {
            type: 'manual',
            message: fieldError.message,
          });
        });

        if (toastOnError) {
          toast.error(toastMessage || defaultFieldError || 'Please correct the errors in the form');
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
      setError(fieldError.field as Path<FieldValues>, {
        type: 'manual',
        message: fieldError.message,
      });
    });
  };

  /**
   * Clear all form errors
   */
  const clearAllErrors = (clearErrors: UseFormClearErrors<FieldValues>): void => {
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
    const err = error as Record<string, unknown>;
    const message = err.message;
    const details = err.details;

    // Handle NestJS ValidationPipe array format
    if (Array.isArray(message)) {
      const fieldErrors: FieldError[] = [];
      message.forEach((errorMsg) => {
        if (typeof errorMsg !== 'string') {
          return;
        }

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
    if (details && typeof details === 'object') {
      return Object.entries(details).map(([field, message]: [string, unknown]) => ({
        field,
        message:
          typeof message === 'string'
            ? message
            : typeof message === 'object' && message !== null && 'message' in message
              ? String(message.message)
              : String(message),
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
