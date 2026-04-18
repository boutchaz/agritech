import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';

function showToast() {
}

export interface MutationWithToastOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string | ((error: TError) => string);
}

export function useMutationWithToast<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: MutationWithToastOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { successMessage, errorMessage, onSuccess, onError, ...rest } = options;

  return useMutation({
    ...rest,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (successMessage) {
        const message =
          typeof successMessage === 'function' ? successMessage(data) : successMessage;
        showToast();
      }

      onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      const defaultMessage =
        error instanceof Error ? error.message : 'Something went wrong';
      const message = errorMessage
        ? typeof errorMessage === 'function'
          ? errorMessage(error)
          : errorMessage
        : defaultMessage;

      showToast();
      onError?.(error, variables, onMutateResult, context);
    },
  });
}
