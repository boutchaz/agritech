// New Stock Entry Screen
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreateStockEntry, useItemsForSelection, useWarehouses } from '@/hooks/useInventory';
import type { StockEntryType, CreateStockEntryInput } from '@/types/inventory';

const ENTRY_TYPES: { value: StockEntryType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Material Receipt', label: 'Receipt', icon: 'add-circle-outline' },
  { value: 'Material Issue', label: 'Issue', icon: 'remove-circle-outline' },
  { value: 'Stock Transfer', label: 'Transfer', icon: 'swap-horizontal-outline' },
];

const stockEntrySchema = z.object({
  entryType: z.enum(['Material Receipt', 'Material Issue', 'Stock Transfer'] as const),
  itemId: z.string().min(1, 'Please select an item'),
  itemUnit: z.string(),
  quantity: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, 'Please enter a valid positive number'),
  unitCost: z.string(),
  notes: z.string(),
  warehouseId: z.string(),
});

type StockEntryFormData = z.infer<typeof stockEntrySchema>;

export default function NewStockEntryScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockEntryFormData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      entryType: 'Material Receipt',
      itemId: '',
      itemUnit: 'unit',
      quantity: '',
      unitCost: '',
      notes: '',
      warehouseId: '',
    },
  });

  const entryType = watch('entryType');
  const itemId = watch('itemId');
  const itemUnit = watch('itemUnit');
  const warehouseId = watch('warehouseId');

  const createEntry = useCreateStockEntry();
  const { data: selectionItems = [] } = useItemsForSelection(searchQuery || undefined);
  const { data: warehouses = [] } = useWarehouses();

  const handleSelectItem = (item: { id: string; item_name: string; default_unit: string }) => {
    setValue('itemId', item.id);
    setValue('itemUnit', item.default_unit || 'unit');
  };

  const onSubmit = handleSubmit((data) => {
    const qty = parseFloat(data.quantity);

    const input: CreateStockEntryInput = {
      entry_type: data.entryType,
      entry_date: new Date().toISOString().split('T')[0],
      notes: data.notes || undefined,
      items: [
        {
          item_id: data.itemId,
          quantity: qty,
          unit: data.itemUnit,
          cost_per_unit: data.unitCost ? parseFloat(data.unitCost) : undefined,
        },
      ],
    };

    if (data.entryType === 'Material Receipt' && data.warehouseId) {
      input.to_warehouse_id = data.warehouseId;
    } else if (data.entryType === 'Material Issue' && data.warehouseId) {
      input.from_warehouse_id = data.warehouseId;
    }

    createEntry.mutate(input, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        Alert.alert(t('errors.error', 'Error'), error.message);
      },
    });
  });

  return (
    <View style={styles.container}>
      <PageHeader title={t('inventory.newEntry', 'New Stock Entry')} showBack />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Entry Type Selection */}
        <Text style={styles.label}>{t('inventory.entryType', 'Entry Type')}</Text>
        <Controller
          name="entryType"
          control={control}
          render={({ field: { onChange, value } }) => (
            <View style={styles.typeGrid}>
              {ENTRY_TYPES.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === option.value }}
                  accessibilityLabel={t(`inventory.entryTypes.${option.value}`, option.label)}
                  style={[styles.typeOption, value === option.value && styles.typeOptionActive]}
                  onPress={() => onChange(option.value)}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={value === option.value ? colors.primary[500] : colors.gray[400]}
                  />
                  <Text style={[styles.typeLabel, value === option.value && styles.typeLabelActive]}>
                    {t(`inventory.entryTypes.${option.value}`, option.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        {/* Warehouse Selection */}
        {warehouses.length > 0 && (
          <>
            <Text style={styles.label}>
              {entryType === 'Material Receipt'
                ? t('inventory.toWarehouse', 'To Warehouse')
                : t('inventory.fromWarehouse', 'From Warehouse')}
            </Text>
            <Controller
              name="warehouseId"
              control={control}
              render={({ field: { onChange } }) => (
                <View style={styles.pickerContainer}>
                  {warehouses.map((wh) => (
                    <Pressable
                      key={wh.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: warehouseId === wh.id }}
                      accessibilityLabel={wh.name}
                      style={[styles.pickerOption, warehouseId === wh.id && styles.pickerOptionActive]}
                      onPress={() => onChange(wh.id)}
                    >
                      <Ionicons
                        name={warehouseId === wh.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={warehouseId === wh.id ? colors.primary[500] : colors.gray[400]}
                      />
                      <Text style={styles.pickerText}>{wh.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </>
        )}

        {/* Item Selection */}
        <Text style={styles.label}>{t('inventory.item', 'Item')} *</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel={t('inventory.searchItems', 'Search items...')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('inventory.searchItems', 'Search items...')}
        />
        <Controller
          name="itemId"
          control={control}
          render={() => (
            <>
              <View style={styles.pickerContainer}>
                {selectionItems.slice(0, 15).map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: itemId === item.id }}
                    accessibilityLabel={item.item_name}
                    style={[styles.pickerOption, itemId === item.id && styles.pickerOptionActive]}
                    onPress={() => handleSelectItem(item)}
                  >
                    <Ionicons
                      name={itemId === item.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={itemId === item.id ? colors.primary[500] : colors.gray[400]}
                    />
                    <View style={styles.pickerContent}>
                      <Text style={styles.pickerText}>{item.item_name}</Text>
                      {item.item_code && <Text style={styles.pickerSubtext}>{item.item_code}</Text>}
                    </View>
                  </Pressable>
                ))}
                {selectionItems.length === 0 && (
                  <Text style={styles.emptyPicker}>
                    {searchQuery
                      ? t('common.empty.noItemsFound', 'No items found')
                      : t('common.empty.typeToSearch', 'Type to search items')}
                  </Text>
                )}
              </View>
              {errors.itemId ? <Text style={styles.fieldError}>{errors.itemId.message}</Text> : null}
            </>
          )}
        />

        {/* Quantity */}
        <Text style={styles.label}>
          {t('inventory.quantity', 'Quantity')} ({itemUnit}) *
        </Text>
        <Controller
          name="quantity"
          control={control}
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={styles.input}
                accessibilityLabel={t('inventory.quantity', 'Quantity')}
                value={value}
                onChangeText={onChange}
                placeholder="0"
                keyboardType="decimal-pad"
              />
              {errors.quantity ? <Text style={styles.fieldError}>{errors.quantity.message}</Text> : null}
            </>
          )}
        />

        {/* Unit Cost */}
        <Text style={styles.label}>{t('inventory.unitCost', 'Unit Cost (MAD)')}</Text>
        <Controller
          name="unitCost"
          control={control}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              accessibilityLabel={t('inventory.unitCost', 'Unit Cost (MAD)')}
              value={value}
              onChangeText={onChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          )}
        />

        {/* Notes */}
        <Text style={styles.label}>{t('inventory.notes', 'Notes')}</Text>
        <Controller
          name="notes"
          control={control}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              accessibilityLabel={t('inventory.notes', 'Notes')}
              value={value}
              onChangeText={onChange}
              placeholder={t('inventory.notesPlaceholder', 'Add any notes...')}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
        />

        {/* Submit Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            createEntry.isPending
              ? t('common.actions.creating', 'Creating...')
              : t('inventory.createEntry', 'Create Entry')
          }
          style={[styles.submitButton, createEntry.isPending && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={createEntry.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createEntry.isPending
              ? t('common.actions.creating', 'Creating...')
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
    maxHeight: 250,
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
  emptyPicker: {
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
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
  fieldError: {
    color: colors.red[600],
    fontSize: fontSize.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
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
