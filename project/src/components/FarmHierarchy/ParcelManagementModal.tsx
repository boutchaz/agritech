import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { X, Plus, Leaf, Edit, Trash2, MapPin, Sprout } from 'lucide-react';
import {
  getPlantingSystemsByCategory,
  getCropTypesByCategory,
  getVarietiesByCropType,
  calculatePlantCount,
  type CropCategory,
} from '../../lib/plantingSystemData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {





} from '../ui/dialog';

interface Parcel {
  id: string;
  name: string;
  description?: string;
  area: number;
  area_unit: string;
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  rootstock?: string;
  soil_type?: string;
  irrigation_type?: string;
}

interface ParcelManagementModalProps {
  farmId: string;
  farmName: string;
  onClose: () => void;
}

const parcelSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  area: z.number().positive('La surface doit être positive'),
  area_unit: z.string().default('hectares'),
  crop_category: z.string().optional(),
  crop_type: z.string().optional(),
  variety: z.string().optional(),
  planting_system: z.string().optional(),
  spacing: z.string().optional(),
  density_per_hectare: z.number().optional(),
  plant_count: z.number().int().optional(),
  planting_date: z.string().optional(),
  planting_year: z.number().int().optional(),
  rootstock: z.string().optional(),
  soil_type: z.string().optional(),
  irrigation_type: z.string().optional(),
});

type ParcelFormValues = z.infer<typeof parcelSchema>;

const ParcelManagementModal: React.FC<ParcelManagementModalProps> = ({
  farmId,
  farmName,
  onClose
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [parcelToDelete, setParcelToDelete] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      area_unit: 'hectares'
    }
  });

  // Watch form values for dynamic updates
  const selectedCategory = watch('crop_category') as CropCategory | undefined;
  const selectedCropType = watch('crop_type');
  const selectedPlantingSystem = watch('planting_system');
  const selectedArea = watch('area');
  const selectedDensity = watch('density_per_hectare');

  // Get available crop types based on category
  const availableCropTypes = selectedCategory ? getCropTypesByCategory(selectedCategory) : [];

  // Get available varieties based on crop type
  const availableVarieties = selectedCropType ? getVarietiesByCropType(selectedCropType) : [];

  // Get available planting systems based on category
  const availablePlantingSystems = selectedCategory ? getPlantingSystemsByCategory(selectedCategory) : [];

  // Auto-update density when planting system changes
  useEffect(() => {
    if (selectedPlantingSystem) {
      const system = availablePlantingSystems.find(s => s.type === selectedPlantingSystem || `${s.type} (${s.spacing})` === selectedPlantingSystem);
      if (system) {
        const density = 'treesPerHectare' in system ? system.treesPerHectare :
                       'plantsPerHectare' in system ? system.plantsPerHectare :
                       'seedsPerHectare' in system ? system.seedsPerHectare : 0;
        setValue('density_per_hectare', density);
        setValue('spacing', system.spacing);
      }
    }
  }, [selectedPlantingSystem, availablePlantingSystems, setValue]);

  // Auto-calculate plant count when area or density changes
  useEffect(() => {
    if (selectedArea && selectedDensity) {
      const count = calculatePlantCount(selectedArea, selectedDensity);
      setValue('plant_count', count);
    }
  }, [selectedArea, selectedDensity, setValue]);

  // Fetch parcels for this farm
  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ['parcels', farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId)
        .order('name');

      if (error) throw error;
      return data as Parcel[];
    }
  });

  // Create/Update parcel mutation
  const saveParcelMutation = useMutation({
    mutationFn: async (formData: ParcelFormValues) => {
      const parcelData = {
        name: formData.name,
        description: formData.description,
        area: formData.area,
        area_unit: formData.area_unit,
        crop_category: formData.crop_category,
        crop_type: formData.crop_type,
        variety: formData.variety,
        planting_system: formData.planting_system,
        spacing: formData.spacing,
        density_per_hectare: formData.density_per_hectare,
        plant_count: formData.plant_count,
        planting_date: formData.planting_date,
        planting_year: formData.planting_year,
        rootstock: formData.rootstock,
        soil_type: formData.soil_type,
        irrigation_type: formData.irrigation_type,
      };

      if (editingParcel) {
        // Update existing parcel
        const { data, error } = await supabase
          .from('parcels')
          .update(parcelData)
          .eq('id', editingParcel.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new parcel
        const { data, error } = await supabase
          .from('parcels')
          .insert({
            farm_id: farmId,
            ...parcelData,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels', farmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      reset();
      setShowForm(false);
      setEditingParcel(null);
    },
    onError: (error: any) => {
      console.error('Error saving parcel:', error);
      alert('Erreur lors de la sauvegarde de la parcelle');
    }
  });

  // Delete parcel mutation
  const deleteParcelMutation = useMutation({
    mutationFn: async (parcelId: string) => {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', parcelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels', farmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
    },
    onError: (error: any) => {
      console.error('Error deleting parcel:', error);
      alert('Erreur lors de la suppression de la parcelle');
    }
  });

  const handleEdit = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setValue('name', parcel.name);
    setValue('description', parcel.description || '');
    setValue('area', parcel.area);
    setValue('area_unit', parcel.area_unit);
    setValue('crop_category', parcel.crop_category || '');
    setValue('crop_type', parcel.crop_type || '');
    setValue('variety', parcel.variety || '');
    setValue('planting_system', parcel.planting_system || '');
    setValue('spacing', parcel.spacing || '');
    setValue('density_per_hectare', parcel.density_per_hectare);
    setValue('plant_count', parcel.plant_count);
    setValue('planting_date', parcel.planting_date || '');
    setValue('planting_year', parcel.planting_year);
    setValue('rootstock', parcel.rootstock || '');
    setValue('soil_type', parcel.soil_type || '');
    setValue('irrigation_type', parcel.irrigation_type || '');
    setShowForm(true);
  };

  const handleDelete = (parcelId: string, parcelName: string) => {
    setParcelToDelete({ id: parcelId, name: parcelName });
  };

  const onSubmit = (data: ParcelFormValues) => {
    saveParcelMutation.mutate(data);
  };

  const handleAddNew = () => {
    // Redirect to parcels page with farm pre-selected for map-based parcel creation
    navigate({
      to: '/parcels',
      search: { farmId }
    });
  };

  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Gestion des Parcelles
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {farmName} • {parcels.length} parcelle{parcels.length !== 1 ? 's' : ''} • {totalArea.toFixed(2)} ha
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Add Button */}
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Ajouter une parcelle</span>
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingParcel ? 'Modifier la parcelle' : 'Nouvelle parcelle'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    Informations de base
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nom de la parcelle *
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Ex: Parcelle Nord"
                      />
                      {errors.name && (
                        <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Surface (ha) *
                      </label>
                      <input
                        {...register('area', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                      {errors.area && (
                        <p className="text-red-600 text-sm mt-1">{errors.area.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        {...register('description')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Description de la parcelle..."
                      />
                    </div>
                  </div>
                </div>

                {/* Crop Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Culture et plantation
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Catégorie de culture
                      </label>
                      <select
                        {...register('crop_category')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="trees">Arbres fruitiers</option>
                        <option value="cereals">Céréales</option>
                        <option value="vegetables">Légumes</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type de culture
                      </label>
                      {availableCropTypes.length > 0 ? (
                        <select
                          {...register('crop_type')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Sélectionner...</option>
                          {availableCropTypes.map(crop => (
                            <option key={crop} value={crop}>{crop}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          {...register('crop_type')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Ex: Tomates"
                        />
                      )}
                    </div>

                    {availableVarieties.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Variété
                        </label>
                        <select
                          {...register('variety')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Sélectionner...</option>
                          {availableVarieties.map(variety => (
                            <option key={variety} value={variety}>{variety}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedCategory === 'trees' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Porte-greffe
                        </label>
                        <input
                          {...register('rootstock')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Ex: GF677"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Planting System */}
                {availablePlantingSystems.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Système de plantation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type de système
                        </label>
                        <select
                          {...register('planting_system')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Sélectionner...</option>
                          {availablePlantingSystems.map((system, idx) => (
                            <option key={idx} value={system.type}>
                              {system.type} ({system.spacing})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Espacement
                        </label>
                        <input
                          {...register('spacing')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800"
                          placeholder="Ex: 4x1.5"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Densité (plants/ha)
                        </label>
                        <input
                          {...register('density_per_hectare', { valueAsNumber: true })}
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800"
                          placeholder="0"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nombre total de plants
                        </label>
                        <input
                          {...register('plant_count', { valueAsNumber: true })}
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800"
                          placeholder="0"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date de plantation
                        </label>
                        <input
                          {...register('planting_date')}
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Année de plantation
                        </label>
                        <input
                          {...register('planting_year', { valueAsNumber: true })}
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Informations complémentaires
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type de sol
                      </label>
                      <input
                        {...register('soil_type')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Ex: Argileux"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type d'irrigation
                      </label>
                      <select
                        {...register('irrigation_type')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Goutte à goutte">Goutte à goutte</option>
                        <option value="Aspersion">Aspersion</option>
                        <option value="Gravitaire">Gravitaire</option>
                        <option value="Pivot">Pivot</option>
                        <option value="Submersion">Submersion</option>
                        <option value="Pluvial">Pluvial (bour)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saveParcelMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saveParcelMutation.isPending ? 'Enregistrement...' : (editingParcel ? 'Mettre à jour' : 'Créer la parcelle')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingParcel(null);
                      reset();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Parcels List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : parcels.length === 0 ? (
            <div className="text-center py-12">
              <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucune parcelle créée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    // Navigate to parcels page with this parcel selected
                    navigate({
                      to: '/parcels',
                      search: { farmId, parcelId: parcel.id }
                    });
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {parcel.name}
                        </h4>
                        {parcel.crop_type && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {parcel.crop_type}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(parcel);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(parcel.id, parcel.name);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Surface:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {parcel.area} ha
                      </span>
                    </div>
                    {parcel.soil_type && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Sol:</span>
                        <span className="text-gray-900 dark:text-white">{parcel.soil_type}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Cliquer pour voir sur la carte
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>

      {/* Delete Parcel Confirmation Dialog */}
      <AlertDialog open={!!parcelToDelete} onOpenChange={(open) => !open && setParcelToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la parcelle <strong className="text-gray-900 dark:text-white">{parcelToDelete?.name}</strong> ?
              <br /><br />
              <span className="text-red-600 dark:text-red-400">
                ⚠️ Cette action supprimera également toutes les analyses, tâches et autres données associées à cette parcelle. Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (parcelToDelete) {
                  deleteParcelMutation.mutate(parcelToDelete.id);
                  setParcelToDelete(null);
                }
              }}
              disabled={deleteParcelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteParcelMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ParcelManagementModal;
