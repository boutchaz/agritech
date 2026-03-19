import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Controller,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from 'react-hook-form';

import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

type FormFieldChildProps<T extends FieldValues, TName extends Path<T>> = {
  field: ControllerRenderProps<T, TName>;
  fieldState: ControllerFieldState;
};

export interface FormFieldProps<T extends FieldValues, TName extends Path<T> = Path<T>> {
  name: TName;
  control: ControllerProps<T, TName>['control'];
  label?: string;
  required?: boolean;
  helperText?: string;
  children: (props: FormFieldChildProps<T, TName>) => ReactNode;
}

function getErrorMessage(message: unknown): string | null {
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function FormField<T extends FieldValues, TName extends Path<T> = Path<T>>({
  name,
  control,
  label,
  required = false,
  helperText,
  children,
}: FormFieldProps<T, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const errorMessage = getErrorMessage(fieldState.error?.message);

        return (
          <View style={styles.container}>
            {label ? (
              <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {required ? <Text style={styles.required}>*</Text> : null}
              </View>
            ) : null}

            {children({ field, fieldState })}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {!errorMessage && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  label: {
    color: colors.gray[800],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  required: {
    color: colors.red[600],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  helperText: {
    color: colors.gray[500],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
});
