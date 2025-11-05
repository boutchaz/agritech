import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type { StockEntryType, CreateStockEntryInput } from '@/types/stock-entries';
import { STOCK_ENTRY_TYPES } from '@/types/stock-entries';
import { toast } from 'sonner';

// Zod schemas
const stockEntryItemSchema = z.object({
  item_id: z.string().min(1, 'Item is required'),
  item_name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(0.001, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  batch_number: z.string().optional().transform(val => val === '' ? undefined : val),
  serial_number: z.string().optional().transform(val => val === '' ? undefined : val),
  expiry_date: z.string().optional().transform(val => val === '' ? undefined : val),
  cost_per_unit: z.number().optional(),
  system_quantity: z.number().optional(),
  physical_quantity: z.number().optional(),
  notes: z.string().optional().transform(val => val === '' ? undefined : val),
});

const stockEntrySchema = z.object({
  entry_type: z.enum(['Material Receipt', 'Material Issue', 'Stock Transfer', 'Stock Reconciliation']),
  entry_date: z.string().min(1, 'Date is required'),
  from_warehouse_id: z.string().optional().transform(val => val === '' ? undefined : val),
  to_warehouse_id: z.string().optional().transform(val => val === '' ? undefined : val),
  purpose: z.string().optional().transform(val => val === '' ? undefined : val),
  notes: z.string().optional().transform(val => val === '' ? undefined : val),
  items: z.array(stockEntryItemSchema).min(1, 'At least one item is required'),
});

type StockEntryFormData = z.infer<typeof stockEntrySchema>;

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
  const { currentOrganization } = useAuth();
  const createEntry = useCreateStockEntry();
  const { data: warehouses = [] } = useWarehouses();
  const { data: items = [], isLoading: itemsLoading } = useItemSelection({ 
    is_stock_item: true 
  });
  const [selectedType, setSelectedType] = useState<StockEntryType>(defaultType);

  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      entry_type: defaultType,
      entry_date: new Date().toISOString().split('T')[0],
      items: [
        {
          item_id: '',
          item_name: '',
          quantity: 1,
          unit: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const config = STOCK_ENTRY_TYPES[selectedType];

  // Reset form when type changes
  useEffect(() => {
    form.setValue('entry_type', selectedType);
    form.setValue('from_warehouse_id', '');
    form.setValue('to_warehouse_id', '');
  }, [selectedType, form]);

  const onSubmit = async (data: StockEntryFormData) => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }

    try {
      const input: CreateStockEntryInput = {
        organization_id: currentOrganization.id,
        entry_type: data.entry_type,
        entry_date: data.entry_date,
        from_warehouse_id: data.from_warehouse_id,
        to_warehouse_id: data.to_warehouse_id,
        reference_type: referenceType as any,
        reference_id: referenceId,
        reference_number: referenceNumber,
        purpose: data.purpose,
        notes: data.notes,
        items: data.items,
      };

      await createEntry.mutateAsync(input);
      toast.success(`${selectedType} created successfully`);
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(`Failed to create entry: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon === 'PackagePlus' && <PackagePlus className="w-5 h-5" />}
            {config.icon === 'PackageMinus' && <PackageMinus className="w-5 h-5" />}
            {config.icon === 'ArrowRightLeft' && <ArrowRightLeft className="w-5 h-5" />}
            {config.icon === 'ClipboardCheck' && <ClipboardCheck className="w-5 h-5" />}
            Create Stock Entry
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Entry Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.values(STOCK_ENTRY_TYPES).map((type) => {
              const Icon =
                type.icon === 'PackagePlus'
                  ? PackagePlus
                  : type.icon === 'PackageMinus'
                  ? PackageMinus
                  : type.icon === 'ArrowRightLeft'
                  ? ArrowRightLeft
                  : ClipboardCheck;

              return (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedType(type.type)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedType === type.type
                      ? `border-${type.color}-500 bg-${type.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 text-${type.color}-600`} />
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              );
            })}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_date">Entry Date *</Label>
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
                <Label htmlFor="from_warehouse_id">From Warehouse *</Label>
                <Select
                  value={form.watch('from_warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('from_warehouse_id', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No warehouses available
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
                <Label htmlFor="to_warehouse_id">To Warehouse *</Label>
                <Select
                  value={form.watch('to_warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('to_warehouse_id', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No warehouses available
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
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder={`Purpose of this ${selectedType.toLowerCase()}`}
                {...form.register('purpose')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes"
                {...form.register('notes')}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button
                type="button"
                onClick={() =>
                  append({
                    item_id: '',
                    item_name: '',
                    quantity: 1,
                    unit: '',
                  })
                }
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Item #{index + 1}</h4>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Item *</Label>
                      <Select
                        value={form.watch(`items.${index}.item_id`) || ''}
                        onValueChange={(itemId) => {
                          const selectedItem = items.find(item => item.id === itemId);
                          if (selectedItem) {
                            form.setValue(`items.${index}.item_id`, itemId);
                            form.setValue(`items.${index}.item_name`, selectedItem.item_name);
                            form.setValue(`items.${index}.unit`, selectedItem.default_unit);
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
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
                      {/* Hidden field for item_name (still required for backward compatibility) */}
                      <input
                        type="hidden"
                        {...form.register(`items.${index}.item_name`)}
                      />
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        step="0.001"
                        {...form.register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Unit *</Label>
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
                          <Label>System Quantity</Label>
                          <Input
                            type="number"
                            step="0.001"
                            {...form.register(`items.${index}.system_quantity`, {
                              valueAsNumber: true,
                            })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Physical Quantity *</Label>
                          <Input
                            type="number"
                            step="0.001"
                            {...form.register(`items.${index}.physical_quantity`, {
                              valueAsNumber: true,
                            })}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}

                    {/* Batch/Serial/Cost */}
                    <div>
                      <Label>Batch Number</Label>
                      <Input
                        placeholder="BATCH-001"
                        {...form.register(`items.${index}.batch_number`)}
                        className="mt-1"
                      />
                    </div>

                    {selectedType === 'Material Receipt' && (
                      <>
                        <div>
                          <Label>Cost per Unit</Label>
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
                          <Label>Expiry Date</Label>
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
                    <Label>Item Notes</Label>
                    <Textarea
                      placeholder="Notes for this item"
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createEntry.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${selectedType}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
