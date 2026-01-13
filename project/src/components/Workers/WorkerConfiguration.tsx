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
import { useTranslation } from 'react-i18next';
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

import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { workersApi } from '@/lib/api/workers';
import { workUnitsApi } from '@/lib/api/work-units';

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
  message: 'workers.configuration.errors.paymentConfigurationRequired',
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
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch worker
  const { data: worker, isLoading: isLoadingWorker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return await workersApi.getById(currentOrganization.id, workerId);
    },
    enabled: !!workerId && !!currentOrganization?.id,
  });

  // Fetch work units
  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const data = await workUnitsApi.getAll(
        { is_active: true },
        currentOrganization.id
      );
      return data as WorkUnit[];
    },
    enabled: !!currentOrganization?.id,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  const updateMutation = useMutation({
    mutationFn: async (data: WorkerPaymentFormData) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const updateData: any = {
        worker_type: data.worker_type,
        payment_frequency: data.payment_frequency,
        daily_rate: data.daily_rate || undefined,
        monthly_salary: data.monthly_salary || undefined,
        default_work_unit_id: data.default_work_unit_id || undefined,
        rate_per_unit: data.rate_per_unit || undefined,
        metayage_percentage: data.metayage_percentage || undefined,
      };

      return await workersApi.update(workerId, updateData, currentOrganization.id);
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
              <h4 className="font-semibold text-blue-900">{t('workers.configuration.sections.pieceWork')}</h4>
              <p className="text-sm text-blue-700">
                {t('workers.configuration.descriptions.pieceWork')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="default_work_unit_id"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium">{t('workers.configuration.fields.defaultWorkUnit')}</label>
                  <Select {...field}>
                    <option value="">{t('workers.configuration.placeholders.selectUnit')}</option>
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
                      {t('workers.configuration.messages.noWorkUnits')}
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
                    {t('workers.configuration.fields.ratePerUnit', { currency: currentOrganization?.currency || 'MAD' })}
                  </label>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t('workers.configuration.placeholders.ratePerUnit')}
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
              <strong>{t('workers.configuration.examples.label')}:</strong> {t('workers.configuration.examples.pieceWork', {
                rate: form.watch('rate_per_unit') || '5',
                currency: currentOrganization?.currency || 'MAD',
                total: (form.watch('rate_per_unit') || 5) * 100
              })}
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
              <h4 className="font-semibold text-green-900">{t('workers.configuration.sections.dailyWage')}</h4>
              <p className="text-sm text-green-700">
                {t('workers.configuration.descriptions.dailyWage')}
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="daily_rate"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">
                  {t('workers.configuration.fields.dailyRate', { currency: currentOrganization?.currency || 'MAD' })}
                </label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('workers.configuration.placeholders.dailyRate')}
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
              <h4 className="font-semibold text-purple-900">{t('workers.configuration.sections.monthlySalary')}</h4>
              <p className="text-sm text-purple-700">
                {t('workers.configuration.descriptions.monthlySalary')}
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="monthly_salary"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">
                  {t('workers.configuration.fields.monthlySalary', { currency: currentOrganization?.currency || 'MAD' })}
                </label>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('workers.configuration.placeholders.monthlySalary')}
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
              <h4 className="font-semibold text-orange-900">{t('workers.configuration.sections.metayage')}</h4>
              <p className="text-sm text-orange-700">
                {t('workers.configuration.descriptions.metayage')}
              </p>
            </div>
          </div>

          <FormField
            control={form.control}
            name="metayage_percentage"
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium">{t('workers.configuration.fields.metayagePercentage')}</label>
                <Input
                  {...field}
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder={t('workers.configuration.placeholders.metayagePercentage')}
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
              <strong>{t('workers.configuration.examples.label')}:</strong> {t('workers.configuration.examples.metayage', {
                revenue: '10,000',
                currency: currentOrganization?.currency || 'MAD',
                percentage: form.watch('metayage_percentage') || 30,
                earnings: ((form.watch('metayage_percentage') || 30) / 100) * 10000
              })}
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
    return <Card className="p-6"><p className="text-center">{t('workers.configuration.states.loading')}</p></Card>;
  }

  if (!worker) {
    return (
      <Card className="p-6">
        <p className="text-center text-red-500">{t('workers.configuration.states.notFound')}</p>
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
          <p className="text-sm text-muted-foreground">{t('workers.configuration.title')}</p>
        </div>
      </div>

      {/* Worker Type */}
      <FormField
        control={form.control}
        name="worker_type"
        render={({ field }) => (
          <div>
            <label className="text-sm font-medium">{t('workers.configuration.fields.workerType')}</label>
            <Select {...field}>
              <option value="daily_worker">{t('workers.configuration.workerTypes.dailyWorker')}</option>
              <option value="fixed_salary">{t('workers.configuration.workerTypes.fixedSalary')}</option>
              <option value="metayage">{t('workers.configuration.workerTypes.metayage')}</option>
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
            <label className="text-sm font-medium">{t('workers.configuration.fields.paymentFrequency')}</label>
            <Select {...field}>
              {selectedWorkerType === 'daily_worker' && (
                <>
                  <option value="daily">{t('workers.configuration.paymentFrequencies.daily')}</option>
                  <option value="per_unit">{t('workers.configuration.paymentFrequencies.perUnit')}</option>
                </>
              )}
              {selectedWorkerType === 'fixed_salary' && (
                <>
                  <option value="monthly">{t('workers.configuration.paymentFrequencies.monthly')}</option>
                  <option value="per_unit">{t('workers.configuration.paymentFrequencies.perUnit')}</option>
                </>
              )}
              {selectedWorkerType === 'metayage' && (
                <option value="harvest_share">{t('workers.configuration.paymentFrequencies.harvestShare')}</option>
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
            {t('workers.configuration.buttons.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? t('workers.configuration.states.saving') : t('workers.configuration.buttons.save')}
        </Button>
      </div>

      {updateMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {updateMutation.error?.message || t('workers.configuration.errors.updateFailed')}
          </p>
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{t('workers.configuration.messages.success')}</p>
        </div>
      )}
    </form>
  );
}
