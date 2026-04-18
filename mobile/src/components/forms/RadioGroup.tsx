import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  options: RadioOption[];
  required?: boolean;
  testID?: string;
}

function getSelectedValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function RadioGroup<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required = false,
  testID,
}: RadioGroupProps<T>) {
  return (
    <FormField<T> name={name} control={control} label={label} required={required}>
      {({ field }) => {
        const selectedValue = getSelectedValue(field.value);

        return (
          <View style={styles.optionsList} testID={testID}>
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => field.onChange(option.value)}
                  style={styles.optionRow}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      }}
    </FormField>
  );
}

const styles = StyleSheet.create({
  optionsList: {
    gap: spacing.sm,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.gray[400],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioOuterSelected: {
    borderColor: colors.primary[600],
  },
  radioInner: {
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.full,
    height: 10,
    width: 10,
  },
  optionLabel: {
    color: colors.gray[800],
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
