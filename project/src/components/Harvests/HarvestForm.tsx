import React, { useState, useMemo } from 'react';
import { X, Wheat, Calendar, Star, MapPin, TrendingUp, Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useFarms, useParcelsByFarm } from '../../hooks/useParcelsQuery';
import { useCreateHarvest, useUpdateHarvest } from '../../hooks/useHarvests';
import { useWarehouses } from '../../hooks/useWarehouses';
import type { HarvestSummary, HarvestUnit, QualityGrade, HarvestStatus, IntendedFor } from '../../types/harvests';

interface HarvestFormProps {
  harvest?: HarvestSummary | null;
  onClose: () => void;
}

const HarvestForm: React.FC<HarvestFormProps> = ({ harvest, onClose }) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

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
  const [formData, setFormData] = useState({
    farm_id: harvest?.farm_id || '',
    parcel_id: harvest?.parcel_id || '',
    harvest_date: harvest?.harvest_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    quantity: harvest?.quantity || 0,
    unit: harvest?.unit || 'kg',
    quality_grade: harvest?.quality_grade || '',
    quality_score: harvest?.quality_score || '',
    warehouse_id: (harvest as any)?.warehouse_id || '',
    storage_location: harvest?.storage_location || '',
    intended_for: harvest?.intended_for || '',
    expected_price_per_unit: harvest?.expected_price_per_unit || '',
    status: harvest?.status || 'stored',
    notes: harvest?.notes || '',
  });

  const { data: parcels = [], isLoading: parcelsLoading } = useParcelsByFarm(formData.farm_id || undefined);
  const createMutation = useCreateHarvest();
  const updateMutation = useUpdateHarvest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // Exclude status from updates as backend doesn't accept it in PATCH
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
      onClose();
    } catch (_error) {
      toast.error(t('harvests.form.validation.saveError'));
    }
  };

  const selectedParcel = parcels.find(p => p.id === formData.parcel_id);
  const estimatedRevenue = formData.quantity && formData.expected_price_per_unit
    ? (Number(formData.quantity) * Number(formData.expected_price_per_unit)).toFixed(2)
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  required
                  value={formData.farm_id}
                  onChange={(e) => setFormData({ ...formData, farm_id: e.target.value, parcel_id: '' })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  disabled={farmsLoading}
                >
                  <option value="">{t('harvests.form.placeholders.selectFarm')}</option>
                  {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('harvests.form.fields.parcel')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.parcel_id}
                  onChange={(e) => setFormData({ ...formData, parcel_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  disabled={!formData.farm_id || parcelsLoading}
                >
                  <option value="">
                    {!formData.farm_id ? t('harvests.form.placeholders.selectFarmFirst') : t('harvests.form.placeholders.selectParcel')}
                  </option>
                  {parcels.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{(p.tree_type || p.planting_type) && ` - ${p.tree_type || p.planting_type}`}
                    </option>
                  ))}
                </select>
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
                  required
                  value={formData.harvest_date}
                  onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('harvests.form.fields.quantity')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder={t('harvests.form.placeholders.quantity')}
                  value={formData.quantity || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Use Number() and round to 2 decimal places to avoid floating point issues
                    const numValue = value === '' ? 0 : Math.round(Number(value) * 100) / 100;
                    setFormData({ ...formData, quantity: numValue });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('harvests.form.fields.unit')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as HarvestUnit })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
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
                  value={formData.quality_grade}
                  onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="">{t('harvests.form.placeholders.unspecified')}</option>
                  {QUALITY_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
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
                  value={formData.quality_score}
                  onChange={(e) => setFormData({ ...formData, quality_score: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
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
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                {formData.warehouse_id && (() => {
                  const selectedWarehouse = warehouses.find(w => w.id === formData.warehouse_id);
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
                  value={formData.intended_for}
                  onChange={(e) => setFormData({ ...formData, intended_for: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="">{t('harvests.form.placeholders.unspecified')}</option>
                  {INTENDED_FOR.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('harvests.form.fields.storageLocation')}
              </label>
              <input
                type="text"
                placeholder={t('harvests.form.placeholders.storageLocation')}
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('harvests.form.fields.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as HarvestStatus })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
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
                  value={formData.expected_price_per_unit}
                  onChange={(e) => setFormData({ ...formData, expected_price_per_unit: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
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
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              {t('harvests.form.buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {harvest ? t('harvests.form.buttons.update') : t('harvests.form.buttons.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HarvestForm;
