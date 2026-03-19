import { StyleSheet, Text, TextInput as RNTextInput } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface DatePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  required?: boolean;
  testID?: string;
}

function getDateValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHelperMessage(value: string, minimumDate?: Date, maximumDate?: Date): { message: string; isError: boolean } {
  if (value.length === 0) {
    return { isError: false, message: 'Use YYYY-MM-DD format.' };
  }

  if (!isValidDateString(value)) {
    return { isError: true, message: 'Enter a valid date in YYYY-MM-DD format.' };
  }

  if (minimumDate && value < normalizeDate(minimumDate)) {
    return { isError: true, message: `Date must be on or after ${normalizeDate(minimumDate)}.` };
  }

  if (maximumDate && value > normalizeDate(maximumDate)) {
    return { isError: true, message: `Date must be on or before ${normalizeDate(maximumDate)}.` };
  }

  return { isError: false, message: 'Use YYYY-MM-DD format.' };
}

export function DatePicker<T extends FieldValues>({
  name,
  control,
  label,
  placeholder = 'YYYY-MM-DD',
  minimumDate,
  maximumDate,
  required = false,
  testID,
}: DatePickerProps<T>) {
  return (
    <FormField<T> name={name} control={control} label={label} required={required}>
      {({ field, fieldState }) => {
        const value = getDateValue(field.value);
        const helper = getHelperMessage(value, minimumDate, maximumDate);

        return (
          <>
            <RNTextInput
              autoCapitalize="none"
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
