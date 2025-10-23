import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { X, Plus, Leaf, Edit, Trash2, MapPin } from 'lucide-react';

interface Parcel {
  id: string;
  name: string;
  description?: string;
  area: number;
  area_unit: string;
  crop_type?: string;
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
  crop_type: z.string().optional(),
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelSchema),
    defaultValues: {
      area_unit: 'hectares'
    }
  });

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
      if (editingParcel) {
        // Update existing parcel
        const { data, error } = await supabase
          .from('parcels')
          .update({
            name: formData.name,
            description: formData.description,
            area: formData.area,
            area_unit: formData.area_unit,
            crop_type: formData.crop_type,
            soil_type: formData.soil_type,
            irrigation_type: formData.irrigation_type,
          })
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
            name: formData.name,
            description: formData.description,
            area: formData.area,
            area_unit: formData.area_unit,
            crop_type: formData.crop_type,
            soil_type: formData.soil_type,
            irrigation_type: formData.irrigation_type,
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
    setValue('crop_type', parcel.crop_type || '');
    setValue('soil_type', parcel.soil_type || '');
    setValue('irrigation_type', parcel.irrigation_type || '');
    setShowForm(true);
  };

  const handleDelete = (parcelId: string, parcelName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la parcelle "${parcelName}" ?`)) {
      deleteParcelMutation.mutate(parcelId);
    }
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type de culture
                    </label>
                    <input
                      {...register('crop_type')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ex: Tomates"
                    />
                  </div>

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
  );
};

export default ParcelManagementModal;
