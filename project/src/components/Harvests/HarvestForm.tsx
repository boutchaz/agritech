import React, { useMemo, useEffect } from 'react';
import { X, Wheat, Calendar, Star, MapPin, TrendingUp, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useFarms, useParcelsByFarm } from '../../hooks/useParcelsQuery';
import { useCreateHarvest, useUpdateHarvest } from '../../hooks/useHarvests';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useFormErrors } from '../../hooks/useFormErrors';
import type { HarvestSummary, HarvestUnit, QualityGrade, HarvestStatus, IntendedFor } from '../../types/harvests';
import { Button } from '@/components/ui/button';

interface HarvestFormProps {
  harvest?: HarvestSummary | null;
  onClose: () => void;
}

const harvestSchema = z.object({
  farm_id: z.string().min(1, 'Farm is required'),
  parcel_id: z.string().min(1, 'Parcel is required'),
  harvest_date: z.string().min(1, 'Harvest date is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.enum(['kg', 'tons', 'units', 'boxes', 'crates', 'liters']),
  quality_grade: z.string().optional(),
  quality_score: z.number().optional(),
  warehouse_id: z.string().optional(),
  storage_location: z.string().optional(),
  intended_for: z.string().optional(),
  expected_price_per_unit: z.number().optional(),
  status: z.enum(['stored', 'in_delivery', 'delivered', 'sold', 'spoiled']),
  notes: z.string().optional(),
});

type HarvestFormData = z.infer<typeof harvestSchema>;

const HarvestForm: React.FC<HarvestFormProps> = ({ harvest, onClose }) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { handleFormError } = useFormErrors<HarvestFormData>();

  const UNITS = useMemo(() => [
    { value: 'kg' as HarvestUnit, label: t('harvests.form.units.kg') },
    { value: 'tons' as HarvestUnit, label: t('harvests.form.units.tons') },
    { value: 'units' as HarvestUnit, label: t('harvests.form.units.units') },
    { value: 'boxes' as HarvestUnit, label: t('harvests.form.units.boxes') },
    { value: 'crates' as HarvestUnit, label: t('harvests.form.units.crates') },
    { value: 'liters' as HarvestUnit, label: t('harvests.form.units.liters') },
  ], [t]);

  const QUALITY_GRADES = useMemo(() => [
    { value: 'Extra' as QualityGrade, label: t('harvests.form.qualityGrades.extra') },
    { value: 'A' as QualityGrade, label: t('harvests.form.qualityGrades.a') },
    { value: 'First' as QualityGrade, label: t('harvests.form.qualityGrades.first') },
    { value: 'B' as QualityGrade, label: t('harvests.form.qualityGrades.b') },
    { value: 'Second' as QualityGrade, label: t('harvests.form.qualityGrades.second') },
    { value: 'C' as QualityGrade, label: t('harvests.form.qualityGrades.c') },
    { value: 'Third' as QualityGrade, label: t('harvests.form.qualityGrades.third') },
  ], [t]);

  const STATUSES = useMemo(() => [
    { value: 'stored' as HarvestStatus, label: t('harvests.form.statuses.stored') },
    { value: 'in_delivery' as HarvestStatus, label: t('harvests.form.statuses.inDelivery') },
    { value: 'delivered' as HarvestStatus, label: t('harvests.form.statuses.delivered') },
    { value: 'sold' as HarvestStatus, label: t('harvests.form.statuses.sold') },
    { value: 'spoiled' as HarvestStatus, label: t('harvests.form.statuses.spoiled') },
  ], [t]);

  const INTENDED_FOR = useMemo(() => [
    { value: 'market' as IntendedFor, label: t('harvests.form.intendedFor.market') },
    { value: 'storage' as IntendedFor, label: t('harvests.form.intendedFor.storage') },
    { value: 'processing' as IntendedFor, label: t('harvests.form.intendedFor.processing') },
    { value: 'export' as IntendedFor, label: t('harvests.form.intendedFor.export') },
    { value: 'direct_client' as IntendedFor, label: t('harvests.form.intendedFor.directClient') },
  ], [t]);

  const { data: farms = [], isLoading: farmsLoading } = useFarms(currentOrganization?.id);
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const createMutation = useCreateHarvest();
  const updateMutation = useUpdateHarvest();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HarvestFormData>({
    resolver: zodResolver(harvestSchema),
    defaultValues: {
      farm_id: '',
      parcel_id: '',
      harvest_date: new Date().toISOString().split('T')[0],
      quantity: 0,
      unit: 'kg',
      quality_grade: '',
      quality_score: undefined,
      warehouse_id: '',
      storage_location: '',
      intended_for: '',
      expected_price_per_unit: undefined,
      status: 'stored',
      notes: '',
    },
  });

  useEffect(() => {
    if (harvest) {
      reset({
        farm_id: harvest.farm_id || '',
        parcel_id: harvest.parcel_id || '',
        harvest_date: harvest.harvest_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        quantity: harvest.quantity || 0,
        unit: harvest.unit || 'kg',
        quality_grade: harvest.quality_grade || '',
        quality_score: harvest.quality_score || undefined,
        warehouse_id: (harvest as any)?.warehouse_id || '',
        storage_location: harvest.storage_location || '',
        intended_for: harvest.intended_for || '',
        expected_price_per_unit: harvest.expected_price_per_unit || undefined,
        status: harvest.status || 'stored',
        notes: harvest.notes || '',
      });
    } else {
      reset({
        farm_id: '',
        parcel_id: '',
        harvest_date: new Date().toISOString().split('T')[0],
        quantity: 0,
        unit: 'kg',
        quality_grade: '',
        quality_score: undefined,
        warehouse_id: '',
        storage_location: '',
        intended_for: '',
        expected_price_per_unit: undefined,
        status: 'stored',
        notes: '',
      });
    }
  }, [harvest, reset]);

  const farmId = watch('farm_id');
  const quantity = watch('quantity');
  const expectedPrice = watch('expected_price_per_unit');
  const { data: parcels = [], isLoading: parcelsLoading } = useParcelsByFarm(farmId || undefined);

  const onSubmit = async (formData: HarvestFormData) => {
    if (!currentOrganization) return;

    try {
      const submitData = {
        ...formData,
        quality_score: formData.quality_score ? Number(formData.quality_score) : undefined,
        expected_price_per_unit: formData.expected_price_per_unit ? Number(formData.expected_price_per_unit) : undefined,
        quality_grade: (formData.quality_grade || undefined) as QualityGrade | undefined,
        intended_for: (formData.intended_for || undefined) as IntendedFor | undefined,
        warehouse_id: formData.warehouse_id || undefined,
        storage_location: formData.storage_location || undefined,
      };

      if (harvest) {
        const updateData = {
          farm_id: formData.farm_id,
          parcel_id: formData.parcel_id,
          harvest_date: formData.harvest_date,
          quantity: formData.quantity,
          unit: formData.unit,
          quality_grade: submitData.quality_grade,
          quality_score: submitData.quality_score,
          storage_location: submitData.storage_location,
          intended_for: submitData.intended_for,
          expected_price_per_unit: submitData.expected_price_per_unit,
          warehouse_id: submitData.warehouse_id,
          notes: formData.notes || undefined,
        };
        await updateMutation.mutateAsync({ harvestId: harvest.id, organizationId: currentOrganization.id, updates: updateData as any });
      } else {
        await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          data: {
            farm_id: formData.farm_id,
            parcel_id: formData.parcel_id,
            harvest_date: formData.harvest_date,
            quantity: formData.quantity,
            unit: formData.unit as any,
            quality_grade: submitData.quality_grade,
            quality_score: submitData.quality_score,
            storage_location: submitData.storage_location,
            intended_for: submitData.intended_for,
            expected_price_per_unit: submitData.expected_price_per_unit,
            notes: formData.notes || undefined,
            workers: [],
          }
        });
      }
      toast.success(harvest ? t('harvests.form.validation.updateSuccess') : t('harvests.form.validation.saveSuccess'));
      onClose();
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t('harvests.form.validation.saveError'),
      });
    }
  };

  const selectedParcel = parcels.find(p => p.id === watch('parcel_id'));
  const estimatedRevenue = quantity && expectedPrice
    ? (Number(quantity) * Number(expectedPrice)).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Wheat className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {harvest ? t('harvests.form.title.edit') : t('harvests.form.title.new')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('harvests.form.title.subtitle')}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
           {/* Location Section */}
           <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <MapPin className="h-4 w-4" />
               {t('harvests.form.sections.location')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.farm')} <span className="text-red-500">*</span>
                 </label>
                 <select
                   {...register('farm_id')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.farm_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                   disabled={farmsLoading}
                 >
                   <option value="">{t('harvests.form.placeholders.selectFarm')}</option>
                   {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                 </select>
                 {errors.farm_id && (
                   <p className="text-red-600 text-sm mt-1">{errors.farm_id.message}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.parcel')} <span className="text-red-500">*</span>
                 </label>
                 <select
                   {...register('parcel_id')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 ${
                     errors.parcel_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                   disabled={!farmId || parcelsLoading}
                 >
                   <option value="">
                     {!farmId ? t('harvests.form.placeholders.selectFarmFirst') : t('harvests.form.placeholders.selectParcel')}
                   </option>
                   {parcels.map(p => (
                     <option key={p.id} value={p.id}>
                       {p.name}{(p.tree_type || p.planting_type) && ` - ${p.tree_type || p.planting_type}`}
                     </option>
                   ))}
                 </select>
                 {errors.parcel_id && (
                   <p className="text-red-600 text-sm mt-1">{errors.parcel_id.message}</p>
                 )}
                 {selectedParcel && (
                   <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                     <p className="text-sm font-medium text-green-700 dark:text-green-300">
                       {selectedParcel.tree_type || selectedParcel.planting_type || t('harvests.form.messages.cropNotSpecified')}
                     </p>
                     <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                       {selectedParcel.variety && `${t('harvests.form.messages.variety')}: ${selectedParcel.variety}`}
                       {selectedParcel.variety && selectedParcel.area && ' • '}
                       {selectedParcel.area && `${selectedParcel.area} ${selectedParcel.area_unit || 'ha'}`}
                     </p>
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* Harvest Details Section */}
           <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="h-4 w-4" />
               {t('harvests.form.sections.harvestDetails')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.harvestDate')} <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="date"
                   {...register('harvest_date')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.harvest_date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 />
                 {errors.harvest_date && (
                   <p className="text-red-600 text-sm mt-1">{errors.harvest_date.message}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.quantity')} <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   placeholder={t('harvests.form.placeholders.quantity')}
                   {...register('quantity', { valueAsNumber: true })}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.quantity ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 />
                 {errors.quantity && (
                   <p className="text-red-600 text-sm mt-1">{errors.quantity.message}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.unit')} <span className="text-red-500">*</span>
                 </label>
                 <select
                   {...register('unit')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.unit ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 >
                   {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                 </select>
                 {errors.unit && (
                   <p className="text-red-600 text-sm mt-1">{errors.unit.message}</p>
                 )}
               </div>
             </div>
           </div>

           {/* Quality Section */}
           <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <Star className="h-4 w-4" />
               {t('harvests.form.sections.quality')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.qualityGrade')}
                 </label>
                 <select
                   {...register('quality_grade')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.quality_grade ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 >
                   <option value="">{t('harvests.form.placeholders.unspecified')}</option>
                   {QUALITY_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                 </select>
                 {errors.quality_grade && (
                   <p className="text-red-600 text-sm mt-1">{errors.quality_grade.message}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.qualityScore')}
                 </label>
                 <input
                   type="number"
                   min="1"
                   max="10"
                   placeholder={t('harvests.form.placeholders.qualityScore')}
                   {...register('quality_score', { valueAsNumber: true })}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.quality_score ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 />
                 {errors.quality_score && (
                   <p className="text-red-600 text-sm mt-1">{errors.quality_score.message}</p>
                 )}
               </div>
             </div>
           </div>

           {/* Storage & Destination Section */}
           <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
               <Warehouse className="h-4 w-4" />
               {t('harvests.form.sections.storageAndDestination')}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.warehouse')}
                 </label>
                 <select
                   {...register('warehouse_id')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.warehouse_id ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                   disabled={warehousesLoading}
                 >
                   <option value="">{t('harvests.form.placeholders.selectWarehouse')}</option>
                   {warehouses.filter(w => w.is_active).map(w => (
                     <option key={w.id} value={w.id}>
                       {w.name}
                       {w.temperature_controlled && ' 🌡️'}
                       {w.location && ` (${w.location})`}
                     </option>
                   ))}
                 </select>
                 {errors.warehouse_id && (
                   <p className="text-red-600 text-sm mt-1">{errors.warehouse_id.message}</p>
                 )}
                 {watch('warehouse_id') && (() => {
                   const selectedWarehouse = warehouses.find(w => w.id === watch('warehouse_id'));
                   return selectedWarehouse && (
                     <p className="mt-1 text-xs text-gray-500">
                       {selectedWarehouse.temperature_controlled && t('harvests.form.messages.temperatureControlled')}
                       {selectedWarehouse.temperature_controlled && selectedWarehouse.humidity_controlled && ' • '}
                       {selectedWarehouse.humidity_controlled && t('harvests.form.messages.humidityControlled')}
                       {selectedWarehouse.capacity && ` • ${t('harvests.form.messages.capacity')}: ${selectedWarehouse.capacity} ${selectedWarehouse.capacity_unit || 'm³'}`}
                     </p>
                   );
                 })()}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.intendedFor')}
                 </label>
                 <select
                   {...register('intended_for')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.intended_for ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 >
                   <option value="">{t('harvests.form.placeholders.unspecified')}</option>
                   {INTENDED_FOR.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                 </select>
                 {errors.intended_for && (
                   <p className="text-red-600 text-sm mt-1">{errors.intended_for.message}</p>
                 )}
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 {t('harvests.form.fields.storageLocation')}
               </label>
               <input
                 type="text"
                 placeholder={t('harvests.form.placeholders.storageLocation')}
                 {...register('storage_location')}
                 className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                   errors.storage_location ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                 }`}
               />
               {errors.storage_location && (
                 <p className="text-red-600 text-sm mt-1">{errors.storage_location.message}</p>
               )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.status')}
                 </label>
                 <select
                   {...register('status')}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.status ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 >
                   {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                 </select>
                 {errors.status && (
                   <p className="text-red-600 text-sm mt-1">{errors.status.message}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   {t('harvests.form.fields.expectedPricePerUnit')}
                 </label>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   placeholder={t('harvests.form.placeholders.price')}
                   {...register('expected_price_per_unit', { valueAsNumber: true })}
                   className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                     errors.expected_price_per_unit ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                   }`}
                 />
                 {errors.expected_price_per_unit && (
                   <p className="text-red-600 text-sm mt-1">{errors.expected_price_per_unit.message}</p>
                 )}
               </div>
             </div>
            {estimatedRevenue && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {t('harvests.form.messages.estimatedRevenue')}: <strong>{estimatedRevenue} MAD</strong>
                </span>
              </div>
            )}
          </div>

           {/* Notes Section */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               {t('harvests.form.fields.notes')}
             </label>
             <textarea
               rows={3}
               placeholder={t('harvests.form.placeholders.notes')}
               {...register('notes')}
               className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                 errors.notes ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
               }`}
             />
             {errors.notes && (
               <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
             )}
           </div>

           {/* Actions */}
           <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
             <Button
               type="button"
               onClick={onClose}
               disabled={isSubmitting}
               className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {t('harvests.form.buttons.cancel')}
             </Button>
             <Button variant="green" type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2" >
               {isSubmitting && (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               )}
               {harvest ? t('harvests.form.buttons.update') : t('harvests.form.buttons.save')}
             </Button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default HarvestForm;
