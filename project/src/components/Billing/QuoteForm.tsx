import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCustomers } from '@/hooks/useCustomers';
import { useAccounts } from '@/hooks/useAccounts';
import { useTaxes } from '@/hooks/useTaxes';
import { useItemSelection } from '@/hooks/useItems';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { InvoiceTotalsDisplay } from '@/components/Accounting/TaxBreakdown';
import { calculateInvoiceTotals } from '@/lib/taxCalculations';
import { toast } from 'sonner';

const quoteItemSchema = z.object({
  item_id: z.string().optional(),
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
  rate: z.coerce.number().min(0, 'Rate must be positive'),
  account_id: z.string().min(1, 'Account is required'),
  tax_id: z.string().optional(),
});

const quoteSchema = z
  .object({
    customer_id: z.string().min(1, 'Customer is required'),
    quote_date: z.string().min(1, 'Quote date is required'),
    valid_until: z.string().min(1, 'Valid until date is required'),
    items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
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
      message: 'Valid until date must be on or after quote date',
      path: ['valid_until'],
    }
  );

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const { currentOrganization } = useAuth();
  const createQuote = useCreateQuote();
  const { data: customers = [] } = useCustomers();
  const { data: accounts = [] } = useAccounts();
  const { data: taxes = [] } = useTaxes('sales');
  const { data: items = [], isLoading: itemsLoading } = useItemSelection({ 
    is_sales_item: true 
  });

  const [totals, setTotals] = useState<any>(null);

  const revenueAccounts = accounts.filter((acc) => acc.account_type === 'Revenue' && !acc.is_group);

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

  const onSubmit = async (data: QuoteFormData) => {
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

      toast.success('Quote created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error('Failed to create quote');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>Create a quotation to send to a customer</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_id">Customer *</Label>
              <NativeSelect id="customer_id" {...register('customer_id')}>
                <option value="">-- Select Customer --</option>
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
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                {...register('reference_number')}
                placeholder="Customer's RFQ number"
              />
            </div>

            <div>
              <Label htmlFor="quote_date">Quote Date *</Label>
              <Input type="date" id="quote_date" {...register('quote_date')} />
              {errors.quote_date && (
                <p className="text-sm text-red-600 mt-1">{errors.quote_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="valid_until">Valid Until *</Label>
              <Input type="date" id="valid_until" {...register('valid_until')} />
              {errors.valid_until && (
                <p className="text-sm text-red-600 mt-1">{errors.valid_until.message}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Line Items *</Label>
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
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-medium">Item *</th>
                      <th className="text-left py-2 px-3 text-sm font-medium">Description</th>
                      <th className="text-left py-2 px-3 text-sm font-medium w-24">Qty</th>
                      <th className="text-left py-2 px-3 text-sm font-medium w-32">Rate</th>
                      <th className="text-left py-2 px-3 text-sm font-medium w-40">Account</th>
                      <th className="text-left py-2 px-3 text-sm font-medium w-32">Tax</th>
                      <th className="text-right py-2 px-3 text-sm font-medium w-32">Amount</th>
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
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {itemsLoading ? (
                                  <SelectItem value="_loading" disabled>
                                    Loading items...
                                  </SelectItem>
                                ) : items.length === 0 ? (
                                  <SelectItem value="_none" disabled>
                                    No items available. Create items first.
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
                              placeholder="Description"
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
                              <option value="">-- Account --</option>
                              {revenueAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </NativeSelect>
                          </td>
                          <td className="py-2 px-3">
                            <NativeSelect {...register(`items.${index}.tax_id`)} className="w-full">
                              <option value="">No tax</option>
                              {taxes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.name} ({tax.rate}%)
                                </option>
                              ))}
                            </NativeSelect>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
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
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                {...register('payment_terms')}
                placeholder="e.g., Net 30 days"
              />
            </div>

            <div>
              <Label htmlFor="delivery_terms">Delivery Terms</Label>
              <Input
                id="delivery_terms"
                {...register('delivery_terms')}
                placeholder="e.g., FOB Farm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_and_conditions"
              {...register('terms_and_conditions')}
              rows={3}
              placeholder="Enter terms and conditions..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={2}
              placeholder="Internal notes (not visible to customer)"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createQuote.isPending}>
              {createQuote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Quote
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
