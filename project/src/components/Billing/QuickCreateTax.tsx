
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTax } from '@/hooks/useTaxes';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateTaxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (taxId: string) => void;
  taxType?: 'sales' | 'purchase' | 'both';
}

const taxSchema = z.object({
  tax_name: z.string().min(1, 'Tax name is required'),
  tax_rate: z.coerce.number().min(0, 'Rate must be 0 or greater').max(100, 'Rate cannot exceed 100%'),
  tax_type: z.enum(['sales', 'purchase', 'both']),
});

type TaxFormData = z.infer<typeof taxSchema>;

export const QuickCreateTax = ({
  open,
  onOpenChange,
  onSuccess,
  taxType = 'sales',
}: QuickCreateTaxProps) => {
  const createTax = useCreateTax();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      tax_type: taxType,
      tax_rate: 20, // Default VAT rate
    },
  });

  const onSubmit = async (data: TaxFormData) => {
    try {
      const result = await createTax.mutateAsync({
        tax_name: data.tax_name,
        tax_rate: data.tax_rate,
        tax_type: data.tax_type,
        is_active: true,
      });

      toast.success('Tax created successfully');
      reset();
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      console.error('Failed to create tax:', error);
      toast.error('Failed to create tax');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Tax</DialogTitle>
          <DialogDescription>
            Add a new tax rate. You can edit details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="tax_name">Tax Name *</Label>
            <Input
              id="tax_name"
              {...register('tax_name')}
              placeholder="e.g., VAT 20%, GST"
              autoFocus
            />
            {errors.tax_name && (
              <p className="text-sm text-red-600 mt-1">{errors.tax_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tax_rate">Tax Rate (%) *</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              {...register('tax_rate')}
              placeholder="20.00"
            />
            {errors.tax_rate && (
              <p className="text-sm text-red-600 mt-1">{errors.tax_rate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tax_type">Tax Type *</Label>
            <NativeSelect id="tax_type" {...register('tax_type')}>
              <option value="sales">Sales Tax</option>
              <option value="purchase">Purchase Tax</option>
              <option value="both">Both</option>
            </NativeSelect>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Enter the tax rate as a percentage (e.g., 20 for 20% VAT)
            </p>
          </div>

          <DialogFooter>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tax
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
