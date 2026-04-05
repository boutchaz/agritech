import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  PackagePlus,
  PackageMinus,
  ArrowRightLeft,
  ClipboardCheck,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useCreateStockEntry } from '@/hooks/useStockEntries';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useItemSelection } from '@/hooks/useItems';
import { useAuth } from '@/hooks/useAuth';
import type { StockEntryType, CreateStockEntryInput } from '@/types/stock-entries';
import { STOCK_ENTRY_TYPES } from '@/types/stock-entries';
import { toast } from 'sonner';
import { getLocalDate } from '@/utils/date';
import { itemsApi } from '@/lib/api/items';
import type { ProductVariant } from '@/types/items';

// Zod schemas - Dynamic based on entry type
const getStockEntrySchema = (entryType: StockEntryType) => {
  // Base item schema with common fields
  const baseStockEntryItemSchema = {
    item_id: z.string().min(1, 'Item is required'),
    item_name: z.string().min(1, 'Item name is required'),
    variant_id: z.string().optional().transform(val => val === '' ? undefined : val),
    quantity: z.number().min(0.001, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    batch_number: z.string().optional().transform(val => val === '' ? undefined : val),
    serial_number: z.string().optional().transform(val => val === '' ? undefined : val),
    expiry_date: z.string().optional().transform(val => val === '' ? undefined : val),
    cost_per_unit: z.number().optional(),
    notes: z.string().optional().transform(val => val === '' ? undefined : val),
  };

  // Reconciliation-specific schema requires system_quantity and physical_quantity
  const reconciliationItemSchema = z.object({
    ...baseStockEntryItemSchema,
    system_quantity: z.number().min(0, 'System quantity is required for reconciliation'),
    physical_quantity: z.number().min(0, 'Physical quantity is required for reconciliation'),
  });

  // Standard item schema (for Receipt, Issue, Transfer)
  const standardItemSchema = z.object({
    ...baseStockEntryItemSchema,
    system_quantity: z.number().optional(),
    physical_quantity: z.number().optional(),
  });

  // Use the appropriate item schema based on entry type
  const itemSchema = entryType === 'Stock Reconciliation'
    ? reconciliationItemSchema
    : standardItemSchema;

  return z.object({
    entry_type: z.enum(['Material Receipt', 'Material Issue', 'Stock Transfer', 'Stock Reconciliation']),
    entry_date: z.string().min(1, 'Date is required'),
    from_warehouse_id: z.string().optional().transform(val => val === '' ? undefined : val),
    to_warehouse_id: z.string().optional().transform(val => val === '' ? undefined : val),
    purpose: z.string().optional().transform(val => val === '' ? undefined : val),
    notes: z.string().optional().transform(val => val === '' ? undefined : val),
    items: z.array(itemSchema).min(1, 'At least one item is required'),
  }).superRefine((data, ctx) => {
    if ((entryType === 'Material Issue' || entryType === 'Stock Transfer') && !data.from_warehouse_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source warehouse is required',
        path: ['from_warehouse_id'],
      });
    }

    if ((entryType === 'Material Receipt' || entryType === 'Stock Transfer' || entryType === 'Stock Reconciliation') && !data.to_warehouse_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target warehouse is required',
        path: ['to_warehouse_id'],
      });
    }

    if (entryType === 'Stock Transfer' && data.from_warehouse_id && data.to_warehouse_id && data.from_warehouse_id === data.to_warehouse_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source and target warehouses must be different',
        path: ['to_warehouse_id'],
      });
    }
  });
};

type StockEntryFormData = z.input<ReturnType<typeof getStockEntrySchema>>;

interface StockEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: StockEntryType;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
}

export default function StockEntryForm({
  open,
  onOpenChange,
  defaultType = 'Material Receipt',
  referenceType,
  referenceId,
  referenceNumber,
}: StockEntryFormProps) {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const createEntry = useCreateStockEntry();
  const { data: warehouses = [] } = useWarehouses();
  const { data: items = [], isLoading: itemsLoading } = useItemSelection({ 
    is_stock_item: true 
  });
  const [variantOptionsByItemId, setVariantOptionsByItemId] = useState<Record<string, ProductVariant[]>>({});
  const [variantLoadingByItemId, setVariantLoadingByItemId] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState<StockEntryType>(defaultType);
  const typeStyles = {
    green: {
      active: 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400',
      icon: 'text-green-600 dark:text-green-400',
    },
    orange: {
      active: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-400',
      icon: 'text-orange-600 dark:text-orange-400',
    },
    blue: {
      active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    purple: {
      active: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400',
      icon: 'text-purple-600 dark:text-purple-400',
    },
  } as const;

  // Dynamic schema based on selected type
  const dynamicSchema = useMemo(() => getStockEntrySchema(selectedType), [selectedType]);

  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      entry_type: defaultType,
      entry_date: getLocalDate(),
      items: [
        {
          item_id: '',
          item_name: '',
          quantity: 1,
          unit: '',
          system_quantity: 0,
          physical_quantity: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const config = STOCK_ENTRY_TYPES[selectedType];

  useEffect(() => {
    if (open) {
      setSelectedType(defaultType);
      form.reset({
        entry_type: defaultType,
        entry_date: getLocalDate(),
        from_warehouse_id: '',
        to_warehouse_id: '',
        purpose: '',
        notes: '',
        items: [
          {
            item_id: '',
            item_name: '',
            variant_id: '',
            quantity: 1,
            unit: '',
            system_quantity: defaultType === 'Stock Reconciliation' ? 0 : undefined,
            physical_quantity: defaultType === 'Stock Reconciliation' ? 0 : undefined,
          },
        ],
      });
    }
  }, [open, defaultType, form]);

  // Update resolver when type changes and reset warehouse fields
  useEffect(() => {
    form.setValue('entry_type', selectedType);
    form.setValue('from_warehouse_id', '');
    form.setValue('to_warehouse_id', '');
    // Reset items to clear validation errors from previous type
    form.setValue('items', [{
            item_id: '',
            item_name: '',
            variant_id: '',
            quantity: 1,
            unit: '',
      system_quantity: selectedType === 'Stock Reconciliation' ? 0 : undefined,
      physical_quantity: selectedType === 'Stock Reconciliation' ? 0 : undefined,
    }]);
    form.clearErrors();
  }, [selectedType, form]);

  const onSubmit = async (data: StockEntryFormData) => {
    // Additional validation for reconciliation entries
    if (selectedType === 'Stock Reconciliation') {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (item.system_quantity === null || item.system_quantity === undefined) {
          toast.error(`Item #${i + 1}: System quantity is required for reconciliation`);
          return;
        }
        if (item.physical_quantity === null || item.physical_quantity === undefined) {
          toast.error(`Item #${i + 1}: Physical quantity is required for reconciliation`);
          return;
        }
      }
    }
    if (!currentOrganization?.id) {
      toast.error(t('stockEntries.toast.noOrganization'));
      return;
    }

    try {
      const input: CreateStockEntryInput = {
        organization_id: currentOrganization.id,
        entry_type: data.entry_type,
        entry_date: data.entry_date,
        from_warehouse_id: data.from_warehouse_id,
        to_warehouse_id: data.to_warehouse_id,
        reference_type: referenceType as CreateStockEntryInput['reference_type'],
        reference_id: referenceId,
        reference_number: referenceNumber,
        purpose: data.purpose,
        notes: data.notes,
        items: data.items,
      };

      await createEntry.mutateAsync(input);
      toast.success(`${selectedType} ${t('stockEntries.toast.createSuccess')}`);
      onOpenChange(false);
      form.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockEntries.toast.createError')}: ${message}`);
    }
  };

  // Header content shared between mobile and desktop
  const headerContent = (
    <div className="flex items-center gap-2">
      {config.icon === 'PackagePlus' && <PackagePlus className="w-5 h-5" />}
      {config.icon === 'PackageMinus' && <PackageMinus className="w-5 h-5" />}
      {config.icon === 'ArrowRightLeft' && <ArrowRightLeft className="w-5 h-5" />}
      {config.icon === 'ClipboardCheck' && <ClipboardCheck className="w-5 h-5" />}
      {t('stockEntries.form.createTitle')}
    </div>
  );

  // Footer content shared between mobile and desktop
  const footerContent = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={createEntry.isPending}
      >
        {t('stockEntries.form.cancel')}
      </Button>
      <Button type="submit" form="stock-entry-form" disabled={createEntry.isPending}>
        {createEntry.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('stockEntries.form.creating')}
          </>
        ) : (
          `${t('stockEntries.form.create')} ${selectedType}`
        )}
      </Button>
    </>
  );

  // Form content shared between mobile and desktop
  const formContent = (
    <form id="stock-entry-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Entry Type Selection */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {Object.values(STOCK_ENTRY_TYPES).map((type) => {
              const Icon =
                type.icon === 'PackagePlus'
                  ? PackagePlus
                  : type.icon === 'PackageMinus'
                  ? PackageMinus
                  : type.icon === 'ArrowRightLeft'
                  ? ArrowRightLeft
                  : ClipboardCheck;
              const style = typeStyles[type.color as keyof typeof typeStyles];

              return (
                <Button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedType(type.type)}
                  className={`p-2 md:p-4 border-2 rounded-lg text-left transition-all ${
                    selectedType === type.type
                      ? style.active
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2 ${style.icon}`} />
                  <div className="font-medium text-xs md:text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1 hidden md:block">{type.description}</div>
                </Button>
              );
            })}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_date">{t('stockEntries.form.entryDate')} {t('stockEntries.form.required')}</Label>
              <Input
                id="entry_date"
                type="date"
                {...form.register('entry_date')}
                className="mt-1"
              />
              {form.formState.errors.entry_date && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.entry_date.message}
                </p>
              )}
            </div>

            {/* From Warehouse (for Issue and Transfer) */}
            {config.requiresFromWarehouse && (
              <div>
                <Label htmlFor="from_warehouse_id">{t('stockEntries.form.fromWarehouse')} {t('stockEntries.form.required')}</Label>
                <Select
                  value={form.watch('from_warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('from_warehouse_id', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('stockEntries.form.selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {t('stockEntries.form.noWarehouses')}
                      </SelectItem>
                    ) : (
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.location && ` - ${warehouse.location}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.from_warehouse_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.from_warehouse_id.message}
                  </p>
                )}
              </div>
            )}

            {/* To Warehouse (for Receipt, Transfer, Reconciliation) */}
            {config.requiresToWarehouse && (
              <div>
                <Label htmlFor="to_warehouse_id">{t('stockEntries.form.toWarehouse')} {t('stockEntries.form.required')}</Label>
                <Select
                  value={form.watch('to_warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('to_warehouse_id', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('stockEntries.form.selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {t('stockEntries.form.noWarehouses')}
                      </SelectItem>
                    ) : (
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.location && ` - ${warehouse.location}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.to_warehouse_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.to_warehouse_id.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Purpose and Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="purpose">{t('stockEntries.form.purpose')}</Label>
              <Input
                id="purpose"
                placeholder={t('stockEntries.form.purposePlaceholder')}
                {...form.register('purpose')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">{t('stockEntries.form.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('stockEntries.form.notesPlaceholder')}
                {...form.register('notes')}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('stockEntries.form.items')}</h3>
              <Button
                type="button"
                onClick={() =>
                  append({
                    item_id: '',
                    item_name: '',
                    variant_id: '',
                    quantity: 1,
                    unit: '',
                    system_quantity: selectedType === 'Stock Reconciliation' ? 0 : undefined,
                    physical_quantity: selectedType === 'Stock Reconciliation' ? 0 : undefined,
                  })
                }
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('stockEntries.form.addItem')}
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">{t('stockEntries.form.itemNumber', { number: index + 1 })}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div>
                      <Label>{t('stockEntries.form.item')} {t('stockEntries.form.required')}</Label>
                      <Select
                        value={form.watch(`items.${index}.item_id`) || ''}
                        onValueChange={async (itemId) => {
                          const selectedItem = items.find(item => item.id === itemId);
                          if (selectedItem) {
                            form.setValue(`items.${index}.item_id`, itemId, { shouldValidate: true });
                            form.setValue(`items.${index}.item_name`, selectedItem.item_name, { shouldValidate: true });
                            form.setValue(`items.${index}.unit`, selectedItem.default_unit, { shouldValidate: true });
                            form.setValue(`items.${index}.variant_id`, '', { shouldValidate: false });

                            if (!variantOptionsByItemId[itemId] && currentOrganization?.id) {
                              setVariantLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));
                              try {
                                const variants = await itemsApi.getVariants(itemId, currentOrganization?.id);
                                setVariantOptionsByItemId((prev) => ({ ...prev, [itemId]: variants }));
                              } catch (error) {
                                console.error('Failed to load variants', error);
                              } finally {
                                setVariantLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
                              }
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t('stockEntries.form.selectItem')} />
                        </SelectTrigger>
                        <SelectContent>
                          {itemsLoading ? (
                            <SelectItem value="_loading" disabled>
                              {t('stockEntries.form.loadingItems')}
                            </SelectItem>
                          ) : items.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              {t('stockEntries.form.noItems')}
                            </SelectItem>
                          ) : (
                            items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.item_code} - {item.item_name} ({item.default_unit})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.items?.[index]?.item_id && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.items[index]?.item_id?.message}
                        </p>
                      )}
                      <input
                        type="hidden"
                        {...form.register(`items.${index}.item_name`)}
                      />
                    </div>

                    <div>
                      <Label>{t('stockEntries.form.quantity')} {t('stockEntries.form.required')}</Label>
                      <Input
                        type="number"
                        step="0.001"
                        {...form.register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="mt-1"
                      />
                    </div>

                    {(() => {
                      const itemId = form.watch(`items.${index}.item_id`);
                      const variants = itemId ? variantOptionsByItemId[itemId] : undefined;
                      const isLoadingVariants = itemId ? variantLoadingByItemId[itemId] : false;

                      if (!itemId || !variants || variants.length === 0) {
                        return null;
                      }

                      return (
                        <div>
                          <Label>{t('stockEntries.form.variant', 'Variant')}</Label>
                          <Select
                            value={form.watch(`items.${index}.variant_id`) || ''}
                            onValueChange={(variantId) => {
                              const selectedVariant = variants.find((variant) => variant.id === variantId) as (ProductVariant & { unit?: string | null }) | undefined;
                              form.setValue(`items.${index}.variant_id`, variantId, { shouldValidate: true });
                              if (selectedVariant?.unit) {
                                form.setValue(`items.${index}.unit`, selectedVariant.unit, { shouldValidate: true });
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t('stockEntries.form.selectVariant', 'Select variant')} />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingVariants ? (
                                <SelectItem value="_loading" disabled>
                                  {t('stockEntries.form.loadingVariants', 'Loading variants...')}
                                </SelectItem>
                              ) : (
                                variants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.variant_name} {variant.variant_sku ? `(${variant.variant_sku})` : ''}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}

                    <div>
                      <Label>{t('stockEntries.form.unit')} {t('stockEntries.form.required')}</Label>
                      <Input
                        placeholder="kg, L, units"
                        {...form.register(`items.${index}.unit`)}
                        className="mt-1"
                        readOnly
                        style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                      />
                    </div>

                    {/* Reconciliation Fields */}
                    {config.showReconciliationFields && (
                      <>
                        <div>
                          <Label>{t('stockEntries.form.systemQuantity')} {t('stockEntries.form.required')}</Label>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            {...form.register(`items.${index}.system_quantity`, {
                              valueAsNumber: true,
                              required: selectedType === 'Stock Reconciliation',
                            })}
                            className="mt-1"
                          />
                          {form.formState.errors.items?.[index]?.system_quantity && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.items[index]?.system_quantity?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>{t('stockEntries.form.physicalQuantity')} {t('stockEntries.form.required')}</Label>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            {...form.register(`items.${index}.physical_quantity`, {
                              valueAsNumber: true,
                              required: selectedType === 'Stock Reconciliation',
                            })}
                            className="mt-1"
                          />
                          {form.formState.errors.items?.[index]?.physical_quantity && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.items[index]?.physical_quantity?.message}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Batch/Serial/Cost */}
                    <div>
                      <Label>{t('stockEntries.form.batchNumber')}</Label>
                      <Input
                        placeholder="BATCH-001"
                        {...form.register(`items.${index}.batch_number`)}
                        className="mt-1"
                      />
                    </div>

                    {selectedType === 'Material Receipt' && (
                      <>
                        <div>
                          <Label>{t('stockEntries.form.costPerUnit')}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...form.register(`items.${index}.cost_per_unit`, {
                              valueAsNumber: true,
                            })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>{t('stockEntries.form.expiryDate')}</Label>
                          <Input
                            type="date"
                            {...form.register(`items.${index}.expiry_date`)}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4">
                    <Label>{t('stockEntries.form.itemNotes')}</Label>
                    <Textarea
                      placeholder={t('stockEntries.form.itemNotesPlaceholder')}
                      {...form.register(`items.${index}.notes`)}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            {form.formState.errors.items && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="w-4 h-4" />
                <span>{form.formState.errors.items.message}</span>
              </div>
            )}
          </div>

        </form>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={headerContent}
      description={config.description}
      size="2xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
      footer={<div className="flex w-full flex-row justify-end gap-2 border-t pt-4">{footerContent}</div>}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
