import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceTotalsDisplay } from '../Accounting/TaxBreakdown';
import { Plus, Trash2 } from 'lucide-react';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, type PurchaseOrderWithItems, type PurchaseOrderItem } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccounts } from '@/hooks/useAccounts';
import { usePurchaseTaxes } from '@/hooks/useTaxes';
import { useAuth } from '../MultiTenantAuthProvider';
import { calculateInvoiceTotals, type InvoiceTotals } from '@/lib/taxCalculations';
import { toast } from 'sonner';

const purchaseOrderSchema = z
  .object({
    supplier_id: z.string().min(1, 'Supplier is required'),
    order_date: z.string().min(1, 'Order date is required'),
    expected_delivery_date: z.string().min(1, 'Expected delivery date is required'),
    payment_terms: z.string().optional(),
    shipping_address: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          item_name: z.string().min(1, 'Item name is required'),
          description: z.string().optional(),
          quantity: z.number().min(0.01, 'Quantity must be positive'),
          rate: z.number().min(0, 'Rate must be non-negative'),
          account_id: z.string().min(1, 'Account is required'),
          tax_id: z.string().optional().nullable(),
        })
      )
      .min(1, 'At least one item is required'),
  })
  .refine(
    (data) => {
      const orderDate = new Date(data.order_date);
      const deliveryDate = new Date(data.expected_delivery_date);
      return deliveryDate >= orderDate;
    },
    {
      message: 'Expected delivery date must be on or after order date',
      path: ['expected_delivery_date'],
    }
  );

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  purchaseOrder?: PurchaseOrderWithItems | null;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  open,
  onOpenChange,
  onSuccess,
  purchaseOrder,
}) => {
  const { currentOrganization, user } = useAuth();
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const isEditMode = !!purchaseOrder;
  const { data: suppliers = [] } = useSuppliers();
  const { data: accounts = [] } = useAccounts();
  const { data: taxes = [] } = usePurchaseTaxes();

  const [totals, setTotals] = React.useState<InvoiceTotals>({
    subtotal: 0,
    tax_total: 0,
    grand_total: 0,
    tax_breakdown: [],
    items_with_tax: [],
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: purchaseOrder ? {
      supplier_id: purchaseOrder.supplier_id || '',
      order_date: purchaseOrder.po_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: purchaseOrder.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_terms: purchaseOrder.payment_terms || '',
      shipping_address: purchaseOrder.delivery_address || '',
      notes: purchaseOrder.notes || '',
      items: purchaseOrder.items && purchaseOrder.items.length > 0
        ? purchaseOrder.items.map((item: PurchaseOrderItem) => ({
            item_name: item.item_name,
            description: item.description || '',
            quantity: item.quantity,
            rate: item.unit_price,
            account_id: item.account_id || '',
            tax_id: item.tax_id || null,
          }))
        : [
            {
              item_name: '',
              description: '',
              quantity: 1,
              rate: 0,
              account_id: '',
              tax_id: null,
            },
          ],
    } : {
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 7 days from now
      payment_terms: '',
      shipping_address: '',
      notes: '',
      items: [
        {
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
          tax_id: null,
        },
      ],
    },
  });

  // Reset form when purchaseOrder changes
  React.useEffect(() => {
    if (purchaseOrder) {
      reset({
        supplier_id: purchaseOrder.supplier_id || '',
        order_date: purchaseOrder.po_date || new Date().toISOString().split('T')[0],
        expected_delivery_date: purchaseOrder.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: purchaseOrder.payment_terms || '',
        shipping_address: purchaseOrder.delivery_address || '',
        notes: purchaseOrder.notes || '',
        items: purchaseOrder.items && purchaseOrder.items.length > 0
          ? purchaseOrder.items.map((item: PurchaseOrderItem) => ({
              item_name: item.item_name,
              description: item.description || '',
              quantity: item.quantity,
              rate: item.unit_price,
              account_id: item.account_id || '',
              tax_id: item.tax_id || null,
            }))
          : [
              {
                item_name: '',
                description: '',
                quantity: 1,
                rate: 0,
                account_id: '',
                tax_id: null,
              },
            ],
      });
    } else {
      reset({
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: '',
        shipping_address: '',
        notes: '',
        items: [
          {
            item_name: '',
            description: '',
            quantity: 1,
            rate: 0,
            account_id: '',
            tax_id: null,
          },
        ],
      });
    }
  }, [purchaseOrder?.id, reset]);

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

      if (validItems.length === 0) {
        setTotals({
          subtotal: 0,
          tax_total: 0,
          grand_total: 0,
          tax_breakdown: [],
          items_with_tax: [],
        });
        return;
      }

      try {
        const result = await calculateInvoiceTotals(validItems, 'purchase');
        setTotals(result);
      } catch (error) {
        console.error('Error calculating totals:', error);
      }
    };

    calculateTotals();
  }, [watchItems]);

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (!currentOrganization || !user) {
      toast.error('Organization or user not found');
      return;
    }

    try {
      if (isEditMode && purchaseOrder) {
        // Update existing purchase order
        const updateData = {
          poId: purchaseOrder.id,
          po_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date,
          payment_terms: data.payment_terms || null,
          delivery_address: data.shipping_address || null,
          notes: data.notes || null,
          items: totals.items_with_tax.map((item, index) => ({
            ...data.items[index],
            amount: item.amount,
            tax_amount: item.tax_amount,
          })),
        };

        await updatePurchaseOrder.mutateAsync(updateData);
        toast.success('Purchase order updated successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        // Create new purchase order
        const purchaseOrderData = {
          supplier_id: data.supplier_id,
          po_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date,
          payment_terms: data.payment_terms || null,
          notes: data.notes || null,
          items: totals.items_with_tax.map((item, index) => ({
            ...data.items[index],
            amount: item.amount,
            tax_amount: item.tax_amount,
          })),
        };

        await createPurchaseOrder.mutateAsync(purchaseOrderData);
        toast.success('Purchase order created successfully');
        reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} purchase order: ` + (error as Error).message);
    }
  };

  const expenseAccounts = accounts.filter(
    (acc) =>
      acc.is_active &&
      !acc.is_group &&
      acc.account_type?.toLowerCase() === 'expense'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update purchase order details and line items' : 'Create a new purchase order for supplier'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Supplier & Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier_id">Supplier *</Label>
              <NativeSelect id="supplier_id" {...register('supplier_id')}>
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </NativeSelect>
              {errors.supplier_id && (
                <p className="text-sm text-red-600 mt-1">{errors.supplier_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="order_date">Order Date *</Label>
              <Input id="order_date" type="date" {...register('order_date')} />
              {errors.order_date && (
                <p className="text-sm text-red-600 mt-1">{errors.order_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="expected_delivery_date">Expected Delivery Date *</Label>
              <Input id="expected_delivery_date" type="date" {...register('expected_delivery_date')} />
              {errors.expected_delivery_date && (
                <p className="text-sm text-red-600 mt-1">{errors.expected_delivery_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input id="payment_terms" placeholder="e.g., Net 30" {...register('payment_terms')} />
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <Label htmlFor="shipping_address">Delivery Address</Label>
            <Textarea id="shipping_address" rows={2} placeholder="Enter delivery address..." {...register('shipping_address')} />
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
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
                      tax_id: null,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-start border-b pb-4 last:border-0"
                  >
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">Item Name *</label>
                      <Input
                        {...register(`items.${index}.item_name`)}
                        placeholder="Item name"
                      />
                      {errors.items?.[index]?.item_name && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.items[index]?.item_name?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Description</label>
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder="Description"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-medium mb-1">Quantity *</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-xs font-medium mb-1">Rate *</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.rate`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Account *</label>
                      <NativeSelect {...register(`items.${index}.account_id`)}>
                        <option value="">Select account</option>
                        {expenseAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Tax</label>
                      <NativeSelect {...register(`items.${index}.tax_id`)}>
                        <option value="">No tax</option>
                        {taxes.map((tax) => (
                          <option key={tax.id} value={tax.id}>
                            {tax.name} ({tax.rate}%)
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Order Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTotalsDisplay
                subtotal={totals.subtotal}
                taxTotal={totals.tax_total}
                grandTotal={totals.grand_total}
                taxBreakdown={totals.tax_breakdown}
                currency={currentOrganization?.currency || 'MAD'}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" rows={3} placeholder="Add internal notes..." {...register('notes')} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isEditMode ? updatePurchaseOrder.isPending : createPurchaseOrder.isPending}>
              {isEditMode 
                ? (updatePurchaseOrder.isPending ? 'Updating...' : 'Update Purchase Order')
                : (createPurchaseOrder.isPending ? 'Creating...' : 'Create Purchase Order')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
