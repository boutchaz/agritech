import { StyleSheet, Text, TextInput as RNTextInput } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface TimePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  testID?: string;
}

function getTimeValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getHelperMessage(value: string): { message: string; isError: boolean } {
  if (value.length === 0) {
    return { isError: false, message: 'Use 24-hour HH:MM format.' };
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return { isError: true, message: 'Enter a valid time in HH:MM format.' };
  }

  return { isError: false, message: 'Use 24-hour HH:MM format.' };
}

export function TimePicker<T extends FieldValues>({
  name,
  control,
  label,
  placeholder = 'HH:MM',
  required = false,
  testID,
}: TimePickerProps<T>) {
  return (
    <FormField<T> name={name} control={control} label={label} required={required}>
      {({ field, fieldState }) => {
        const value = getTimeValue(field.value);
        const helper = getHelperMessage(value);

        return (
          <>
            <RNTextInput
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder={placeholder}
              placeholderTextColor={colors.gray[400]}
              style={[styles.input, fieldState.error && styles.inputError]}
              testID={testID}
              value={value}
            />
            {!fieldState.error ? (
              <Text style={helper.isError ? styles.localErrorText : styles.helperText}>{helper.message}</Text>
            ) : null}
          </>
        );
      }}
    </FormField>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    color: colors.gray[900],
    fontSize: fontSize.base,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  inputError: {
    borderColor: colors.red[600],
  },
  helperText: {
    color: colors.gray[500],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
  localErrorText: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
});
