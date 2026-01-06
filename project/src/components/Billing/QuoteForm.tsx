import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation} from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useCreateQuote, useUpdateQuote, useQuote } from '@/hooks/useQuotes';
import type { Quote } from '@/hooks/useQuotes';
import { useCustomers } from '@/hooks/useCustomers';
import { useAccounts } from '@/hooks/useAccounts';
import { useTaxes } from '@/hooks/useTaxes';
import { useItemSelection } from '@/hooks/useItems';
import { Plus, Trash2, Loader2, UserPlus, PackagePlus, FolderPlus, PercentCircle } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { InvoiceTotalsDisplay } from '@/components/Accounting/TaxBreakdown';
import { calculateInvoiceTotals } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import i18n from '@/i18n/config';
import { QuickCreateCustomer } from './QuickCreateCustomer';
import { QuickCreateItem } from './QuickCreateItem';
import { QuickCreateAccount } from './QuickCreateAccount';
import { QuickCreateTax } from './QuickCreateTax';

interface QuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  quote?: Quote | null;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ open, onOpenChange, onSuccess, quote }) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const { data: quoteWithItems, isLoading: quoteLoading } = useQuote(quote?.id || null);
  const { data: customers = [] } = useCustomers();
  const { data: accounts = [] } = useAccounts();
  const { data: taxes = [] } = useTaxes('sales');
  const { data: items = [], isLoading: itemsLoading } = useItemSelection({
    is_sales_item: true
  });

  const isEditMode = !!quote;

  const isRTL = i18n.language === 'ar';

  const [totals, setTotals] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

  const revenueAccounts = accounts.filter((acc) => acc.account_type === 'Revenue' && !acc.is_group);

  // Create schema with translated messages
  const quoteItemSchema = z.object({
    item_id: z.string().optional(),
    item_name: z.string().min(1, t('quotes.form.validation.itemNameRequired')),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, t('quotes.form.validation.quantityPositive')),
    rate: z.coerce.number().positive(t('quotes.form.validation.ratePositive')),
    account_id: z.string().min(1, t('quotes.form.validation.accountRequired')),
    tax_id: z.string().optional(),
  });

  const quoteSchema = z
    .object({
      customer_id: z.string().min(1, t('quotes.form.validation.customerRequired')),
      quote_date: z.string().min(1, t('quotes.form.validation.quoteDateRequired')),
      valid_until: z.string().min(1, t('quotes.form.validation.validUntilRequired')),
      items: z.array(quoteItemSchema).min(1, t('quotes.form.validation.atLeastOneItem')),
      payment_terms: z.string().optional(),
      delivery_terms: z.string().optional(),
      terms_and_conditions: z.string().optional(),
      notes: z.string().optional(),
      reference_number: z.string().optional(),
    })
    .refine(
      (data) => {
        const quoteDate = new Date(data.quote_date);
        const validUntil = new Date(data.valid_until);
        return validUntil >= quoteDate;
      },
      {
        message: t('quotes.form.validation.validUntilAfterDate'),
        path: ['valid_until'],
      }
    );

  type QuoteFormData = z.infer<typeof quoteSchema>;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      items: [
        {
          item_id: '',
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
          tax_id: '',
        },
      ],
      payment_terms: 'Net 30 days',
      delivery_terms: 'FOB Farm',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');

  // Populate form when editing and quote data is loaded
  useEffect(() => {
    if (isEditMode && quoteWithItems && !quoteLoading) {
      const quoteItems = quoteWithItems.items || [];
      reset({
        customer_id: quoteWithItems.customer_id || '',
        quote_date: quoteWithItems.quote_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        valid_until: quoteWithItems.valid_until?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: quoteItems.length > 0 ? quoteItems.map((item: any) => ({
          item_id: item.item_id || '',
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          rate: item.unit_price || 0,
          account_id: item.account_id || '',
          tax_id: item.tax_id || '',
        })) : [{
          item_id: '',
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
          tax_id: '',
        }],
        payment_terms: quoteWithItems.payment_terms || 'Net 30 days',
        delivery_terms: quoteWithItems.delivery_terms || 'FOB Farm',
        terms_and_conditions: quoteWithItems.terms_and_conditions || '',
        notes: quoteWithItems.notes || '',
        reference_number: quoteWithItems.reference_number || '',
      });
    } else if (!isEditMode && open) {
      // Reset to defaults when opening for new quote
      reset({
        customer_id: '',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{
          item_id: '',
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
          tax_id: '',
        }],
        payment_terms: 'Net 30 days',
        delivery_terms: 'FOB Farm',
        terms_and_conditions: '',
        notes: '',
        reference_number: '',
      });
    }
  }, [isEditMode, quoteWithItems, quoteLoading, open, reset]);

  // Calculate totals when items change
  useEffect(() => {
    const calculateTotals = async () => {
      const validItems = watchItems.filter(
        (item) => item.item_name && item.quantity > 0 && item.rate > 0 && item.account_id
      );

      if (validItems.length > 0) {
        try {
          const result = await calculateInvoiceTotals(
            validItems.map((item) => ({
              item_id: item.item_id || undefined,
              item_name: item.item_name,
              description: item.description,
              quantity: Number(item.quantity),
              rate: Number(item.rate),
              account_id: item.account_id,
              tax_id: item.tax_id || null,
            })),
            'sales'
          );
          setTotals(result);
        } catch (error) {
          console.error('Failed to calculate totals:', error);
        }
      } else {
        setTotals(null);
      }
    };

    calculateTotals();
  }, [watchItems]);

  const onSubmit = async (data: z.infer<typeof quoteSchema>) => {
    try {
      const transformedItems = data.items.map((item, index) => ({
        line_number: index + 1,
        item_id: item.item_id || undefined,
        item_name: item.item_name,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.rate),
        account_id: item.account_id,
        tax_id: item.tax_id || null,
      }));

      if (isEditMode && quote?.id) {
        // Update existing quote - use transformedItems with unit_price
        await updateQuote.mutateAsync({
          quoteId: quote.id,
          quoteData: {
            ...data,
            items: transformedItems,
          },
        });
        toast.success(t('quotes.form.success.updated', 'Quote updated successfully'));
      } else {
        // Create new quote
        await createQuote.mutateAsync({
          ...data,
          items: transformedItems,
        });
        toast.success(t('quotes.form.success.created'));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save quote:', error);
      toast.error(isEditMode ? t('quotes.form.error.updateFailed', 'Failed to update quote') : t('quotes.form.error.createFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[95vw] sm:w-auto max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6",
          isRTL && "text-right"
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle>{quote ? t('quotes.form.edit') : t('quotes.form.create')}</DialogTitle>
          <DialogDescription>{quote ? t('quotes.form.editDescription') : t('quotes.form.createDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="customer_id">{t('quotes.form.customer')} *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => setShowCustomerModal(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add New
                </Button>
              </div>
              <NativeSelect id="customer_id" {...register('customer_id')}>
                <option value="">{t('quotes.form.selectCustomer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </NativeSelect>
              {errors.customer_id && (
                <p className="text-sm text-red-600 mt-1">{errors.customer_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reference_number">{t('quotes.form.referenceNumber')}</Label>
              <Input
                id="reference_number"
                {...register('reference_number')}
                placeholder={t('quotes.form.referencePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="quote_date">{t('quotes.form.quoteDate')} *</Label>
              <Input type="date" id="quote_date" {...register('quote_date')} />
              {errors.quote_date && (
                <p className="text-sm text-red-600 mt-1">{errors.quote_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="valid_until">{t('quotes.form.validUntil')} *</Label>
              <Input type="date" id="valid_until" {...register('valid_until')} />
              {errors.valid_until && (
                <p className="text-sm text-red-600 mt-1">{errors.valid_until.message}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
              <Label className="text-base font-semibold">{t('quotes.form.lineItems')} *</Label>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  append({
                    item_id: '',
                    item_name: '',
                    description: '',
                    quantity: 1,
                    rate: 0,
                    account_id: '',
                    tax_id: '',
                  })
                }
              >
                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {t('quotes.form.addItem')}
              </Button>
            </div>

            {/* Mobile-friendly stacked items */}
            <div className="space-y-3 md:hidden">
              {fields.map((field, index) => {
                const item = watchItems[index];
                const amount = (Number(item?.quantity) || 0) * (Number(item?.rate) || 0);
                return (
                  <div key={field.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('quotes.form.item')} #{index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Select
                        value={watch(`items.${index}.item_id`) || ''}
                        onValueChange={(itemId) => {
                          const selectedItem = items.find(item => item.id === itemId);
                          if (selectedItem) {
                            setValue(`items.${index}.item_id`, itemId);
                            setValue(`items.${index}.item_name`, selectedItem.item_name);
                            // Auto-populate rate from standard_rate if available
                            if (selectedItem.standard_rate) {
                              setValue(`items.${index}.rate`, selectedItem.standard_rate);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('quotes.form.selectItem')} />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="sticky top-0 bg-white border-b pb-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setCurrentItemIndex(index);
                                setShowItemModal(true);
                              }}
                            >
                              <PackagePlus className="h-4 w-4 mr-2" />
                              Add New Item
                            </Button>
                          </div>
                          {itemsLoading ? (
                            <SelectItem value="_loading" disabled>
                              {t('quotes.form.loadingItems')}
                            </SelectItem>
                          ) : items.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              {t('quotes.form.noItems')}
                            </SelectItem>
                          ) : (
                            items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.item_code} - {item.item_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <input
                        type="hidden"
                        {...register(`items.${index}.item_id`)}
                      />
                      <input
                        type="hidden"
                        {...register(`items.${index}.item_name`)}
                      />
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder={t('quotes.form.description')}
                        className="w-full"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.quantity`)}
                          placeholder={t('quotes.form.quantity')}
                          className="w-full"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.rate`)}
                          placeholder={t('quotes.form.rate')}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <NativeSelect {...register(`items.${index}.account_id`)} className="w-full">
                            <option value="">{t('quotes.form.selectAccount')}</option>
                            {revenueAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </NativeSelect>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            title="Add new account"
                            onClick={() => {
                              setCurrentItemIndex(index);
                              setShowAccountModal(true);
                            }}
                          >
                            <FolderPlus className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <NativeSelect {...register(`items.${index}.tax_id`)} className="w-full">
                            <option value="">{t('quotes.form.noTax')}</option>
                            {taxes.map((tax) => (
                              <option key={tax.id} value={tax.id}>
                                {tax.name} ({tax.rate}%)
                              </option>
                            ))}
                          </NativeSelect>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            title="Add new tax"
                            onClick={() => {
                              setCurrentItemIndex(index);
                              setShowTaxModal(true);
                            }}
                          >
                            <PercentCircle className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold">
                        {t('quotes.form.amount')}: {amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="border rounded-lg overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium", isRTL && "text-right")}>{t('quotes.form.item')} *</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium", isRTL && "text-right")}>{t('quotes.form.description')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-32", isRTL && "text-right")}>{t('quotes.form.quantity')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-36", isRTL && "text-right")}>{t('quotes.form.rate')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-48", isRTL && "text-right")}>{t('quotes.form.account')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-40", isRTL && "text-right")}>{t('quotes.form.tax')}</th>
                      <th className={cn("text-right py-2 px-3 text-sm font-medium w-36", isRTL && "text-left")}>{t('quotes.form.amount')}</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const item = watchItems[index];
                      const amount = (Number(item?.quantity) || 0) * (Number(item?.rate) || 0);

                      return (
                        <tr key={field.id} className="border-t">
                          <td className="py-2 px-3">
                            <Select
                              value={watch(`items.${index}.item_id`) || ''}
                              onValueChange={(itemId) => {
                                const selectedItem = items.find(item => item.id === itemId);
                                if (selectedItem) {
                                  setValue(`items.${index}.item_id`, itemId);
                                  setValue(`items.${index}.item_name`, selectedItem.item_name);
                                  // Auto-populate rate from standard_rate if available
                                  if (selectedItem.standard_rate) {
                                    setValue(`items.${index}.rate`, selectedItem.standard_rate);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('quotes.form.selectItem')} />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="sticky top-0 bg-white border-b pb-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => {
                                      setCurrentItemIndex(index);
                                      setShowItemModal(true);
                                    }}
                                  >
                                    <PackagePlus className="h-4 w-4 mr-2" />
                                    Add New Item
                                  </Button>
                                </div>
                                {itemsLoading ? (
                                  <SelectItem value="_loading" disabled>
                                    {t('quotes.form.loadingItems')}
                                  </SelectItem>
                                ) : items.length === 0 ? (
                                  <SelectItem value="_none" disabled>
                                    {t('quotes.form.noItems')}
                                  </SelectItem>
                                ) : (
                                  items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.item_code} - {item.item_name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {/* Hidden field for item_name (required for backward compatibility) */}
                            <input
                              type="hidden"
                              {...register(`items.${index}.item_id`)}
                            />
                            <input
                              type="hidden"
                              {...register(`items.${index}.item_name`)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              {...register(`items.${index}.description`)}
                              placeholder={t('quotes.form.description')}
                              className="w-full"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              {...register(`items.${index}.quantity`)}
                              className="w-full"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              {...register(`items.${index}.rate`)}
                              className="w-full"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              <NativeSelect {...register(`items.${index}.account_id`)} className="w-full">
                                <option value="">{t('quotes.form.selectAccount')}</option>
                                {revenueAccounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </option>
                                ))}
                              </NativeSelect>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="px-2"
                                title="Add new account"
                                onClick={() => {
                                  setCurrentItemIndex(index);
                                  setShowAccountModal(true);
                                }}
                              >
                                <FolderPlus className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              <NativeSelect {...register(`items.${index}.tax_id`)} className="w-full">
                                <option value="">{t('quotes.form.noTax')}</option>
                                {taxes.map((tax) => (
                                  <option key={tax.id} value={tax.id}>
                                    {tax.name} ({tax.rate}%)
                                  </option>
                                ))}
                              </NativeSelect>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="px-2"
                                title="Add new tax"
                                onClick={() => {
                                  setCurrentItemIndex(index);
                                  setShowTaxModal(true);
                                }}
                              >
                                <PercentCircle className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </td>
                          <td className={cn("py-2 px-3 font-medium", isRTL ? "text-left" : "text-right")}>
                            {amount.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {errors.items && (
              <p className="text-sm text-red-600 mt-1">{errors.items.message}</p>
            )}
          </div>

          {/* Totals Display */}
          {totals && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <InvoiceTotalsDisplay
                subtotal={totals.subtotal}
                taxTotal={totals.tax_total}
                grandTotal={totals.grand_total}
                taxBreakdown={totals.tax_breakdown}
                currency={currentOrganization?.currency || 'MAD'}
              />
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_terms">{t('quotes.form.paymentTerms')}</Label>
              <Input
                id="payment_terms"
                {...register('payment_terms')}
                placeholder={t('quotes.form.paymentTermsPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="delivery_terms">{t('quotes.form.deliveryTerms')}</Label>
              <Input
                id="delivery_terms"
                {...register('delivery_terms')}
                placeholder={t('quotes.form.deliveryTermsPlaceholder')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="terms_and_conditions">{t('quotes.form.termsConditions')}</Label>
            <Textarea
              id="terms_and_conditions"
              {...register('terms_and_conditions')}
              rows={3}
              placeholder={t('quotes.form.termsPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="notes">{t('quotes.form.notes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={2}
              placeholder={t('quotes.form.notesPlaceholder')}
            />
          </div>

          {/* Form Actions */}
          <div className={cn("flex justify-end gap-3 pt-4 border-t", isRTL && "flex-row-reverse")}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('quotes.form.cancel')}
            </Button>
            <Button type="submit" disabled={createQuote.isPending || updateQuote.isPending || quoteLoading}>
              {(createQuote.isPending || updateQuote.isPending) && <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
              {isEditMode ? t('quotes.form.updateQuote', 'Update Quote') : t('quotes.form.createQuote')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Quick Create Modals */}
      <QuickCreateCustomer
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onSuccess={(customerId) => {
          setValue('customer_id', customerId);
          setShowCustomerModal(false);
        }}
      />

      <QuickCreateItem
        open={showItemModal}
        onOpenChange={setShowItemModal}
        type="sales"
        onSuccess={(itemId, itemName) => {
          if (currentItemIndex !== null) {
            setValue(`items.${currentItemIndex}.item_id`, itemId);
            setValue(`items.${currentItemIndex}.item_name`, itemName);
          }
          setShowItemModal(false);
          setCurrentItemIndex(null);
        }}
      />

      <QuickCreateAccount
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        accountType="Revenue"
        onSuccess={(accountId) => {
          if (currentItemIndex !== null) {
            setValue(`items.${currentItemIndex}.account_id`, accountId);
          }
          setShowAccountModal(false);
          setCurrentItemIndex(null);
        }}
      />

      <QuickCreateTax
        open={showTaxModal}
        onOpenChange={setShowTaxModal}
        taxType="sales"
        onSuccess={(taxId) => {
          if (currentItemIndex !== null) {
            setValue(`items.${currentItemIndex}.tax_id`, taxId);
          }
          setShowTaxModal(false);
          setCurrentItemIndex(null);
        }}
      />
    </Dialog>
  );
};
