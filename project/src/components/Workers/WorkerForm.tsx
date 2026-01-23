import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, UserPlus, AlertCircle, X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Worker, WorkerFormData } from '../../types/workers';
import {
  WORKER_TYPE_OPTIONS,
  METAYAGE_TYPE_OPTIONS,
  CALCULATION_BASIS_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
} from '../../types/workers';
import { useCreateWorker, useUpdateWorker } from '../../hooks/useWorkers';
import { useCurrency } from '../../hooks/useCurrency';
import { useFormErrors } from '../../hooks/useFormErrors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';

// Zod schema factory function with conditional validation
const createWorkerSchema = (t: any) => z.object({
  first_name: z.string().min(2, t('workers.form.validation.firstNameMin')),
  last_name: z.string().min(2, t('workers.form.validation.lastNameMin')),
  cin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(t('workers.form.validation.emailInvalid')).optional().or(z.literal('')),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  worker_type: z.enum(['fixed_salary', 'daily_worker', 'metayage']),
  position: z.string().optional(),
  hire_date: z.string(),
  farm_id: z.string().optional(),
  is_cnss_declared: z.boolean().default(false),
  cnss_number: z.string().optional(),
  monthly_salary: z.number().positive().optional(),
  daily_rate: z.number().positive().optional(),
  metayage_type: z.enum(['khammass', 'rebaa', 'tholth', 'custom']).optional(),
  metayage_percentage: z.number().min(0).max(50).optional(),
  calculation_basis: z.enum(['gross_revenue', 'net_revenue']).optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  payment_frequency: z.enum(['monthly', 'daily', 'per_task', 'harvest_share']).optional(),
  bank_account: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validation based on worker type
  if (data.worker_type === 'fixed_salary' && !data.monthly_salary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['monthly_salary'],
      message: t('workers.form.validation.monthlySalaryRequired'),
    });
  }
  if (data.worker_type === 'daily_worker' && !data.daily_rate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['daily_rate'],
      message: t('workers.form.validation.dailyRateRequired'),
    });
  }
  if (data.worker_type === 'metayage') {
    if (!data.metayage_percentage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metayage_percentage'],
        message: t('workers.form.validation.metayagePercentageRequired'),
      });
    }
    if (!data.metayage_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metayage_type'],
        message: t('workers.form.validation.metayageTypeRequired'),
      });
    }
  }
});

interface WorkerFormProps {
  open: boolean;
  worker?: Worker | null;
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess?: () => void;
}

const WorkerForm: React.FC<WorkerFormProps> = ({
  open,
  worker,
  organizationId,
  farms,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { handleFormError } = useFormErrors<WorkerFormData>();
  const isEditing = !!worker;

  // Ensure farms is always an array
  const farmsArray = Array.isArray(farms) ? farms : [];
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const { symbol: currencySymbol } = useCurrency();

  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');
  const [grantPlatformAccess, setGrantPlatformAccess] = useState(!!worker?.user_id);
  const [platformAccessLoading, setPlatformAccessLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(createWorkerSchema(t)),
    mode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
      worker_type: 'fixed_salary',
      hire_date: new Date().toISOString().split('T')[0],
      is_cnss_declared: false,
      specialties: [],
      certifications: [],
    },
  });

  // Reset form when worker prop changes (for editing)
  useEffect(() => {
    if (worker) {
      reset({
        first_name: worker.first_name,
        last_name: worker.last_name,
        cin: worker.cin || '',
        phone: worker.phone || '',
        email: worker.email || '',
        address: worker.address || '',
        date_of_birth: worker.date_of_birth || '',
        worker_type: worker.worker_type,
        position: worker.position || '',
        hire_date: worker.hire_date,
        farm_id: worker.farm_id || '',
        is_cnss_declared: worker.is_cnss_declared,
        cnss_number: worker.cnss_number || '',
        monthly_salary: worker.monthly_salary,
        daily_rate: worker.daily_rate,
        metayage_type: worker.metayage_type,
        metayage_percentage: worker.metayage_percentage,
        calculation_basis: worker.calculation_basis,
        specialties: worker.specialties || [],
        certifications: worker.certifications || [],
        payment_frequency: worker.payment_frequency,
        bank_account: worker.bank_account || '',
        payment_method: worker.payment_method || '',
        notes: worker.notes || '',
      });
      setGrantPlatformAccess(!!worker.user_id);
    } else {
      reset({
        first_name: '',
        last_name: '',
        cin: '',
        phone: '',
        email: '',
        address: '',
        date_of_birth: '',
        worker_type: 'fixed_salary',
        position: '',
        hire_date: new Date().toISOString().split('T')[0],
        farm_id: '',
        is_cnss_declared: false,
        cnss_number: '',
        monthly_salary: undefined,
        daily_rate: undefined,
        metayage_type: undefined,
        metayage_percentage: undefined,
        calculation_basis: undefined,
        specialties: [],
        certifications: [],
        payment_frequency: undefined,
        bank_account: '',
        payment_method: '',
        notes: '',
      });
      setGrantPlatformAccess(false);
    }
  }, [worker, open, reset]);

  const watchEmail = watch('email');
  const workerType = watch('worker_type');
  const metayageType = watch('metayage_type');
  const metayagePercentage = watch('metayage_percentage');
  const isCnssDecl = watch('is_cnss_declared');
  const specialties = watch('specialties') || [];
  const certifications = watch('certifications') || [];

  // Clear compensation fields when worker type changes
  useEffect(() => {
    if (!isEditing) {
      if (workerType === 'fixed_salary') {
        setValue('daily_rate', undefined);
        setValue('metayage_percentage', undefined);
        setValue('metayage_type', undefined);
      } else if (workerType === 'daily_worker') {
        setValue('monthly_salary', undefined);
        setValue('metayage_percentage', undefined);
        setValue('metayage_type', undefined);
      } else if (workerType === 'metayage') {
        setValue('monthly_salary', undefined);
        setValue('daily_rate', undefined);
      }
    }
  }, [workerType, isEditing, setValue]);

  useEffect(() => {
    if (!isEditing && workerType === 'metayage') {
      if (!metayageType) {
        setValue('metayage_type', 'khammass'); // Default to khammass
      }
      if (!metayagePercentage) {
        setValue('metayage_percentage', 20); // Default 20% for khammass
      }
    }
  }, [workerType, metayageType, metayagePercentage, isEditing, setValue]);

  // Auto-fill percentage when métayage type changes
  useEffect(() => {
    if (workerType === 'metayage' && metayageType) {
      const option = METAYAGE_TYPE_OPTIONS.find(o => o.value === metayageType);
      if (option && option.value !== 'custom') {
        setValue('metayage_percentage', option.percentage);
      }
    }
  }, [metayageType, workerType, setValue]);

  // Validate email when platform access is enabled
  useEffect(() => {
    if (grantPlatformAccess && !watchEmail) {
      setError('email', {
        type: 'manual',
        message: t('workers.form.validation.emailRequiredForPlatformAccess'),
      });
    } else if (!grantPlatformAccess && errors.email?.type === 'manual') {
      // Clear the manual error if platform access is disabled
      clearErrors('email');
    }
  }, [grantPlatformAccess, watchEmail]);

  const onSubmit = async (data: WorkerFormData) => {
    try {
      let workerId = worker?.id;

      // Clean up empty strings - convert them to undefined for optional fields
      // This ensures backend validation passes (empty string != valid email/UUID/date)
      const cleanedData = {
        ...data,
        email: data.email?.trim() || undefined,
        date_of_birth: data.date_of_birth?.trim() || undefined,
        farm_id: data.farm_id?.trim() || undefined,
        cin: data.cin?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
        position: data.position?.trim() || undefined,
        cnss_number: data.cnss_number?.trim() || undefined,
        bank_account: data.bank_account?.trim() || undefined,
        payment_method: data.payment_method?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      // 1. Create or update the worker
      if (isEditing) {
        await updateWorker.mutateAsync({ id: worker.id, organizationId, data: cleanedData });
      } else {
        const result = await createWorker.mutateAsync({ ...cleanedData, organization_id: organizationId });
        workerId = result.id;
      }

      // 2. Grant platform access if requested and worker doesn't have it yet
      if (grantPlatformAccess && cleanedData.email && workerId && !worker?.user_id) {
        setPlatformAccessLoading(true);

        try {
          const { apiClient } = await import('../../lib/api-client');

          const result = await apiClient.post<{ success: boolean; message: string; tempPassword?: string }>(
            `/organizations/${organizationId}/workers/${workerId}/grant-platform-access`,
            {
              email: cleanedData.email,
              first_name: cleanedData.first_name,
              last_name: cleanedData.last_name,
            },
            {},
            organizationId
          );

          if (result.success) {
            // Show the temporary password to the user
            const passwordMsg = result.tempPassword
              ? `${t('workers.form.success.workerCreatedWithAccess')}. ${t('workers.form.success.temporaryPassword')}: ${result.tempPassword}`
              : result.message;
            toast.success(passwordMsg);
          } else {
            console.error('Failed to grant platform access');
            toast.error(t('workers.form.errors.workerCreatedAccessFailedTryUsers'));
          }
        } catch (error: unknown) {
          // Use generic error handler
          handleFormError(error, setError, {
            toastMessage: t('workers.form.errors.workerCreatedButAccessFailed'),
          });

          // Don't close the dialog on error
          setPlatformAccessLoading(false);
          return; // Exit early, don't call onSuccess/onClose
        } finally {
          setPlatformAccessLoading(false);
        }
      }

      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      // Use generic error handler for worker create/update errors
      handleFormError(error, setError);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setValue('specialties', [...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setValue('specialties', specialties.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    if (certificationInput.trim() && !certifications.includes(certificationInput.trim())) {
      setValue('certifications', [...certifications, certificationInput.trim()]);
      setCertificationInput('');
    }
  };

  const removeCertification = (index: number) => {
    setValue('certifications', certifications.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <span>{isEditing ? t('workers.form.title.edit') : t('workers.form.title.add')}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                    {t('workers.form.errors.correctFollowingErrors')}
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>
                        {error?.message || `${t('workers.form.errors.errorInField')}: ${field}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Worker Type */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('workers.form.fields.workerType')} *
            </label>
            <select
              {...register('worker_type')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {WORKER_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.labelFr}
                </option>
              ))}
            </select>
            {errors.worker_type && (
              <p className="text-red-600 text-sm mt-1">{errors.worker_type.message}</p>
            )}
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('workers.form.sections.personalInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.firstName')} *
                </label>
                <input
                  {...register('first_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.firstName')}
                />
                {errors.first_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.lastName')} *
                </label>
                <input
                  {...register('last_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.lastName')}
                />
                {errors.last_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.cin')}
                </label>
                <input
                  {...register('cin')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.cin')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.phone')}
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.phone')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.email')}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.email')}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.dateOfBirth')}
                </label>
                <input
                  {...register('date_of_birth')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.address')}
                </label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.address')}
                />
              </div>
            </div>
          </div>

          {/* Platform Access */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {t('workers.form.sections.platformAccess')}
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantPlatformAccess}
                      onChange={(e) => setGrantPlatformAccess(e.target.checked)}
                      disabled={platformAccessLoading || (isEditing && !!worker?.user_id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  {grantPlatformAccess
                    ? t('workers.form.platformAccess.enabled')
                    : t('workers.form.platformAccess.disabled')}
                </p>

                {grantPlatformAccess && !watchEmail && (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {t('workers.form.platformAccess.emailRequired')}
                    </p>
                  </div>
                )}

                {isEditing && worker?.user_id && (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t('workers.form.platformAccess.alreadyHasAccess')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('workers.form.sections.employmentDetails')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.position')}
                </label>
                <input
                  {...register('position')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.position')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.farm')}
                </label>
                <select
                  {...register('farm_id')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('workers.form.options.noFarm')}</option>
                  {farmsArray.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {farmsArray.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('workers.form.validation.noFarmAvailable')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.hireDate')} *
                </label>
                <input
                  {...register('hire_date')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.hire_date && (
                  <p className="text-red-600 text-sm mt-1">{errors.hire_date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* CNSS */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <input
                {...register('is_cnss_declared')}
                type="checkbox"
                id="is_cnss_declared"
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_cnss_declared" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('workers.form.fields.declaredToCNSS')}
              </label>
            </div>
            {isCnssDecl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.cnssNumber')}
                </label>
                <input
                  {...register('cnss_number')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.cnssNumber')}
                />
              </div>
            )}
          </div>

          {/* Compensation - Conditional based on worker type */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('workers.form.sections.compensation')}
            </h3>

            {/* Fixed Salary */}
            {workerType === 'fixed_salary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.monthlySalary', { currency: currencySymbol })} *
                </label>
                <input
                  {...register('monthly_salary', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.monthlySalary')}
                />
                {errors.monthly_salary && (
                  <p className="text-red-600 text-sm mt-1">{errors.monthly_salary.message}</p>
                )}
              </div>
            )}

            {/* Daily Worker */}
            {workerType === 'daily_worker' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.dailyRate', { currency: currencySymbol })} *
                </label>
                <input
                  {...register('daily_rate', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.dailyRate')}
                />
                {errors.daily_rate && (
                  <p className="text-red-600 text-sm mt-1">{errors.daily_rate.message}</p>
                )}
              </div>
            )}

            {/* Métayage */}
            {workerType === 'metayage' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('workers.form.fields.metayageType')} *
                    </label>
                    <select
                      {...register('metayage_type')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {METAYAGE_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.metayage_type && (
                      <p className="text-red-600 text-sm mt-1">{errors.metayage_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('workers.form.fields.metayagePercentage')} *
                    </label>
                    <input
                      {...register('metayage_percentage', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder={t('workers.form.placeholders.metayagePercentage')}
                    />
                    {errors.metayage_percentage && (
                      <p className="text-red-600 text-sm mt-1">{errors.metayage_percentage.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('workers.form.fields.calculationBasis')}
                  </label>
                  <select
                    {...register('calculation_basis')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {CALCULATION_BASIS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.labelFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">ℹ️ {t('workers.form.metayageInfo.title')}</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>{t('workers.form.metayageInfo.khammass.title')}:</strong> {t('workers.form.metayageInfo.khammass.description')}</li>
                    <li><strong>{t('workers.form.metayageInfo.rebaa.title')}:</strong> {t('workers.form.metayageInfo.rebaa.description')}</li>
                    <li><strong>{t('workers.form.metayageInfo.tholth.title')}:</strong> {t('workers.form.metayageInfo.tholth.description')}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Payment Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('workers.form.sections.paymentSettings')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.paymentFrequency')}
                </label>
                <select
                  {...register('payment_frequency')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('workers.form.options.select')}</option>
                  {PAYMENT_FREQUENCY_OPTIONS.map(option => {
                    // Conditional display based on worker type
                    // "per_task" only for daily workers
                    // "monthly" only for fixed salary
                    // "harvest_share" only for metayage
                    // "daily" for daily workers and fixed salary

                    if (option.value === 'per_task' && workerType !== 'daily_worker') {
                      return null; // Hide "À la tâche" for non-daily workers
                    }
                    if (option.value === 'monthly' && workerType !== 'fixed_salary') {
                      return null; // Hide "Mensuel" for non-salaried workers
                    }
                    if (option.value === 'harvest_share' && workerType !== 'metayage') {
                      return null; // Hide "Partage de récolte" for non-metayage workers
                    }
                    if (option.value === 'daily' && workerType === 'metayage') {
                      return null; // Hide "Journalier" for metayage workers
                    }

                    return (
                      <option key={option.value} value={option.value}>
                        {option.labelFr}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {workerType === 'fixed_salary' && t('workers.form.paymentFrequencyHint.fixedSalary')}
                  {workerType === 'daily_worker' && t('workers.form.paymentFrequencyHint.dailyWorker')}
                  {workerType === 'metayage' && t('workers.form.paymentFrequencyHint.metayage')}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.paymentMethod')}
                </label>
                <select
                  {...register('payment_method')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('workers.form.options.select')}</option>
                  <option value="cash">{t('workers.form.paymentMethods.cash')}</option>
                  <option value="bank_transfer">{t('workers.form.paymentMethods.bankTransfer')}</option>
                  <option value="check">{t('workers.form.paymentMethods.check')}</option>
                  <option value="mobile_money">{t('workers.form.paymentMethods.mobileMoney')}</option>
                </select>
              </div>

              {/* Bank Account (conditional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.form.fields.bankAccount')}
                </label>
                <input
                  {...register('bank_account')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.bankAccount')}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('workers.form.bankAccountHint')}
                </p>
              </div>
            </div>

            {/* Payment frequency info box - conditional based on worker type */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">ℹ️ {t('workers.form.paymentFrequencyInfo.title')}:</p>
              <ul className="list-disc list-inside space-y-1">
                {workerType === 'fixed_salary' && (
                  <>
                    <li><strong>{t('workers.form.paymentFrequencyInfo.monthly')}:</strong> {t('workers.form.paymentFrequencyInfo.monthlyDescription')}</li>
                    <li><strong>{t('workers.form.paymentFrequencyInfo.daily')}:</strong> {t('workers.form.paymentFrequencyInfo.dailyDescription')}</li>
                  </>
                )}
                {workerType === 'daily_worker' && (
                  <>
                    <li><strong>{t('workers.form.paymentFrequencyInfo.daily')}:</strong> {t('workers.form.paymentFrequencyInfo.dailyWorkerDailyDescription')}</li>
                    <li><strong>{t('workers.form.paymentFrequencyInfo.perTask')}:</strong> {t('workers.form.paymentFrequencyInfo.perTaskDescription')}</li>
                  </>
                )}
                {workerType === 'metayage' && (
                  <li><strong>{t('workers.form.paymentFrequencyInfo.harvestShare')}:</strong> {t('workers.form.paymentFrequencyInfo.harvestShareDescription')}</li>
                )}
              </ul>
            </div>
          </div>

          {/* Skills & Certifications */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {t('workers.form.sections.skillsAndCertifications')}
            </h3>

            {/* Specialties */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('workers.form.fields.specialties')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.specialties')}
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('workers.form.buttons.add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(index)}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('workers.form.fields.certifications')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={certificationInput}
                  onChange={(e) => setCertificationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.form.placeholders.certifications')}
                />
                <button
                  type="button"
                  onClick={addCertification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('workers.form.buttons.add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="hover:text-green-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('workers.form.fields.notes')}
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('workers.form.placeholders.notes')}
            />
          </div>

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              {t('workers.form.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>{t('workers.form.buttons.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>{isEditing ? t('workers.form.buttons.update') : t('workers.form.buttons.create')}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerForm;
