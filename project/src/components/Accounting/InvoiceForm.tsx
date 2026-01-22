import { useAuth } from '@/hooks/useAuth';
import { getLocalDate, getLocalDateOffset } from '@/utils/date';
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
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateInvoice, useUpdateInvoice, useInvoice } from '@/hooks/useInvoices';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCustomers } from '@/hooks/useCustomers';
import { useTaxes } from '@/hooks/useTaxes';
import { useItemSelection } from '@/hooks/useItems';
import { useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { calculateInvoiceTotals } from '@/lib/taxCalculations';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, ExternalLink, PackagePlus } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { QuickCreateItem } from '../Billing/QuickCreateItem';
import { useTranslation } from 'react-i18next';

// Invoice item schema
const getInvoiceItemSchema = (t: (key: string) => string) => z.object({
  item_id: z.string().optional(),
  item_name: z.string().min(1, t('accounting.invoices.form.validation.itemNameRequired')),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, t('accounting.invoices.form.validation.quantityMin')),
  rate: z.coerce.number().min(0, t('accounting.invoices.form.validation.ratePositive')),
  account_id: z.string().min(1, t('accounting.invoices.form.validation.accountRequired')),
  tax_id: z.string().optional(),
});

// Invoice schema with date validation
const getInvoiceSchema = (t: (key: string) => string) => z
  .object({
    invoice_type: z.enum(['sales', 'purchase']),
    party_id: z.string().min(1, t('accounting.invoices.form.validation.partyRequired')),
    invoice_date: z.string().min(1, t('accounting.invoices.form.validation.invoiceDateRequired')),
    due_date: z.string().min(1, t('accounting.invoices.form.validation.dueDateRequired')),
    items: z.array(getInvoiceItemSchema(t)).min(1, t('accounting.invoices.form.validation.atLeastOneItem')),
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
      message: t('accounting.invoices.form.validation.dueDateAfterInvoiceDate'),
      path: ['due_date'],
    }
  );

type InvoiceFormData = z.infer<ReturnType<typeof getInvoiceSchema>>;

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editInvoiceId?: string | null;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, onSuccess, editInvoiceId }) => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm, farms } = useAuth();
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(editInvoiceId || null);

  const isEditMode = !!editInvoiceId;
  const { data: accounts = [] } = useAccounts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: customers = [] } = useCustomers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

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

  // Fetch items for selection based on invoice type
  const { data: salesItems = [], isLoading: salesItemsLoading } = useItemSelection({
    is_sales_item: true
  });
  const { data: purchaseItems = [], isLoading: purchaseItemsLoading } = useItemSelection({
    is_purchase_item: true
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(getInvoiceSchema(t)),
    defaultValues: {
      invoice_type: 'sales',
      invoice_date: getLocalDate(),
      due_date: getLocalDateOffset(30), // 30 days from now
      farm_id: currentFarm?.id || null,
      parcel_id: null,
      items: [
        {
          item_id: '',
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
  const selectedFarmId = watch('farm_id');

  // Get items based on invoice type
  const availableItems = watchInvoiceType === 'sales' ? salesItems : purchaseItems;
  const itemsLoading = watchInvoiceType === 'sales' ? salesItemsLoading : purchaseItemsLoading;

  // Get taxes based on invoice type
  const { data: allTaxes = [] } = useTaxes(watchInvoiceType);
  
  // Fetch parcels for the selected farm
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || undefined);

  // Calculate totals with tax
  const calculateItemTotal = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  // Calculate totals whenever items change
  useEffect(() => {
    const calculateTotals = async () => {
      // Filter valid items and coerce values to numbers
      // (watch() returns raw form values which may be strings)
      const validItems = watchItems
        .map(item => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        }))
        .filter(
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

      // Calculate simple subtotal first for immediate feedback
      const simpleSubtotal = validItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

      // Update with simple subtotal immediately
      setCalculatedTotals(prev => ({
        ...prev,
        subtotal: simpleSubtotal,
        grand_total: simpleSubtotal + prev.tax_total,
      }));

      try {
        const result = await calculateInvoiceTotals(validItems, watchInvoiceType);
        setCalculatedTotals({
          subtotal: result.subtotal,
          tax_total: result.tax_total,
          grand_total: result.grand_total,
          tax_breakdown: result.tax_breakdown,
        });
      } catch (error) {
        console.error('Error calculating totals with taxes:', error);
        // Keep the simple subtotal on error
        setCalculatedTotals({
          subtotal: simpleSubtotal,
          tax_total: 0,
          grand_total: simpleSubtotal,
          tax_breakdown: [],
        });
      }
    };

    calculateTotals();
  }, [watchItems, watchInvoiceType]);

  // Reset form with existing invoice data when editing
  useEffect(() => {
    if (isEditMode && existingInvoice && !isLoadingInvoice) {
      reset({
        invoice_type: existingInvoice.invoice_type,
        party_id: existingInvoice.party_id || '',
        invoice_date: existingInvoice.invoice_date,
        due_date: existingInvoice.due_date,
        farm_id: existingInvoice.farm_id || null,
        parcel_id: existingInvoice.parcel_id || null,
        remarks: existingInvoice.remarks || '',
        items: existingInvoice.items?.map(item => ({
          item_id: (item as any).item_id || '',
          item_name: item.item_name,
          description: item.description || '',
          quantity: item.quantity,
          rate: item.rate,
          account_id: item.account_id,
          tax_id: item.tax_id || undefined,
        })) || [{
          item_id: '',
          item_name: '',
          description: '',
          quantity: 1,
          rate: 0,
          account_id: '',
        }],
      });
    }
  }, [isEditMode, existingInvoice, isLoadingInvoice, reset]);

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      // Transform items to ensure proper number types
      const transformedItems = data.items.map((item) => ({
        item_name: item.item_name,
        description: item.description || undefined,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        account_id: item.account_id,
        tax_id: item.tax_id || undefined,
      }));

      if (isEditMode && editInvoiceId) {
        // Update existing invoice
        await updateInvoice.mutateAsync({
          invoiceId: editInvoiceId,
          party_id: data.party_id,
          party_name: data.invoice_type === 'sales'
            ? customers.find(c => c.id === data.party_id)?.name
            : suppliers.find(s => s.id === data.party_id)?.name,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          notes: data.remarks,
          items: transformedItems.map(item => ({
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.rate,
            amount: item.quantity * item.rate,
            tax_id: item.tax_id,
            tax_rate: 0, // Will be populated from tax lookup if needed
            tax_amount: 0, // Will be recalculated
            line_total: item.quantity * item.rate,
          })),
        });
        toast.success(t('accounting.invoices.form.toast.updateSuccess'));
      } else {
        // Create new invoice with transformed items
        await createInvoice.mutateAsync({
          invoice_type: data.invoice_type,
          party_id: data.party_id,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          items: transformedItems,
          remarks: data.remarks,
          farm_id: data.farm_id,
          parcel_id: data.parcel_id,
        });
        toast.success(t('accounting.invoices.form.toast.createSuccess'));
      }
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} invoice:`, error);
      toast.error(error instanceof Error ? error.message : t('accounting.invoices.form.toast.saveError', { action: isEditMode ? t('accounting.invoices.form.actions.update') : t('accounting.invoices.form.actions.create') }));
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
          <DialogTitle>{isEditMode ? t('accounting.invoices.form.title.edit') : t('accounting.invoices.form.title.create')}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t('accounting.invoices.form.description.edit') : t('accounting.invoices.form.description.create')}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && isLoadingInvoice ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">{t('accounting.invoices.form.loading')}</span>
          </div>
        ) : (

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_type">{t('accounting.invoices.form.fields.invoiceType')} *</Label>
              <Select
                id="invoice_type"
                {...register('invoice_type')}
              >
                <option value="sales">{t('accounting.invoices.form.invoiceTypes.sales')}</option>
                <option value="purchase">{t('accounting.invoices.form.invoiceTypes.purchase')}</option>
              </Select>
              {errors.invoice_type && (
                <p className="text-sm text-red-600 mt-1">{errors.invoice_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="party_id">
                {watchInvoiceType === 'sales' ? t('accounting.invoices.form.fields.customer') : t('accounting.invoices.form.fields.supplier')} *
              </Label>
              <Select
                id="party_id"
                {...register('party_id')}
              >
                <option value="">{t('accounting.invoices.form.fields.selectParty', { party: watchInvoiceType === 'sales' ? t('accounting.invoices.form.fields.customer').toLowerCase() : t('accounting.invoices.form.fields.supplier').toLowerCase() })}</option>
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
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">{t('accounting.invoices.form.errors.noCustomers')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate({ to: '/accounting/customers' });
                    }}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('accounting.invoices.form.buttons.goToCustomers')}
                  </Button>
                </div>
              )}
              {watchInvoiceType === 'purchase' && suppliers.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">{t('accounting.invoices.form.errors.noSuppliers')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate({ to: '/stock/suppliers' });
                    }}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('accounting.invoices.form.buttons.goToStockManagement')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice_date">{t('accounting.invoices.form.fields.invoiceDate')} *</Label>
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
              <Label htmlFor="due_date">{t('accounting.invoices.form.fields.dueDate')} *</Label>
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
              <Label htmlFor="farm_id">{t('accounting.invoices.form.fields.farm')} ({t('accounting.invoices.form.optional')})</Label>
              <Select
                id="farm_id"
                {...register('farm_id')}
              >
                <option value="">{t('accounting.invoices.form.fields.noFarmSelected')}</option>
                {farms?.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t('accounting.invoices.form.fields.farmHelp')}
              </p>
            </div>

            <div>
              <Label htmlFor="parcel_id">{t('accounting.invoices.form.fields.parcel')} ({t('accounting.invoices.form.optional')})</Label>
              <Select
                id="parcel_id"
                {...register('parcel_id')}
                disabled={!watch('farm_id')}
              >
                <option value="">{t('accounting.invoices.form.fields.noParcelSelected')}</option>
                {parcels.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {!watch('farm_id')
                  ? t('accounting.invoices.form.fields.parcelHelpSelectFarm')
                  : parcels.length === 0
                    ? t('accounting.invoices.form.fields.parcelHelpNoParcels')
                    : t('accounting.invoices.form.fields.parcelHelp')}
              </p>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">{t('accounting.invoices.form.items.title')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    item_id: '',
                    item_name: '',
                    description: '',
                    quantity: 1,
                    rate: 0,
                    account_id: '',
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('accounting.invoices.form.items.addItem')}
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.itemName')} *
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.description')}
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.account')} *
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.tax')}
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.quantity')} *
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.rate')} *
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.amount')}
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('accounting.invoices.form.items.columns.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        <RadixSelect
                          value={watch(`items.${index}.item_id`) || ''}
                          onValueChange={(itemId) => {
                            const selectedItem = availableItems.find(item => item.id === itemId);
                            if (selectedItem) {
                              setValue(`items.${index}.item_id`, itemId, { shouldValidate: true });
                              setValue(`items.${index}.item_name`, selectedItem.item_name, { shouldValidate: true });
                              // Auto-populate rate from standard_rate if available
                              if (selectedItem.standard_rate) {
                                setValue(`items.${index}.rate`, selectedItem.standard_rate, { shouldValidate: true });
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder={t('accounting.invoices.form.items.selectItem')} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b pb-1">
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
                                {t('accounting.invoices.form.items.addNewItem')}
                              </Button>
                            </div>
                            {itemsLoading ? (
                              <SelectItem value="_loading" disabled>
                                {t('accounting.invoices.form.items.loadingItems')}
                              </SelectItem>
                            ) : availableItems.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                {t('accounting.invoices.form.items.noItemsFound')}
                              </SelectItem>
                            ) : (
                              availableItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item_code} - {item.item_name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </RadixSelect>
                        {/* Note: item_id and item_name are controlled via setValue from RadixSelect */}
                        {errors.items?.[index]?.item_name && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.item_name?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          {...register(`items.${index}.description`)}
                          placeholder={t('accounting.invoices.form.items.placeholders.description')}
                          className="h-9"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          {...register(`items.${index}.account_id`)}
                          className="h-9"
                        >
                          <option value="">{t('accounting.invoices.form.items.selectAccount')}</option>
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
                          <option value="">{t('accounting.invoices.form.items.noTax')}</option>
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
                          placeholder={t('accounting.invoices.form.items.placeholders.quantity')}
                          className="h-9 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.rate`)}
                          placeholder={t('accounting.invoices.form.items.placeholders.rate')}
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
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('accounting.invoices.form.totals.subtotal')}:</span>
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
                  <span className="font-medium text-gray-700 dark:text-gray-300">{t('accounting.invoices.form.totals.totalTax')}:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currencySymbol} {calculatedTotals.tax_total.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t-2 border-gray-900 dark:border-white">
                <span className="font-bold text-gray-900 dark:text-white text-lg">{t('accounting.invoices.form.totals.grandTotal')}:</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">
                  {currencySymbol} {calculatedTotals.grand_total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">{t('accounting.invoices.form.fields.remarks')}</Label>
            <Input
              id="remarks"
              {...register('remarks')}
              placeholder={t('accounting.invoices.form.fields.remarksPlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('accounting.invoices.form.buttons.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || createInvoice.isPending || updateInvoice.isPending}>
              {isSubmitting || createInvoice.isPending || updateInvoice.isPending
                ? (isEditMode ? t('accounting.invoices.form.buttons.updating') : t('accounting.invoices.form.buttons.creating'))
                : (isEditMode ? t('accounting.invoices.form.buttons.update') : t('accounting.invoices.form.buttons.create'))}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>

      {/* Quick Create Item Modal */}
      <QuickCreateItem
        open={showItemModal}
        onOpenChange={setShowItemModal}
        type={watchInvoiceType === 'sales' ? 'sales' : 'purchase'}
        onSuccess={(itemId, itemName) => {
          if (currentItemIndex !== null) {
            setValue(`items.${currentItemIndex}.item_id`, itemId, { shouldValidate: true });
            setValue(`items.${currentItemIndex}.item_name`, itemName, { shouldValidate: true });
          }
          setShowItemModal(false);
          setCurrentItemIndex(null);
        }}
      />
    </Dialog>
  );
};
