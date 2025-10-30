import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/Select';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCustomers } from '@/hooks/useCustomers';
import { useTaxes } from '@/hooks/useTaxes';
import { calculateInvoiceTotals } from '@/lib/taxCalculations';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

// Invoice item schema
const invoiceItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  rate: z.coerce.number().min(0, 'Rate must be positive'),
  account_id: z.string().min(1, 'Account is required'),
  tax_id: z.string().optional(),
});

// Invoice schema with date validation
const invoiceSchema = z
  .object({
    invoice_type: z.enum(['sales', 'purchase']),
    party_id: z.string().min(1, 'Please select a customer/supplier'),
    invoice_date: z.string().min(1, 'Invoice date is required'),
    due_date: z.string().min(1, 'Due date is required'),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    remarks: z.string().optional(),
    farm_id: z.string().nullable().optional(),
    parcel_id: z.string().nullable().optional(),
  })
  .refine(
    data => {
      // Validate due_date >= invoice_date
      const invoiceDate = new Date(data.invoice_date);
      const dueDate = new Date(data.due_date);
      return dueDate >= invoiceDate;
    },
    {
      message: 'Due date must be on or after invoice date',
      path: ['due_date'],
    }
  );

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentOrganization, currentFarm, farms } = useAuth();
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const { data: accounts = [] } = useAccounts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: customers = [] } = useCustomers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for calculated totals
  const [calculatedTotals, setCalculatedTotals] = useState<{
    subtotal: number;
    tax_total: number;
    grand_total: number;
    tax_breakdown: Array<{ tax_id: string; tax_name: string; tax_rate: number; tax_amount: number }>;
  }>({
    subtotal: 0,
    tax_total: 0,
    grand_total: 0,
    tax_breakdown: [],
  });

  // Get organization currency (default to MAD if not set)
  const currencySymbol = currentOrganization?.currency_symbol || 'MAD';

  // Filter accounts for dropdown
  const expenseAccounts = accounts.filter(acc => acc.account_type === 'Expense' && !acc.is_group);
  const revenueAccounts = accounts.filter(acc => acc.account_type === 'Revenue' && !acc.is_group);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_type: 'sales',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      farm_id: currentFarm?.id || null,
      parcel_id: null,
      items: [
        {
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
        },
      ],
      remarks: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchInvoiceType = watch('invoice_type');

  // Get taxes based on invoice type
  const { data: allTaxes = [] } = useTaxes(watchInvoiceType);

  // Calculate totals with tax
  const calculateItemTotal = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  // Calculate totals whenever items change
  useEffect(() => {
    const calculateTotals = async () => {
      // Filter valid items
      const validItems = watchItems.filter(
        item => item.item_name && item.quantity > 0 && item.rate >= 0 && item.account_id
      );

      if (validItems.length === 0) {
        setCalculatedTotals({
          subtotal: 0,
          tax_total: 0,
          grand_total: 0,
          tax_breakdown: [],
        });
        return;
      }

      try {
        const result = await calculateInvoiceTotals(validItems, watchInvoiceType);
        setCalculatedTotals({
          subtotal: result.subtotal,
          tax_total: result.tax_total,
          grand_total: result.grand_total,
          tax_breakdown: result.tax_breakdown,
        });
      } catch (error) {
        console.error('Error calculating totals:', error);
      }
    };

    calculateTotals();
  }, [watchItems, watchInvoiceType]);

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      await createInvoice.mutateAsync(data);
      toast.success('Invoice created successfully');
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Get available accounts based on invoice type
  const availableAccounts = watchInvoiceType === 'sales' ? revenueAccounts : expenseAccounts;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Add a new sales or purchase invoice with line items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_type">Invoice Type *</Label>
              <Select
                id="invoice_type"
                {...register('invoice_type')}
              >
                <option value="sales">Sales Invoice</option>
                <option value="purchase">Purchase Invoice</option>
              </Select>
              {errors.invoice_type && (
                <p className="text-sm text-red-600 mt-1">{errors.invoice_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="party_id">
                {watchInvoiceType === 'sales' ? 'Customer' : 'Supplier'} *
              </Label>
              <Select
                id="party_id"
                {...register('party_id')}
              >
                <option value="">Select {watchInvoiceType === 'sales' ? 'customer' : 'supplier'}</option>
                {watchInvoiceType === 'sales'
                  ? customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))
                  : suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))
                }
              </Select>
              {errors.party_id && (
                <p className="text-sm text-red-600 mt-1">{errors.party_id.message}</p>
              )}
              {watchInvoiceType === 'sales' && customers.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">No customers found.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate({ to: '/accounting-customers' });
                    }}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to Customers
                  </Button>
                </div>
              )}
              {watchInvoiceType === 'purchase' && suppliers.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">No suppliers found.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate({ to: '/stock' });
                    }}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to Stock Management
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input
                id="invoice_date"
                type="date"
                {...register('invoice_date')}
              />
              {errors.invoice_date && (
                <p className="text-sm text-red-600 mt-1">{errors.invoice_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-sm text-red-600 mt-1">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Farm and Parcel (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="farm_id">Farm (Optional)</Label>
              <Select
                id="farm_id"
                {...register('farm_id')}
              >
                <option value="">No farm selected</option>
                {farms?.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Link this invoice to a specific farm for better tracking
              </p>
            </div>

            <div>
              <Label htmlFor="parcel_id">Parcel (Optional)</Label>
              <Select
                id="parcel_id"
                {...register('parcel_id')}
                disabled={!watch('farm_id')}
              >
                <option value="">No parcel selected</option>
                {/* TODO: Add parcels dropdown filtered by selected farm */}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {!watch('farm_id') ? 'Select a farm first' : 'Link to a specific parcel'}
              </p>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Invoice Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    item_name: '',
                    description: '',
                    quantity: 1,
                    rate: 0,
                    account_id: '',
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      Item Name *
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      Account *
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      Tax
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      Qty *
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      Rate *
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.item_name`)}
                          placeholder="Item name"
                          className="h-9"
                        />
                        {errors.items?.[index]?.item_name && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.item_name?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.description`)}
                          placeholder="Description"
                          className="h-9"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          {...register(`items.${index}.account_id`)}
                          className="h-9"
                        >
                          <option value="">Select account</option>
                          {availableAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </Select>
                        {errors.items?.[index]?.account_id && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.account_id?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          {...register(`items.${index}.tax_id`)}
                          className="h-9"
                        >
                          <option value="">No tax</option>
                          {allTaxes.map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.name} ({tax.rate}%)
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.quantity`)}
                          placeholder="1"
                          className="h-9 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.rate`)}
                          placeholder="0.00"
                          className="h-9 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {calculateItemTotal(
                          watchItems[index]?.quantity || 0,
                          watchItems[index]?.rate || 0
                        ).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
              <p className="text-sm text-red-600">{errors.items.message as string}</p>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currencySymbol} {calculatedTotals.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Tax Breakdown */}
              {calculatedTotals.tax_breakdown.length > 0 && (
                <div className="space-y-1">
                  {calculatedTotals.tax_breakdown.map((tax) => (
                    <div key={tax.tax_id} className="flex justify-between items-center py-1 pl-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tax.tax_name} ({tax.tax_rate}%):
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {currencySymbol} {tax.tax_amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {calculatedTotals.tax_total > 0 && (
                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total Tax:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currencySymbol} {calculatedTotals.tax_total.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t-2 border-gray-900 dark:border-white">
                <span className="font-bold text-gray-900 dark:text-white text-lg">Grand Total:</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">
                  {currencySymbol} {calculatedTotals.grand_total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              {...register('remarks')}
              placeholder="Optional remarks or notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createInvoice.isPending}>
              {isSubmitting || createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
