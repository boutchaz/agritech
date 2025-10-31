/**
 * Worker Configuration Component
 *
 * Enhanced worker configuration with support for:
 * - Daily wage payment
 * - Monthly salary payment
 * - Piece-work (per-unit) payment
 * - Metayage (revenue share) payment
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Save,
  X,
  DollarSign,
  Calendar,
  Package,
  TrendingUp,
  Info,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import type { WorkUnit } from '@/types/work-units';

// =====================================================
// TYPES
// =====================================================

type WorkerType = 'fixed_salary' | 'daily_worker' | 'metayage';
type PaymentFrequency = 'monthly' | 'daily' | 'per_task' | 'harvest_share' | 'per_unit';

interface WorkerPaymentConfig {
  worker_type: WorkerType;
  payment_frequency: PaymentFrequency;

  // Traditional rates
  daily_rate?: number;
  monthly_salary?: number;

  // Unit-based payment
  default_work_unit_id?: string;
  rate_per_unit?: number;

  // Metayage
  metayage_percentage?: number;
}

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const workerPaymentSchema = z.object({
  worker_type: z.enum(['fixed_salary', 'daily_worker', 'metayage']),
  payment_frequency: z.enum(['monthly', 'daily', 'per_task', 'harvest_share', 'per_unit']),

  daily_rate: z.number().nonnegative().optional(),
  monthly_salary: z.number().nonnegative().optional(),

  default_work_unit_id: z.string().uuid().optional().or(z.literal('')),
  rate_per_unit: z.number().nonnegative().optional(),

  metayage_percentage: z.number().min(0).max(100).optional(),
}).refine((data) => {
  // Validate based on worker type
  if (data.worker_type === 'fixed_salary' && data.payment_frequency === 'monthly') {
    return data.monthly_salary && data.monthly_salary > 0;
  }
  if (data.worker_type === 'daily_worker' && data.payment_frequency === 'daily') {
    return data.daily_rate && data.daily_rate > 0;
  }
  if (data.payment_frequency === 'per_unit') {
    return data.default_work_unit_id && data.rate_per_unit && data.rate_per_unit > 0;
  }
  if (data.worker_type === 'metayage') {
    return data.metayage_percentage && data.metayage_percentage > 0;
  }
  return true;
}, {
  message: 'Please provide the required payment configuration for the selected type',
});

type WorkerPaymentFormData = z.infer<typeof workerPaymentSchema>;

// =====================================================
// MAIN COMPONENT
// =====================================================

interface WorkerConfigurationProps {
  workerId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WorkerConfiguration({
  workerId,
  onSuccess,
  onCancel,
}: WorkerConfigurationProps) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch worker
  const { data: worker, isLoading: isLoadingWorker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workerId,
  });

  // Fetch work units
  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('work_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as WorkUnit[];
    },
    enabled: !!currentOrganization?.id,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  const updateMutation = useMutation({
    mutationFn: async (data: WorkerPaymentFormData) => {
      const { data: updatedWorker, error } = await supabase
        .from('workers')
        .update({
          worker_type: data.worker_type,
          payment_frequency: data.payment_frequency,
          daily_rate: data.daily_rate || null,
          monthly_salary: data.monthly_salary || null,
          default_work_unit_id: data.default_work_unit_id || null,
          rate_per_unit: data.rate_per_unit || null,
          metayage_percentage: data.metayage_percentage || null,
        })
        .eq('id', workerId)
        .select()
        .single();

      if (error) throw error;
      return updatedWorker;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      onSuccess?.();
    },
  });

  // =====================================================
  // FORM HANDLING
  // =====================================================

  const form = useForm<WorkerPaymentFormData>({
    resolver: zodResolver(workerPaymentSchema),
    defaultValues: {
      worker_type: worker?.worker_type || 'daily_worker',
      payment_frequency: worker?.payment_frequency || 'daily',
      daily_rate: worker?.daily_rate || undefined,
      monthly_salary: worker?.monthly_salary || undefined,
      default_work_unit_id: worker?.default_work_unit_id || '',
      rate_per_unit: worker?.rate_per_unit || undefined,
      metayage_percentage: worker?.metayage_percentage || undefined,
    },
    values: worker ? {
      worker_type: worker.worker_type,
      payment_frequency: worker.payment_frequency,
      daily_rate: worker.daily_rate || undefined,
      monthly_salary: worker.monthly_salary || undefined,
      default_work_unit_id: worker.default_work_unit_id || '',
      rate_per_unit: worker.rate_per_unit || undefined,
      metayage_percentage: worker.metayage_percentage || undefined,
    } : undefined,
  });

  const selectedWorkerType = form.watch('worker_type');
  const selectedPaymentFrequency = form.watch('payment_frequency');

  const onSubmit = (data: WorkerPaymentFormData) => {
    updateMutation.mutate(data);
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const renderPaymentFields = () => {
    // Per-unit payment
    if (selectedPaymentFrequency === 'per_unit') {
      return (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Piece-Work Payment</h4>
              <p className="text-sm text-blue-700">
                Worker is paid based on units completed (trees, boxes, kg, etc.)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="default_work_unit_id"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium">Default Work Unit *</label>
                  <Select {...field}>
                    <option value="">Select unit...</option>
                    {workUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </Select>
                  {form.formState.errors.default_work_unit_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.default_work_unit_id.message}
                    </p>
                  )}
                  {workUnits.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      <Info className="inline h-3 w-3 mr-1" />
                      No work units available. Please create work units first.
                    </p>
                  )}
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="rate_per_unit"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium">
                    Rate per Unit * ({currentOrganization?.currency || 'MAD'})
                  </label>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 5.00"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                  />
                  {form.formState.errors.rate_per_unit && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.rate_per_unit.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Example:</strong> If rate is {form.watch('rate_per_unit') || '5'}{' '}
              {currentOrganization?.currency || 'MAD'} per unit and worker completes 100 units,
              they earn {(form.watch('rate_per_unit') || 5) * 100}{' '}
              {currentOrganization?.currency || 'MAD'}.
            </p>
          </div>
        </Card>
      );
    }

    // Daily wage
    if (selectedWorkerType === 'daily_worker' && selectedPaymentFrequency === 'daily') {
      return (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Daily Wage</h4>
              <p className="text-sm text-green-700">
                Worker is paid a fixed amount per day worked
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="daily_rate"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">
                  Daily Rate * ({currentOrganization?.currency || 'MAD'})
                </label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150.00"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                />
                {form.formState.errors.daily_rate && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.daily_rate.message}
                  </p>
                )}
              </div>
            )}
          />
        </Card>
      );
    }

    // Monthly salary
    if (selectedWorkerType === 'fixed_salary' && selectedPaymentFrequency === 'monthly') {
      return (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900">Monthly Salary</h4>
              <p className="text-sm text-purple-700">
                Worker receives a fixed monthly salary
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="monthly_salary"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">
                  Monthly Salary * ({currentOrganization?.currency || 'MAD'})
                </label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 4500.00"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                />
                {form.formState.errors.monthly_salary && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.monthly_salary.message}
                  </p>
                )}
              </div>
            )}
          />
        </Card>
      );
    }

    // Metayage
    if (selectedWorkerType === 'metayage') {
      return (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h4 className="font-semibold text-orange-900">Metayage (Revenue Share)</h4>
              <p className="text-sm text-orange-700">
                Worker receives a percentage of harvest revenue
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="metayage_percentage"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">Revenue Share Percentage * (%)</label>
                <Input
                  {...field}
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="e.g., 30"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                />
                {form.formState.errors.metayage_percentage && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.metayage_percentage.message}
                  </p>
                )}
              </div>
            )}
          />

          <div className="mt-3 p-3 bg-orange-100 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Example:</strong> If harvest revenue is 10,000{' '}
              {currentOrganization?.currency || 'MAD'} and share is{' '}
              {form.watch('metayage_percentage') || 30}%, worker earns{' '}
              {((form.watch('metayage_percentage') || 30) / 100) * 10000}{' '}
              {currentOrganization?.currency || 'MAD'}.
            </p>
          </div>
        </Card>
      );
    }

    return null;
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (isLoadingWorker) {
    return <Card className="p-6"><p className="text-center">Loading...</p></Card>;
  }

  if (!worker) {
    return (
      <Card className="p-6">
        <p className="text-center text-red-500">Worker not found</p>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Worker Info */}
      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
        <div className="p-2 bg-primary/10 rounded-lg">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">
            {worker.first_name} {worker.last_name}
          </h3>
          <p className="text-sm text-muted-foreground">Payment Configuration</p>
        </div>
      </div>

      {/* Worker Type */}
      <FormField
        control={form.control}
        name="worker_type"
        render={({ field }) => (
          <div>
            <label className="text-sm font-medium">Worker Type *</label>
            <Select {...field}>
              <option value="daily_worker">Daily Worker</option>
              <option value="fixed_salary">Permanent (Fixed Salary)</option>
              <option value="metayage">Metayage (Revenue Share)</option>
            </Select>
          </div>
        )}
      />

      {/* Payment Frequency */}
      <FormField
        control={form.control}
        name="payment_frequency"
        render={({ field }) => (
          <div>
            <label className="text-sm font-medium">Payment Frequency *</label>
            <Select {...field}>
              {selectedWorkerType === 'daily_worker' && (
                <>
                  <option value="daily">Daily</option>
                  <option value="per_unit">Per Unit (Piece-work)</option>
                </>
              )}
              {selectedWorkerType === 'fixed_salary' && (
                <>
                  <option value="monthly">Monthly</option>
                  <option value="per_unit">Per Unit (Piece-work)</option>
                </>
              )}
              {selectedWorkerType === 'metayage' && (
                <option value="harvest_share">Harvest Share</option>
              )}
            </Select>
          </div>
        )}
      />

      {/* Payment Configuration */}
      {renderPaymentFields()}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {updateMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {updateMutation.error?.message || 'Failed to update payment configuration'}
          </p>
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">Payment configuration updated successfully!</p>
        </div>
      )}
    </form>
  );
}
