
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useCreateItem } from '@/hooks/useItems';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (itemId: string, itemName: string) => void;
  type?: 'sales' | 'purchase' | 'both';
}

const itemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  item_code: z.string().optional(),
  sales_rate: z.coerce.number().min(0, 'Rate must be positive').optional(),
  unit_of_measure: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

export const QuickCreateItem = ({
  open,
  onOpenChange,
  onSuccess,
  type = 'sales',
}: QuickCreateItemProps) => {
  const createItem = useCreateItem();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const onSubmit = async (data: ItemFormData) => {
    try {
      const result = await createItem.mutateAsync({
        item_name: data.item_name,
        description: data.description,
        item_code: data.item_code,
        sales_rate: data.sales_rate,
        unit_of_measure: data.unit_of_measure || 'Unit',
        is_sales_item: type === 'sales' || type === 'both',
        is_purchase_item: type === 'purchase' || type === 'both',
        is_inventory_item: false,
      });

      toast.success('Item created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.(result.id, result.item_name);
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Failed to create item');
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Quick Create Item"
      description={`Add a new ${type === 'sales' ? 'sales' : type === 'purchase' ? 'purchase' : ''} item. You can edit details later.`}
      size="md"
      footer={(
        <>
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
          <Button type="submit" form="quick-create-item-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Item
          </Button>
        </>
      )}
    >
      <form id="quick-create-item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name *</Label>
            <Input
              id="item_name"
              {...register('item_name')}
              placeholder="Enter item name"
              autoFocus
            />
            {errors.item_name && (
              <p className="text-sm text-red-600 mt-1">{errors.item_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="item_code">Item Code</Label>
            <Input
              id="item_code"
              {...register('item_code')}
              placeholder="e.g., ITEM-001"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sales_rate">Rate</Label>
              <Input
                id="sales_rate"
                type="number"
                step="0.01"
                {...register('sales_rate')}
                placeholder="0.00"
              />
              {errors.sales_rate && (
                <p className="text-sm text-red-600 mt-1">{errors.sales_rate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit_of_measure">Unit</Label>
              <NativeSelect id="unit_of_measure" {...register('unit_of_measure')}>
                <option value="Unit">Unit</option>
                <option value="Kg">Kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="m">m</option>
                <option value="cm">cm</option>
                <option value="Box">Box</option>
                <option value="Pack">Pack</option>
                <option value="Hour">Hour</option>
                <option value="Day">Day</option>
              </NativeSelect>
            </div>
          </div>

      </form>
    </ResponsiveDialog>
  );
};
