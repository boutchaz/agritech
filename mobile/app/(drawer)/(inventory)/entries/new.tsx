// New Stock Entry Screen
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreateStockEntry, useStockItems } from '@/hooks/useInventory';
import type { CreateStockEntryInput, StockItem } from '@/types/inventory';

type EntryType = 'in' | 'out' | 'adjustment';

const ENTRY_TYPES: { value: EntryType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'in', label: 'Stock In', icon: 'add-circle-outline' },
  { value: 'out', label: 'Stock Out', icon: 'remove-circle-outline' },
  { value: 'adjustment', label: 'Adjustment', icon: 'swap-vertical-outline' },
];

export default function NewStockEntryScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [entryType, setEntryType] = useState<EntryType>('in');
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reference, setReference] = useState<string>('');

  const createEntry = useCreateStockEntry();
  const { data: stockItemsResponse } = useStockItems({});
  const stockItems = stockItemsResponse?.data || [];

  const handleSubmit = () => {
    if (!itemId || !quantity) {
      Alert.alert(t('errors.missingFields', 'Missing Fields'), t('errors.fillRequired', 'Please fill all required fields'));
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('errors.invalidQuantity', 'Invalid Quantity'), t('errors.enterValidNumber', 'Please enter a valid positive number'));
      return;
    }

    const input: CreateStockEntryInput = {
      item_id: itemId,
      entry_type: entryType,
      quantity: qty,
      unit_cost: unitCost ? parseFloat(unitCost) : undefined,
      notes: notes || undefined,
      reference_id: reference || undefined,
    };

    createEntry.mutate(input, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        Alert.alert(t('errors.error', 'Error'), error.message);
      },
    });
  };

  return (
    <View style={styles.container}>
      <PageHeader title={t('inventory.newEntry', 'New Stock Entry')} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Entry Type Selection */}
        <Text style={styles.label}>{t('inventory.entryType', 'Entry Type')}</Text>
        <View style={styles.typeGrid}>
          {ENTRY_TYPES.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.typeOption, entryType === option.value && styles.typeOptionActive]}
              onPress={() => setEntryType(option.value)}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={entryType === option.value ? colors.primary[500] : colors.gray[400]}
              />
              <Text style={[styles.typeLabel, entryType === option.value && styles.typeLabelActive]}>
                {t(`inventory.entryTypes.${option.value}`, option.label)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Item Selection */}
        <Text style={styles.label}>{t('inventory.item', 'Item')} *</Text>
        <View style={styles.pickerContainer}>
          {stockItems.slice(0, 10).map((item: StockItem) => (
            <Pressable
              key={item.id}
              style={[styles.pickerOption, itemId === item.id && styles.pickerOptionActive]}
              onPress={() => setItemId(item.id)}
            >
              <Ionicons
                name={itemId === item.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={itemId === item.id ? colors.primary[500] : colors.gray[400]}
              />
              <View style={styles.pickerContent}>
                <Text style={styles.pickerText}>{item.name}</Text>
                {item.sku && <Text style={styles.pickerSubtext}>{item.sku}</Text>}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Quantity */}
        <Text style={styles.label}>{t('inventory.quantity', 'Quantity')} *</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
        />

        {/* Unit Cost */}
        <Text style={styles.label}>{t('inventory.unitCost', 'Unit Cost')}</Text>
        <TextInput
          style={styles.input}
          value={unitCost}
          onChangeText={setUnitCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {/* Reference */}
        <Text style={styles.label}>{t('inventory.reference', 'Reference')}</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder={t('inventory.referencePlaceholder', 'Invoice number, PO, etc.')}
        />

        {/* Notes */}
        <Text style={styles.label}>{t('inventory.notes', 'Notes')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inventory.notesPlaceholder', 'Add any notes...')}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, createEntry.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createEntry.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createEntry.isPending
              ? t('common.creating', 'Creating...')
              : t('inventory.createEntry', 'Create Entry')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gray[200],
    gap: spacing.xs,
    ...shadows.sm,
  },
  typeOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  typeLabelActive: {
    color: colors.primary[600],
    fontWeight: fontWeight.semibold,
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary[50],
  },
  pickerContent: {
    flex: 1,
  },
  pickerText: {
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  pickerSubtext: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
