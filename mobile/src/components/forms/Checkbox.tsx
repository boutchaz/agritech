import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export interface CheckboxProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  testID?: string;
}

function getBooleanValue(value: unknown): boolean {
  return value === true;
}

function getErrorMessage(message: unknown): string | null {
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function Checkbox<T extends FieldValues>({ name, control, label, testID }: CheckboxProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const checked = getBooleanValue(field.value);
        const errorMessage = getErrorMessage(fieldState.error?.message);

        return (
          <View style={styles.container}>
            <Pressable
              onPress={() => field.onChange(!checked)}
              style={styles.row}
              testID={testID}
            >
              <View style={[styles.box, checked && styles.boxChecked, fieldState.error && styles.boxError]}>
                {checked ? <Ionicons color={colors.white} name="checkmark" size={16} /> : null}
              </View>
              <Text style={styles.label}>{label}</Text>
            </Pressable>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  box: {
    alignItems: 'center',
    borderColor: colors.gray[400],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  boxChecked: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  boxError: {
    borderColor: colors.red[600],
  },
  label: {
    color: colors.gray[800],
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
});
