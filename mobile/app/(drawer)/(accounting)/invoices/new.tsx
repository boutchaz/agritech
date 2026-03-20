// New Invoice Screen
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCreateInvoice, useCustomers } from '@/hooks/useAccounting';
import type { CreateInvoiceInput } from '@/types/accounting';

interface InvoiceLineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

export default function NewInvoiceScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const [customerId, setCustomerId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: '1', unit_price: '' },
  ]);

  const createInvoice = useCreateInvoice();
  const { data: customersResponse } = useCustomers();
  const customers = customersResponse?.data || [];

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unit_price: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSubmit = () => {
    if (!customerId) {
      Alert.alert(t('errors.missingFields', 'Missing Fields'), t('errors.selectCustomer', 'Please select a customer'));
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.quantity) > 0 && parseFloat(item.unit_price) >= 0
    );

    if (validItems.length === 0) {
      Alert.alert(t('errors.missingFields', 'Missing Fields'), t('errors.addLineItems', 'Please add at least one line item'));
      return;
    }

    const input: CreateInvoiceInput = {
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate || issueDate,
      items: validItems.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
      })),
      notes: notes || undefined,
    };

    createInvoice.mutate(input, {
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
      <PageHeader title={t('accounting.newInvoice', 'New Invoice')} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Customer Selection */}
        <Text style={styles.label}>{t('accounting.customer', 'Customer')} *</Text>
        <View style={styles.pickerContainer}>
          {customers.slice(0, 10).map((customer) => (
            <Pressable
              key={customer.id}
              style={[styles.pickerOption, customerId === customer.id && styles.pickerOptionActive]}
              onPress={() => setCustomerId(customer.id)}
            >
              <Ionicons
                name={customerId === customer.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={customerId === customer.id ? colors.primary[500] : colors.gray[400]}
              />
              <View style={styles.pickerContent}>
                <Text style={styles.pickerText}>{customer.name}</Text>
                {customer.email && <Text style={styles.pickerSubtext}>{customer.email}</Text>}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Dates */}
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('accounting.issueDate', 'Issue Date')} *</Text>
            <TextInput
              style={styles.input}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('accounting.dueDate', 'Due Date')}</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>{t('accounting.lineItems', 'Line Items')}</Text>
        {lineItems.map((item, index) => (
          <View key={index} style={styles.lineItemCard}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemNumber}>#{index + 1}</Text>
              {lineItems.length > 1 && (
                <Pressable onPress={() => removeLineItem(index)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.red[500]} />
                </Pressable>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={item.description}
              onChangeText={(value) => updateLineItem(index, 'description', value)}
              placeholder={t('accounting.description', 'Description')}
            />
            <View style={styles.lineItemRow}>
              <TextInput
                style={[styles.input, styles.qtyInput]}
                value={item.quantity}
                onChangeText={(value) => updateLineItem(index, 'quantity', value)}
                placeholder="Qty"
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={item.unit_price}
                onChangeText={(value) => updateLineItem(index, 'unit_price', value)}
                placeholder="Unit Price"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ))}

        <Pressable style={styles.addLineButton} onPress={addLineItem}>
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
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('accounting.notesPlaceholder', 'Add any notes...')}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, createInvoice.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createInvoice.isPending}
        >
          <Text style={styles.submitButtonText}>
            {createInvoice.isPending
              ? t('common.creating', 'Creating...')
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
