import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useCreateYieldHistory } from '@/hooks/useProductionIntelligence';
import { useFarms, useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { toast } from 'sonner';

const yieldSchema = z.object({
  farm_id: z.string().min(1, 'Farm is required'),
  parcel_id: z.string().min(1, 'Parcel is required'),
  crop_type: z.string().min(1, 'Crop type is required'),
  variety: z.string().optional(),
  harvest_date: z.string().min(1, 'Harvest date is required'),
  actual_yield_quantity: z.number().min(0, 'Yield must be positive'),
  unit_of_measure: z.string().default('kg'),
  quality_grade: z.string().optional(),
  target_yield_quantity: z.number().optional(),
  revenue_amount: z.number().optional(),
  cost_amount: z.number().optional(),
  notes: z.string().optional(),
});

type YieldFormData = z.infer<typeof yieldSchema>;

interface YieldHistoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const YieldHistoryForm: React.FC<YieldHistoryFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentOrganization, currentFarm } = useAuth();
  const createYield = useCreateYieldHistory();
  const { data: farms = [] } = useFarms(currentOrganization?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<YieldFormData>({
    resolver: zodResolver(yieldSchema),
    defaultValues: {
      farm_id: currentFarm?.id || '',
      harvest_date: new Date().toISOString().split('T')[0],
      unit_of_measure: 'kg',
    },
  });

  const selectedFarmId = watch('farm_id');
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || null);

  const onSubmit = async (data: YieldFormData) => {
    try {
      await createYield.mutateAsync(data as any);
      toast.success('Yield history recorded successfully');
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating yield history:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record yield');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Yield History</DialogTitle>
          <DialogDescription>
            Record actual harvest yields to track performance against targets
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Farm and Parcel Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="farm_id">Farm *</Label>
              <Select
                id="farm_id"
                {...register('farm_id')}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  register('farm_id').onChange(e);
                }}
              >
                <option value="">Select farm</option>
                {farms?.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
              {errors.farm_id && (
                <p className="text-sm text-red-600 mt-1">{errors.farm_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="parcel_id">Parcel *</Label>
              <Select id="parcel_id" {...register('parcel_id')} disabled={!selectedFarmId}>
                <option value="">Select parcel</option>
                {parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </option>
                ))}
              </Select>
              {errors.parcel_id && (
                <p className="text-sm text-red-600 mt-1">{errors.parcel_id.message}</p>
              )}
            </div>
          </div>

          {/* Crop Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="crop_type">Crop Type *</Label>
              <Input id="crop_type" {...register('crop_type')} placeholder="e.g., Wheat, Tomatoes" />
              {errors.crop_type && (
                <p className="text-sm text-red-600 mt-1">{errors.crop_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="variety">Variety (Optional)</Label>
              <Input id="variety" {...register('variety')} placeholder="e.g., Winter Wheat" />
            </div>
          </div>

          {/* Harvest Date */}
          <div>
            <Label htmlFor="harvest_date">Harvest Date *</Label>
            <Input type="date" id="harvest_date" {...register('harvest_date')} />
            {errors.harvest_date && (
              <p className="text-sm text-red-600 mt-1">{errors.harvest_date.message}</p>
            )}
          </div>

          {/* Yield Data */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="actual_yield_quantity">Actual Yield *</Label>
              <Input
                type="number"
                step="0.01"
                id="actual_yield_quantity"
                {...register('actual_yield_quantity', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.actual_yield_quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.actual_yield_quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit_of_measure">Unit</Label>
              <Select id="unit_of_measure" {...register('unit_of_measure')}>
                <option value="kg">kg</option>
                <option value="tons">tons</option>
                <option value="lbs">lbs</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quality_grade">Quality Grade (Optional)</Label>
              <Select id="quality_grade" {...register('quality_grade')}>
                <option value="">Not specified</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_yield_quantity">Target Yield (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                id="target_yield_quantity"
                {...register('target_yield_quantity', { valueAsNumber: true })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                If not provided, will use benchmark if available
              </p>
            </div>
          </div>

          {/* Financial Data */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Financial Data (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="revenue_amount">Revenue ({currentOrganization?.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="revenue_amount"
                  {...register('revenue_amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="cost_amount">Cost ({currentOrganization?.currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="cost_amount"
                  {...register('cost_amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional observations..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createYield.isPending}>
              {createYield.isPending ? 'Saving...' : 'Record Yield'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
