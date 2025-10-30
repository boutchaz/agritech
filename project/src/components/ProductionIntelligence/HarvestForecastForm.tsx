import React, { useMemo } from 'react';
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
import { useCreateHarvestForecast } from '@/hooks/useProductionIntelligence';
import { useFarms, useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { toast } from 'sonner';

const forecastSchema = z.object({
  farm_id: z.string().min(1, 'Farm is required'),
  parcel_id: z.string().min(1, 'Parcel is required'),
  crop_type: z.string().min(1, 'Crop type is required'),
  variety: z.string().optional(),
  planting_date: z.string().optional(),
  forecast_harvest_date_start: z.string().min(1, 'Start date is required'),
  forecast_harvest_date_end: z.string().min(1, 'End date is required'),
  forecast_season: z.string().optional(),
  confidence_level: z.enum(['low', 'medium', 'high']).default('medium'),
  predicted_yield_quantity: z.number().min(0, 'Predicted yield must be positive'),
  predicted_yield_per_hectare: z.number().optional(),
  unit_of_measure: z.string().default('kg'),
  predicted_quality_grade: z.string().optional(),
  min_yield_quantity: z.number().optional(),
  max_yield_quantity: z.number().optional(),
  estimated_revenue: z.number().optional(),
  estimated_cost: z.number().optional(),
  estimated_profit: z.number().optional(),
  estimated_price_per_unit: z.number().optional(),
  forecast_method: z.enum(['historical_average', 'trend_analysis', 'manual', 'ai_model']).default('manual'),
  based_on_historical_years: z.number().optional(),
  adjustment_factors: z.string().optional(), // Will be parsed as JSON
  notes: z.string().optional(),
});

type ForecastFormData = z.infer<typeof forecastSchema>;

interface HarvestForecastFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const HarvestForecastForm: React.FC<HarvestForecastFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentOrganization, currentFarm } = useAuth();
  const createForecast = useCreateHarvestForecast();
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ForecastFormData>({
    resolver: zodResolver(forecastSchema),
    defaultValues: {
      farm_id: currentFarm?.id || '',
      unit_of_measure: 'kg',
      confidence_level: 'medium',
      forecast_method: 'manual',
    },
  });

  const selectedFarmId = watch('farm_id');
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || null);

  const predictedYield = watch('predicted_yield_quantity');
  const minYield = watch('min_yield_quantity');
  const maxYield = watch('max_yield_quantity');
  const estimatedPrice = watch('estimated_price_per_unit');
  const estimatedCost = watch('estimated_cost');

  // Auto-calculate estimated revenue when price or quantity changes
  useMemo(() => {
    if (predictedYield && estimatedPrice) {
      const revenue = predictedYield * estimatedPrice;
      setValue('estimated_revenue', revenue);
    }
  }, [predictedYield, estimatedPrice, setValue]);

  // Auto-calculate estimated profit when revenue or cost changes
  useMemo(() => {
    const revenue = watch('estimated_revenue');
    if (revenue && estimatedCost) {
      setValue('estimated_profit', revenue - estimatedCost);
    }
  }, [watch('estimated_revenue'), estimatedCost, setValue, watch]);

  const onSubmit = async (data: ForecastFormData) => {
    try {
      // Validate date range
      if (new Date(data.forecast_harvest_date_end) < new Date(data.forecast_harvest_date_start)) {
        toast.error('End date must be after start date');
        return;
      }

      // Validate yield range
      if (data.min_yield_quantity && data.max_yield_quantity) {
        if (data.min_yield_quantity > data.max_yield_quantity) {
          toast.error('Minimum yield cannot exceed maximum yield');
          return;
        }
      }

      // Parse adjustment factors if provided
      let adjustmentFactors = null;
      if (data.adjustment_factors) {
        try {
          adjustmentFactors = JSON.parse(data.adjustment_factors);
        } catch (e) {
          toast.error('Invalid JSON format for adjustment factors');
          return;
        }
      }

      await createForecast.mutateAsync({
        ...data,
        currency_code: currentOrganization?.currency || 'MAD',
        status: 'pending',
        adjustment_factors: adjustmentFactors,
      } as any);

      toast.success('Harvest forecast created successfully');
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating forecast:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create forecast');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Harvest Forecast</DialogTitle>
          <DialogDescription>
            Predict future harvest yields for planning and resource allocation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Location Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="farm_id">Farm *</Label>
              <Select id="farm_id" {...register('farm_id')}>
                <option value="">Select a farm</option>
                {farms?.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </Select>
              {errors.farm_id && (
                <p className="text-sm text-red-600 mt-1">{errors.farm_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="parcel_id">Parcel *</Label>
              <Select id="parcel_id" {...register('parcel_id')} disabled={!selectedFarmId}>
                <option value="">Select a parcel</option>
                {parcels?.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>{parcel.name}</option>
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

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="planting_date">Planting Date (Optional)</Label>
              <Input type="date" id="planting_date" {...register('planting_date')} />
            </div>

            <div>
              <Label htmlFor="forecast_harvest_date_start">Forecast Start Date *</Label>
              <Input type="date" id="forecast_harvest_date_start" {...register('forecast_harvest_date_start')} />
              {errors.forecast_harvest_date_start && (
                <p className="text-sm text-red-600 mt-1">{errors.forecast_harvest_date_start.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="forecast_harvest_date_end">Forecast End Date *</Label>
              <Input type="date" id="forecast_harvest_date_end" {...register('forecast_harvest_date_end')} />
              {errors.forecast_harvest_date_end && (
                <p className="text-sm text-red-600 mt-1">{errors.forecast_harvest_date_end.message}</p>
              )}
            </div>
          </div>

          {/* Season and Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="forecast_season">Season (Optional)</Label>
              <Select id="forecast_season" {...register('forecast_season')}>
                <option value="">Select season</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="confidence_level">Confidence Level *</Label>
              <Select id="confidence_level" {...register('confidence_level')}>
                <option value="low">Low Confidence</option>
                <option value="medium">Medium Confidence</option>
                <option value="high">High Confidence</option>
              </Select>
            </div>
          </div>

          {/* Predicted Yield */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Predicted Yield</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="predicted_yield_quantity">Total Quantity *</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="predicted_yield_quantity"
                  {...register('predicted_yield_quantity', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.predicted_yield_quantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.predicted_yield_quantity.message}</p>
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

              <div>
                <Label htmlFor="predicted_yield_per_hectare">Per Hectare (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="predicted_yield_per_hectare"
                  {...register('predicted_yield_per_hectare', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Yield Range */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Yield Range (Optional)</Label>
            <p className="text-xs text-gray-500">
              Specify minimum and maximum expected yields to account for uncertainty
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="min_yield_quantity">Minimum</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="min_yield_quantity"
                  {...register('min_yield_quantity', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="max_yield_quantity">Maximum</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="max_yield_quantity"
                  {...register('max_yield_quantity', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="predicted_quality_grade">Quality Grade</Label>
                <Select id="predicted_quality_grade" {...register('predicted_quality_grade')}>
                  <option value="">Not specified</option>
                  <option value="premium">Premium</option>
                  <option value="grade_a">Grade A</option>
                  <option value="grade_b">Grade B</option>
                  <option value="grade_c">Grade C</option>
                  <option value="standard">Standard</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial Estimates */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Financial Estimates (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_price_per_unit">
                  Price per Unit ({currentOrganization?.currency || 'MAD'})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  id="estimated_price_per_unit"
                  {...register('estimated_price_per_unit', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="estimated_revenue">
                  Estimated Revenue ({currentOrganization?.currency || 'MAD'})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  id="estimated_revenue"
                  {...register('estimated_revenue', { valueAsNumber: true })}
                  placeholder="0.00"
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="estimated_cost">
                  Estimated Cost ({currentOrganization?.currency || 'MAD'})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  id="estimated_cost"
                  {...register('estimated_cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="estimated_profit">
                  Estimated Profit ({currentOrganization?.currency || 'MAD'})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  id="estimated_profit"
                  {...register('estimated_profit', { valueAsNumber: true })}
                  placeholder="0.00"
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Forecast Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="forecast_method">Forecast Method *</Label>
              <Select id="forecast_method" {...register('forecast_method')}>
                <option value="manual">Manual Estimation</option>
                <option value="historical_average">Historical Average</option>
                <option value="trend_analysis">Trend Analysis</option>
                <option value="ai_model">AI Model</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="based_on_historical_years">Based on Years of Data (Optional)</Label>
              <Input
                type="number"
                id="based_on_historical_years"
                {...register('based_on_historical_years', { valueAsNumber: true })}
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Adjustment Factors */}
          <div>
            <Label htmlFor="adjustment_factors">Adjustment Factors (Optional JSON)</Label>
            <Textarea
              id="adjustment_factors"
              {...register('adjustment_factors')}
              placeholder='{"weather": "favorable", "irrigation": "improved", "pest_risk": "low"}'
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON object describing factors affecting this forecast
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional context or assumptions for this forecast..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createForecast.isPending}>
              {createForecast.isPending ? 'Creating...' : 'Create Forecast'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
