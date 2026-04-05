// New Invoice Screen
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreateInvoice, useCustomers } from '@/hooks/useAccounting';
import type { CreateInvoiceInput } from '@/types/accounting';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().refine((v) => parseFloat(v) > 0, 'Quantity must be > 0'),
  unit_price: z.string().refine((v) => parseFloat(v) >= 0, 'Price must be >= 0'),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string(),
  notes: z.string(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function NewInvoiceScreen() {
  const { t } = useTranslation(['common', 'navigation']);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: '',
      lineItems: [{ description: '', quantity: '1', unit_price: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const createInvoice = useCreateInvoice();
  const { data: customersResponse } = useCustomers();
  const customers = customersResponse?.data || [];

  const watchedLineItems = watch('lineItems');
  const calculateTotal = () => {
    return (watchedLineItems || []).reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const onSubmit = handleSubmit((data) => {
    const validItems = data.lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) >= 0
    );

    if (validItems.length === 0) {
      return;
    }

    const input: CreateInvoiceInput = {
      customer_id: data.customerId,
      issue_date: data.issueDate,
      due_date: data.dueDate || data.issueDate,
      items: validItems.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
      })),
      notes: data.notes || undefined,
    };

    createInvoice.mutate(input, {
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
      <PageHeader title={t('accounting.newInvoice', 'New Invoice')} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Customer Selection */}
        <Text style={styles.label}>{t('accounting.customer', 'Customer')} *</Text>
        <Controller
          name="customerId"
          control={control}
          render={({ field: { onChange, value } }) => (
            <>
              <View style={styles.pickerContainer}>
                {customers.slice(0, 10).map((customer) => (
                  <Pressable
                    key={customer.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === customer.id }}
                    accessibilityLabel={customer.name}
                    style={[styles.pickerOption, value === customer.id && styles.pickerOptionActive]}
                    onPress={() => onChange(customer.id)}
                  >
                    <Ionicons
                      name={value === customer.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={value === customer.id ? colors.primary[500] : colors.gray[400]}
                    />
                    <View style={styles.pickerContent}>
                      <Text style={styles.pickerText}>{customer.name}</Text>
                      {customer.email && <Text style={styles.pickerSubtext}>{customer.email}</Text>}
                    </View>
                  </Pressable>
                ))}
              </View>
              {errors.customerId ? <Text style={styles.fieldError}>{errors.customerId.message}</Text> : null}
            </>
          )}
        />

        {/* Dates */}
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('accounting.issueDate', 'Issue Date')} *</Text>
            <Controller
              name="issueDate"
              control={control}
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    style={styles.input}
                    accessibilityLabel={t('accounting.issueDate', 'Issue Date')}
                    value={value}
                    onChangeText={onChange}
                    placeholder={t('common.form.dateFormat', 'YYYY-MM-DD')}
                  />
                  {errors.issueDate ? <Text style={styles.fieldError}>{errors.issueDate.message}</Text> : null}
                </>
              )}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('accounting.dueDate', 'Due Date')}</Text>
            <Controller
              name="dueDate"
              control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  accessibilityLabel={t('accounting.dueDate', 'Due Date')}
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('common.form.dateFormat', 'YYYY-MM-DD')}
                />
              )}
            />
          </View>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>{t('accounting.lineItems', 'Line Items')}</Text>
        {errors.lineItems?.root ? <Text style={styles.fieldError}>{errors.lineItems.root.message}</Text> : null}
        {fields.map((field, index) => (
          <View key={field.id} style={styles.lineItemCard}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemNumber}>#{index + 1}</Text>
              {fields.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove line item ${index + 1}`}
                  onPress={() => remove(index)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.red[500]} />
                </Pressable>
              )}
            </View>
            <Controller
              name={`lineItems.${index}.description`}
              control={control}
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    style={styles.input}
                    accessibilityLabel={`${t('accounting.description', 'Description')} ${index + 1}`}
                    value={value}
                    onChangeText={onChange}
                    placeholder={t('accounting.description', 'Description')}
                  />
                  {errors.lineItems?.[index]?.description ? (
                    <Text style={styles.fieldError}>{errors.lineItems[index].description?.message}</Text>
                  ) : null}
                </>
              )}
            />
            <View style={styles.lineItemRow}>
              <Controller
                name={`lineItems.${index}.quantity`}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.input, styles.qtyInput]}
                      accessibilityLabel={`${t('common.form.quantity', 'Qty')} ${index + 1}`}
                      value={value}
                      onChangeText={onChange}
                      placeholder={t('common.form.quantity', 'Qty')}
                      keyboardType="decimal-pad"
                    />
                    {errors.lineItems?.[index]?.quantity ? (
                      <Text style={styles.fieldError}>{errors.lineItems[index].quantity?.message}</Text>
                    ) : null}
                  </View>
                )}
              />
              <Controller
                name={`lineItems.${index}.unit_price`}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      accessibilityLabel={`${t('common.form.unitPrice', 'Unit Price')} ${index + 1}`}
                      value={value}
                      onChangeText={onChange}
                      placeholder={t('common.form.unitPrice', 'Unit Price')}
                      keyboardType="decimal-pad"
                    />
                    {errors.lineItems?.[index]?.unit_price ? (
                      <Text style={styles.fieldError}>{errors.lineItems[index].unit_price?.message}</Text>
                    ) : null}
                  </View>
                )}
              />
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add line item"
          style={styles.addLineButton}
          onPress={() => append({ description: '', quantity: '1', unit_price: '' })}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary[500]} />
          <Text style={styles.addLineText}>{t('accounting.addLineItem', 'Add Line Item')}</Text>
        </Pressable>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('accounting.total', 'Total')}</Text>
          <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
        </View>

        {/* Notes */}
        <Text style={styles.label}>{t('accounting.notes', 'Notes')}</Text>
        <Controller
          name="notes"
          control={control}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              accessibilityLabel={t('accounting.notes', 'Notes')}
              value={value}
              onChangeText={onChange}
              placeholder={t('accounting.notesPlaceholder', 'Add any notes...')}
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
            createInvoice.isPending
              ? t('common.actions.creating', 'Creating...')
              : t('accounting.createInvoice', 'Create Invoice')
          }
          style={[styles.submitButton, createInvoice.isPending && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={createInvoice.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createInvoice.isPending
              ? t('common.actions.creating', 'Creating...')
              : t('accounting.createInvoice', 'Create Invoice')}
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
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  lineItemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineItemNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[600],
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  qtyInput: {
    flex: 1,
  },
  priceInput: {
    flex: 2,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  addLineText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary[500],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary[600],
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
