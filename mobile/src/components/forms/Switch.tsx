import { StyleSheet, Switch as RNSwitch, Text, View } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export interface SwitchProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  description?: string;
  testID?: string;
}

function getBooleanValue(value: unknown): boolean {
  return value === true;
}

function getErrorMessage(message: unknown): string | null {
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function Switch<T extends FieldValues>({
  name,
  control,
  label,
  description,
  testID,
}: SwitchProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const errorMessage = getErrorMessage(fieldState.error?.message);

        return (
          <View style={styles.container}>
            <View style={styles.row}>
              <View style={styles.copyBlock}>
                <Text style={styles.label}>{label}</Text>
                {description ? <Text style={styles.description}>{description}</Text> : null}
              </View>
              <RNSwitch
                ios_backgroundColor={colors.gray[300]}
                onValueChange={field.onChange}
                testID={testID}
                thumbColor={colors.white}
                trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                value={getBooleanValue(field.value)}
              />
            </View>
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
    justifyContent: 'space-between',
    minHeight: 48,
  },
  copyBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  label: {
    color: colors.gray[800],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  description: {
    color: colors.gray[500],
    fontSize: fontSize.xs,
  },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
  },
});
