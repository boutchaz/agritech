import { StyleSheet, TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface TextInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: RNTextInputProps['keyboardType'];
  autoCapitalize?: RNTextInputProps['autoCapitalize'];
  testID?: string;
}

function getInputValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

export function TextInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required = false,
  helperText,
  secureTextEntry = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  testID,
}: TextInputProps<T>) {
  return (
    <FormField<T>
      name={name}
      control={control}
      label={label}
      required={required}
      helperText={helperText}
    >
      {({ field, fieldState }) => (
        <RNTextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={field.onBlur}
          onChangeText={field.onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            fieldState.error && styles.inputError,
          ]}
          testID={testID}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={getInputValue(field.value)}
        />
      )}
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
  multilineInput: {
    minHeight: 112,
  },
  inputError: {
    borderColor: colors.red[600],
  },
});
