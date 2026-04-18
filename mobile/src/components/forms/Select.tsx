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

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  testID?: string;
}

function getSelectedValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function Select<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder = 'Select an option',
  required = false,
  testID,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FormField<T> name={name} control={control} label={label} required={required}>
      {({ field, fieldState }) => {
        const selectedValue = getSelectedValue(field.value);
        const selectedOption = options.find((option) => option.value === selectedValue);

        return (
          <>
            <Pressable
              onPress={() => setIsOpen(true)}
              style={[styles.trigger, fieldState.error && styles.triggerError]}
              testID={testID}
            >
              <Text style={[styles.triggerText, !selectedOption && styles.placeholderText]}>
                {selectedOption?.label ?? placeholder}
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
                        <Text style={styles.modalTitle}>{label ?? 'Select option'}</Text>
                        <Pressable onPress={() => setIsOpen(false)}>
                          <Ionicons color={colors.gray[700]} name="close" size={24} />
                        </Pressable>
                      </View>

                      <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        ListEmptyComponent={<Text style={styles.emptyText}>No options available</Text>}
                        renderItem={({ item }) => {
                          const isSelected = item.value === selectedValue;

                          return (
                            <Pressable
                              onPress={() => {
                                field.onChange(item.value);
                                setIsOpen(false);
                              }}
                              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                            >
                              <Text style={styles.optionLabel}>{item.label}</Text>
                              {isSelected ? (
                                <Ionicons color={colors.primary[600]} name="checkmark" size={20} />
                              ) : null}
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
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  optionRowSelected: {
    backgroundColor: colors.primary[50],
  },
  optionLabel: {
    color: colors.gray[800],
    flex: 1,
    fontSize: fontSize.base,
    paddingRight: spacing.md,
  },
  emptyText: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
});
