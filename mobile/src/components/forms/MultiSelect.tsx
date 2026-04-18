import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

import { FormField } from './FormField';
import type { SelectOption } from './Select';

export interface MultiSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  max?: number;
  testID?: string;
}

function getSelectedValues(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function getDisplayText(selectedLabels: string[], placeholder: string): string {
  if (selectedLabels.length === 0) {
    return placeholder;
  }

  if (selectedLabels.length <= 2) {
    return selectedLabels.join(', ');
  }

  return `${selectedLabels.length} selected`;
}

export function MultiSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder = 'Select one or more options',
  required = false,
  max,
  testID,
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FormField<T>
      name={name}
      control={control}
      label={label}
      required={required}
      helperText={typeof max === 'number' ? `Select up to ${max} option${max === 1 ? '' : 's'}` : undefined}
    >
      {({ field, fieldState }) => {
        const selectedValues = getSelectedValues(field.value);
        const selectedLabels = options
          .filter((option) => selectedValues.includes(option.value))
          .map((option) => option.label);
        const maxReached = typeof max === 'number' && selectedValues.length >= max;

        return (
          <>
            <Pressable
              onPress={() => setIsOpen(true)}
              style={[styles.trigger, fieldState.error && styles.triggerError]}
              testID={testID}
            >
              <Text style={[styles.triggerText, selectedLabels.length === 0 && styles.placeholderText]}>
                {getDisplayText(selectedLabels, placeholder)}
              </Text>
              <Ionicons color={colors.gray[500]} name="chevron-down" size={20} />
            </Pressable>

            <Modal
              animationType="slide"
              onRequestClose={() => setIsOpen(false)}
              transparent
              visible={isOpen}
            >
              <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
                <View style={styles.overlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                      <View style={styles.headerRow}>
                        <Text style={styles.modalTitle}>{label ?? 'Select options'}</Text>
                        <Pressable onPress={() => setIsOpen(false)}>
                          <Ionicons color={colors.gray[700]} name="close" size={24} />
                        </Pressable>
                      </View>

                      <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        ListEmptyComponent={<Text style={styles.emptyText}>No options available</Text>}
                        renderItem={({ item }) => {
                          const isSelected = selectedValues.includes(item.value);
                          const isDisabled = !isSelected && maxReached;

                          return (
                            <Pressable
                              disabled={isDisabled}
                              onPress={() => {
                                if (isSelected) {
                                  field.onChange(selectedValues.filter((value) => value !== item.value));
                                  return;
                                }

                                const nextValues = [...selectedValues, item.value];
                                field.onChange(typeof max === 'number' ? nextValues.slice(0, max) : nextValues);
                              }}
                              style={[styles.optionRow, isDisabled && styles.optionRowDisabled]}
                            >
                              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected ? (
                                  <Ionicons color={colors.white} name="checkmark" size={16} />
                                ) : null}
                              </View>
                              <Text style={styles.optionLabel}>{item.label}</Text>
                            </Pressable>
                          );
                        }}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </>
        );
      }}
    </FormField>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  triggerError: {
    borderColor: colors.red[600],
  },
  triggerText: {
    color: colors.gray[900],
    flex: 1,
    fontSize: fontSize.base,
    paddingRight: spacing.sm,
  },
  placeholderText: {
    color: colors.gray[400],
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '75%',
    padding: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.gray[900],
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: colors.gray[100],
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.gray[400],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  optionLabel: {
    color: colors.gray[800],
    flex: 1,
    fontSize: fontSize.base,
  },
  emptyText: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
});
