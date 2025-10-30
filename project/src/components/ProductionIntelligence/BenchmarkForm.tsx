import React from 'react';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useCreateYieldBenchmark } from '@/hooks/useProductionIntelligence';
import { toast } from 'sonner';

const benchmarkSchema = z.object({
  crop_type: z.string().min(1, 'Crop type is required'),
  variety: z.string().optional(),
  benchmark_type: z.string().min(1, 'Benchmark type is required'),
  target_yield_per_hectare: z.number().min(0, 'Target yield must be positive'),
  unit_of_measure: z.string().default('kg'),
  excellent_threshold_percent: z.number().default(110),
  good_threshold_percent: z.number().default(95),
  acceptable_threshold_percent: z.number().default(80),
  target_revenue_per_hectare: z.number().optional(),
  target_profit_margin_percent: z.number().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type BenchmarkFormData = z.infer<typeof benchmarkSchema>;

interface BenchmarkFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BenchmarkForm: React.FC<BenchmarkFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentOrganization } = useAuth();
  const createBenchmark = useCreateYieldBenchmark();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BenchmarkFormData>({
    resolver: zodResolver(benchmarkSchema),
    defaultValues: {
      unit_of_measure: 'kg',
      excellent_threshold_percent: 110,
      good_threshold_percent: 95,
      acceptable_threshold_percent: 80,
      benchmark_type: 'organization_target',
    },
  });

  const onSubmit = async (data: BenchmarkFormData) => {
    try {
      await createBenchmark.mutateAsync(data as any);
      toast.success('Yield benchmark created successfully');
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating benchmark:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create benchmark');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Yield Benchmark</DialogTitle>
          <DialogDescription>
            Define target yields to measure performance against
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          {/* Benchmark Type */}
          <div>
            <Label htmlFor="benchmark_type">Benchmark Type *</Label>
            <Select id="benchmark_type" {...register('benchmark_type')}>
              <option value="organization_target">Organization Target</option>
              <option value="industry_standard">Industry Standard</option>
              <option value="historical_average">Historical Average</option>
              <option value="best_practice">Best Practice</option>
            </Select>
            {errors.benchmark_type && (
              <p className="text-sm text-red-600 mt-1">{errors.benchmark_type.message}</p>
            )}
          </div>

          {/* Target Yield */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="target_yield_per_hectare">Target Yield per Hectare *</Label>
              <Input
                type="number"
                step="0.01"
                id="target_yield_per_hectare"
                {...register('target_yield_per_hectare', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.target_yield_per_hectare && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.target_yield_per_hectare.message}
                </p>
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

          {/* Performance Thresholds */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Performance Thresholds</Label>
            <p className="text-xs text-gray-500">
              Define what percentage of target constitutes each rating level
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="excellent_threshold_percent">Excellent (%)</Label>
                <Input
                  type="number"
                  step="1"
                  id="excellent_threshold_percent"
                  {...register('excellent_threshold_percent', { valueAsNumber: true })}
                  placeholder="110"
                />
                <p className="text-xs text-gray-500 mt-1">≥ this % of target</p>
              </div>

              <div>
                <Label htmlFor="good_threshold_percent">Good (%)</Label>
                <Input
                  type="number"
                  step="1"
                  id="good_threshold_percent"
                  {...register('good_threshold_percent', { valueAsNumber: true })}
                  placeholder="95"
                />
                <p className="text-xs text-gray-500 mt-1">≥ this % of target</p>
              </div>

              <div>
                <Label htmlFor="acceptable_threshold_percent">Acceptable (%)</Label>
                <Input
                  type="number"
                  step="1"
                  id="acceptable_threshold_percent"
                  {...register('acceptable_threshold_percent', { valueAsNumber: true })}
                  placeholder="80"
                />
                <p className="text-xs text-gray-500 mt-1">≥ this % of target</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Below acceptable threshold = Underperforming
            </p>
          </div>

          {/* Financial Targets */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Financial Targets (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_revenue_per_hectare">
                  Revenue per Hectare ({currentOrganization?.currency})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  id="target_revenue_per_hectare"
                  {...register('target_revenue_per_hectare', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="target_profit_margin_percent">Profit Margin (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  id="target_profit_margin_percent"
                  {...register('target_profit_margin_percent', { valueAsNumber: true })}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Source and Notes */}
          <div>
            <Label htmlFor="source">Source (Optional)</Label>
            <Input
              id="source"
              {...register('source')}
              placeholder="e.g., USDA Report 2024, Internal Research"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional context for this benchmark..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBenchmark.isPending}>
              {createBenchmark.isPending ? 'Saving...' : 'Set Benchmark'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
