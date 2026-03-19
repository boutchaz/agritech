import { Pressable, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface NumberInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  required?: boolean;
  testID?: string;
}

function getTextValue(value: unknown): string {
  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value : '';
}

function getNumericValue(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampValue(value: number, min?: number, max?: number): number {
  if (typeof min === 'number' && value < min) {
    return min;
  }

  if (typeof max === 'number' && value > max) {
    return max;
  }

  return value;
}

function getHelperMessage(value: string, min?: number, max?: number, unit?: string): { message: string | null; isError: boolean } {
  const numericValue = getNumericValue(value);

  if (value.length === 0) {
    if (typeof min === 'number' && typeof max === 'number') {
      return { isError: false, message: `Enter a value between ${min} and ${max}${unit ? ` ${unit}` : ''}.` };
    }

    if (typeof min === 'number') {
      return { isError: false, message: `Enter a value of at least ${min}${unit ? ` ${unit}` : ''}.` };
    }

    if (typeof max === 'number') {
      return { isError: false, message: `Enter a value up to ${max}${unit ? ` ${unit}` : ''}.` };
    }

    return unit ? { isError: false, message: `Value in ${unit}.` } : { isError: false, message: null };
  }

  if (numericValue === null) {
    return { isError: true, message: 'Enter a valid number.' };
  }

  if (typeof min === 'number' && numericValue < min) {
    return { isError: true, message: `Value must be at least ${min}${unit ? ` ${unit}` : ''}.` };
  }

  if (typeof max === 'number' && numericValue > max) {
    return { isError: true, message: `Value must be at most ${max}${unit ? ` ${unit}` : ''}.` };
  }

  return unit ? { isError: false, message: `Value in ${unit}.` } : { isError: false, message: null };
}

export function NumberInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  min,
  max,
  step = 1,
  unit,
  required = false,
  testID,
}: NumberInputProps<T>) {
  return (
    <FormField<T> name={name} control={control} label={label} required={required}>
      {({ field, fieldState }) => {
        const value = getTextValue(field.value);
        const numericValue = getNumericValue(value);
        const helper = getHelperMessage(value, min, max, unit);

        return (
          <>
            <View style={[styles.inputRow, fieldState.error && styles.inputRowError]}>
              <Pressable
                onPress={() => {
                  const baseValue = numericValue ?? 0;
                  const nextValue = clampValue(Number((baseValue - step).toFixed(10)), min, max);
                  field.onChange(String(nextValue));
                }}
                style={styles.stepButton}
              >
                <Text style={styles.stepButtonText}>-</Text>
              </Pressable>

              <RNTextInput
                keyboardType="numeric"
                onBlur={field.onBlur}
                onChangeText={(text) => {
                  const normalized = text.replace(',', '.');

                  if (/^-?\d*(\.\d*)?$/.test(normalized)) {
                    field.onChange(normalized);
                  }
                }}
                placeholder={placeholder}
                placeholderTextColor={colors.gray[400]}
                style={styles.input}
                testID={testID}
                value={value}
              />

              {unit ? <Text style={styles.unit}>{unit}</Text> : null}

              <Pressable
                onPress={() => {
                  const baseValue = numericValue ?? 0;
                  const nextValue = clampValue(Number((baseValue + step).toFixed(10)), min, max);
                  field.onChange(String(nextValue));
                }}
                style={styles.stepButton}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </Pressable>
            </View>

            {!fieldState.error && helper.message ? (
              <Text style={helper.isError ? styles.localErrorText : styles.helperText}>{helper.message}</Text>
            ) : null}
          </>
        );
      }}
    </FormField>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: colors.red[600],
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    height: '100%',
    justifyContent: 'center',
    minWidth: 44,
  },
  stepButtonText: {
    color: colors.gray[800],
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  input: {
    color: colors.gray[900],
    flex: 1,
    fontSize: fontSize.base,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  unit: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
    paddingRight: spacing.sm,
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
