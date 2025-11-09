import React, { useState } from 'react';
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
import { useCreateQuote } from '@/hooks/useQuotes';
import type { Quote } from '@/hooks/useQuotes';
import { useCustomers } from '@/hooks/useCustomers';
import { useAccounts } from '@/hooks/useAccounts';
import { useTaxes } from '@/hooks/useTaxes';
import { useItemSelection } from '@/hooks/useItems';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { InvoiceTotalsDisplay } from '@/components/Accounting/TaxBreakdown';
import { calculateInvoiceTotals } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import i18n from '@/i18n/config';

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
  const { data: customers = [] } = useCustomers();
  const { data: accounts = [] } = useAccounts();
  const { data: taxes = [] } = useTaxes('sales');
  const { data: items = [], isLoading: itemsLoading } = useItemSelection({ 
    is_sales_item: true 
  });

  const isRTL = i18n.language === 'ar';

  const [totals, setTotals] = useState<any>(null);

  const revenueAccounts = accounts.filter((acc) => acc.account_type === 'Revenue' && !acc.is_group);

  // Create schema with translated messages
  const quoteItemSchema = z.object({
    item_id: z.string().optional(),
    item_name: z.string().min(1, t('quotes.form.validation.itemNameRequired')),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, t('quotes.form.validation.quantityPositive')),
    rate: z.coerce.number().min(0, t('quotes.form.validation.ratePositive')),
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

  // Calculate totals when items change
  React.useEffect(() => {
    const calculateTotals = async () => {
      const validItems = watchItems.filter(
        (item) => item.item_name && item.quantity > 0 && item.rate >= 0 && item.account_id
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
      await createQuote.mutateAsync({
        ...data,
        items: data.items.map((item) => ({
          item_id: item.item_id || undefined,
          item_name: item.item_name,
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          account_id: item.account_id,
          tax_id: item.tax_id || null,
        })),
      });

      toast.success(t('quotes.form.success.created'));
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error(t('quotes.form.error.createFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-6xl max-h-[90vh] overflow-y-auto", isRTL && "text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{quote ? t('quotes.form.edit') : t('quotes.form.create')}</DialogTitle>
          <DialogDescription>{quote ? t('quotes.form.editDescription') : t('quotes.form.createDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_id">{t('quotes.form.customer')} *</Label>
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

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium", isRTL && "text-right")}>{t('quotes.form.item')} *</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium", isRTL && "text-right")}>{t('quotes.form.description')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-24", isRTL && "text-right")}>{t('quotes.form.quantity')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-32", isRTL && "text-right")}>{t('quotes.form.rate')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-40", isRTL && "text-right")}>{t('quotes.form.account')}</th>
                      <th className={cn("text-left py-2 px-3 text-sm font-medium w-32", isRTL && "text-right")}>{t('quotes.form.tax')}</th>
                      <th className={cn("text-right py-2 px-3 text-sm font-medium w-32", isRTL && "text-left")}>{t('quotes.form.amount')}</th>
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
                                  // Optionally populate rate from item_prices if available
                                  // For now, user can still enter rate manually
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('quotes.form.selectItem')} />
                              </SelectTrigger>
                              <SelectContent>
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
                            <NativeSelect {...register(`items.${index}.account_id`)} className="w-full">
                              <option value="">{t('quotes.form.selectAccount')}</option>
                              {revenueAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </NativeSelect>
                          </td>
                          <td className="py-2 px-3">
                            <NativeSelect {...register(`items.${index}.tax_id`)} className="w-full">
                              <option value="">{t('quotes.form.noTax')}</option>
                              {taxes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.name} ({tax.rate}%)
                                </option>
                              ))}
                            </NativeSelect>
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
          <div className="grid grid-cols-2 gap-4">
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
            <Button type="submit" disabled={createQuote.isPending}>
              {createQuote.isPending && <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
              {quote ? t('quotes.form.updateQuote') : t('quotes.form.createQuote')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
