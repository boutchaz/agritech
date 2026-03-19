import type { ReactNode } from 'react';
import { FormProvider as RHFFormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';

export { zodResolver } from '@hookform/resolvers/zod';
export { useForm } from 'react-hook-form';
export type { FieldValues, UseFormReturn } from 'react-hook-form';
export type { ZodSchema } from 'zod';

export interface FormProviderProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  children: ReactNode;
}

export function FormProvider<T extends FieldValues>({ form, children }: FormProviderProps<T>) {
  return <RHFFormProvider {...form}>{children}</RHFFormProvider>;
}
