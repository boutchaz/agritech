import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, UserPlus } from 'lucide-react';
import type { Worker, WorkerFormData } from '../../types/workers';
import {
  WORKER_TYPE_OPTIONS,
  METAYAGE_TYPE_OPTIONS,
  CALCULATION_BASIS_OPTIONS,
} from '../../types/workers';
import { useCreateWorker, useUpdateWorker } from '../../hooks/useWorkers';

// Zod schema with conditional validation
const workerSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  cin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
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
}).refine((data) => {
  // Validation based on worker type
  if (data.worker_type === 'fixed_salary' && !data.monthly_salary) {
    return false;
  }
  if (data.worker_type === 'daily_worker' && !data.daily_rate) {
    return false;
  }
  if (data.worker_type === 'metayage' && (!data.metayage_percentage || !data.metayage_type)) {
    return false;
  }
  return true;
}, {
  message: 'Informations de rémunération manquantes pour ce type de travailleur',
});

interface WorkerFormProps {
  worker?: Worker | null;
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess?: () => void;
}

const WorkerForm: React.FC<WorkerFormProps> = ({
  worker,
  organizationId,
  farms,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!worker;
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();

  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: worker ? {
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
    } : {
      first_name: '',
      last_name: '',
      worker_type: 'daily_worker',
      hire_date: new Date().toISOString().split('T')[0],
      is_cnss_declared: false,
      daily_rate: 0, // Default for daily_worker type (required by DB constraint)
      specialties: [],
      certifications: [],
    },
  });

  const workerType = watch('worker_type');
  const metayageType = watch('metayage_type');
  const dailyRate = watch('daily_rate');
  const monthlySalary = watch('monthly_salary');
  const metayagePercentage = watch('metayage_percentage');
  const isCnssDecl = watch('is_cnss_declared');
  const specialties = watch('specialties') || [];
  const certifications = watch('certifications') || [];

  // Ensure required compensation fields are set based on worker type
  useEffect(() => {
    if (!isEditing && workerType === 'daily_worker') {
      if (!dailyRate) {
        setValue('daily_rate', 0); // Required for daily_worker
      }
    }
  }, [workerType, dailyRate, isEditing, setValue]);

  useEffect(() => {
    if (!isEditing && workerType === 'fixed_salary') {
      if (!monthlySalary) {
        setValue('monthly_salary', 0); // Required for fixed_salary
      }
    }
  }, [workerType, monthlySalary, isEditing, setValue]);

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

  const onSubmit = async (data: WorkerFormData) => {
    try {
      if (isEditing) {
        await updateWorker.mutateAsync({ id: worker.id, data });
      } else {
        await createWorker.mutateAsync({ ...data, organization_id: organizationId });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving worker:', error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Modifier le travailleur' : 'Ajouter un travailleur'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Worker Type */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de travailleur *
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
              Informations personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prénom *
                </label>
                <input
                  {...register('first_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Mohamed"
                />
                {errors.first_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom *
                </label>
                <input
                  {...register('last_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Alami"
                />
                {errors.last_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CIN
                </label>
                <input
                  {...register('cin')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="AB123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Téléphone
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="+212 6XX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="exemple@email.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de naissance
                </label>
                <input
                  {...register('date_of_birth')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse
                </label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Adresse complète"
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Détails de l'emploi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Poste/Fonction
                </label>
                <input
                  {...register('position')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Tractoriste, Chef d'équipe..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ferme
                </label>
                <select
                  {...register('farm_id')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- Aucune ferme --</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date d'embauche *
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
                Déclaré à la CNSS
              </label>
            </div>
            {isCnssDecl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Numéro CNSS
                </label>
                <input
                  {...register('cnss_number')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="CNSS123456"
                />
              </div>
            )}
          </div>

          {/* Compensation - Conditional based on worker type */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Rémunération
            </h3>

            {/* Fixed Salary */}
            {workerType === 'fixed_salary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Salaire mensuel (DH) *
                </label>
                <input
                  {...register('monthly_salary', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="3000.00"
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
                  Taux journalier (DH) *
                </label>
                <input
                  {...register('daily_rate', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="120.00"
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
                      Type de métayage *
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
                      Pourcentage (%) *
                    </label>
                    <input
                      {...register('metayage_percentage', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="20.00"
                    />
                    {errors.metayage_percentage && (
                      <p className="text-red-600 text-sm mt-1">{errors.metayage_percentage.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base de calcul
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
                  <p className="font-medium mb-1">ℹ️ Informations sur le métayage:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Khammass (1/5):</strong> Le travailleur reçoit 20% de la récolte/revenu</li>
                    <li><strong>Rebâa (1/4):</strong> Le travailleur reçoit 25% de la récolte/revenu</li>
                    <li><strong>Tholth (1/3):</strong> Le travailleur reçoit 33% de la récolte/revenu</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Skills & Certifications */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Compétences et certifications
            </h3>

            {/* Specialties */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Spécialités
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Taille, Irrigation, Récolte..."
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
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
                Certifications
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={certificationInput}
                  onChange={(e) => setCertificationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Phytosanitaire, Conduite tracteur..."
                />
                <button
                  type="button"
                  onClick={addCertification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
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
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Informations supplémentaires..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Mettre à jour' : 'Créer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkerForm;
