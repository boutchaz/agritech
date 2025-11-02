import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Plus, Leaf, Edit, Trash2, MapPin, Sprout } from 'lucide-react';
import {
  getPlantingSystemsByCategory,
  getCropTypesByCategory,
  getVarietiesByCropType,
  calculatePlantCount,
  type CropCategory,
} from '../../lib/plantingSystemData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
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
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FormField } from '../ui/FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/radix-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

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
      return parcelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels', farmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setParcelToDelete(null); // Close dialog after successful deletion
    },
    onError: (error: any) => {
      console.error('Error deleting parcel:', error);
      alert(`Erreur lors de la suppression de la parcelle: ${error.message || 'Erreur inconnue'}`);
      // Don't close dialog on error so user can try again or see the error
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

  const handleParcelClick = (parcelId: string) => {
    // Navigate to parcel detail page
    navigate({
      to: `/parcels/${parcelId}`
    });
    onClose(); // Close the modal after navigation
  };

  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestion des Parcelles
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {farmName} • {parcels.length} parcelle{parcels.length !== 1 ? 's' : ''} • {totalArea.toFixed(2)} ha
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {/* Add Button */}
            {!showForm && (
              <Button
                onClick={handleAddNew}
                variant="outline"
                className="w-full border-dashed border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Ajouter une parcelle</span>
              </Button>
            )}

            {/* Form */}
            {showForm && (
              <Card className="bg-gray-50 dark:bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingParcel ? 'Modifier la parcelle' : 'Nouvelle parcelle'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Informations de base
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Nom de la parcelle *" htmlFor="name" error={errors.name?.message}>
                          <Input
                            id="name"
                            {...register('name')}
                            placeholder="Ex: Parcelle Nord"
                            invalid={!!errors.name}
                          />
                        </FormField>

                        <FormField label="Surface (ha) *" htmlFor="area" error={errors.area?.message}>
                          <Input
                            id="area"
                            type="number"
                            step="0.01"
                            {...register('area', { valueAsNumber: true })}
                            placeholder="0.00"
                            invalid={!!errors.area}
                          />
                        </FormField>

                        <div className="md:col-span-2">
                          <FormField label="Description" htmlFor="description">
                            <Textarea
                              id="description"
                              {...register('description')}
                              rows={2}
                              placeholder="Description de la parcelle..."
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>

                    {/* Crop Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Culture et plantation
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Catégorie de culture" htmlFor="crop_category">
                          <Select value={watch('crop_category') || ''} onValueChange={(value) => setValue('crop_category', value)}>
                            <SelectTrigger id="crop_category">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sélectionner...</SelectItem>
                              <SelectItem value="trees">Arbres fruitiers</SelectItem>
                              <SelectItem value="cereals">Céréales</SelectItem>
                              <SelectItem value="vegetables">Légumes</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Type de culture" htmlFor="crop_type">
                          {availableCropTypes.length > 0 ? (
                            <Select value={watch('crop_type') || ''} onValueChange={(value) => setValue('crop_type', value)}>
                              <SelectTrigger id="crop_type">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Sélectionner...</SelectItem>
                                {availableCropTypes.map(crop => (
                                  <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="crop_type"
                              {...register('crop_type')}
                              placeholder="Ex: Tomates"
                            />
                          )}
                        </FormField>

                        {availableVarieties.length > 0 && (
                          <FormField label="Variété" htmlFor="variety">
                            <Select value={watch('variety') || ''} onValueChange={(value) => setValue('variety', value)}>
                              <SelectTrigger id="variety">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Sélectionner...</SelectItem>
                                {availableVarieties.map(variety => (
                                  <SelectItem key={variety} value={variety}>{variety}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                        )}

                        {selectedCategory === 'trees' && (
                          <FormField label="Porte-greffe" htmlFor="rootstock">
                            <Input
                              id="rootstock"
                              {...register('rootstock')}
                              placeholder="Ex: GF677"
                            />
                          </FormField>
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
                          <FormField label="Type de système" htmlFor="planting_system">
                            <Select value={watch('planting_system') || ''} onValueChange={(value) => setValue('planting_system', value)}>
                              <SelectTrigger id="planting_system">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Sélectionner...</SelectItem>
                                {availablePlantingSystems.map((system, idx) => (
                                  <SelectItem key={idx} value={system.type}>
                                    {system.type} ({system.spacing})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>

                          <FormField label="Espacement" htmlFor="spacing">
                            <Input
                              id="spacing"
                              {...register('spacing')}
                              placeholder="Ex: 4x1.5"
                              readOnly
                              className="bg-gray-50 dark:bg-gray-800"
                            />
                          </FormField>

                          <FormField label="Densité (plants/ha)" htmlFor="density_per_hectare">
                            <Input
                              id="density_per_hectare"
                              type="number"
                              {...register('density_per_hectare', { valueAsNumber: true })}
                              placeholder="0"
                              readOnly
                              className="bg-gray-50 dark:bg-gray-800"
                            />
                          </FormField>

                          <FormField label="Nombre total de plants" htmlFor="plant_count">
                            <Input
                              id="plant_count"
                              type="number"
                              {...register('plant_count', { valueAsNumber: true })}
                              placeholder="0"
                              readOnly
                              className="bg-gray-50 dark:bg-gray-800"
                            />
                          </FormField>

                          <FormField label="Date de plantation" htmlFor="planting_date">
                            <Input
                              id="planting_date"
                              type="date"
                              {...register('planting_date')}
                            />
                          </FormField>

                          <FormField label="Année de plantation" htmlFor="planting_year">
                            <Input
                              id="planting_year"
                              type="number"
                              {...register('planting_year', { valueAsNumber: true })}
                              placeholder="2024"
                            />
                          </FormField>
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Informations complémentaires
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Type de sol" htmlFor="soil_type">
                          <Input
                            id="soil_type"
                            {...register('soil_type')}
                            placeholder="Ex: Argileux"
                          />
                        </FormField>

                        <FormField label="Type d'irrigation" htmlFor="irrigation_type">
                          <Select value={watch('irrigation_type') || ''} onValueChange={(value) => setValue('irrigation_type', value)}>
                            <SelectTrigger id="irrigation_type">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sélectionner...</SelectItem>
                              <SelectItem value="Goutte à goutte">Goutte à goutte</SelectItem>
                              <SelectItem value="Aspersion">Aspersion</SelectItem>
                              <SelectItem value="Gravitaire">Gravitaire</SelectItem>
                              <SelectItem value="Pivot">Pivot</SelectItem>
                              <SelectItem value="Submersion">Submersion</SelectItem>
                              <SelectItem value="Pluvial">Pluvial (bour)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={saveParcelMutation.isPending}
                        className="flex-1"
                      >
                        {saveParcelMutation.isPending ? 'Enregistrement...' : (editingParcel ? 'Mettre à jour' : 'Créer la parcelle')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingParcel(null);
                          reset();
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
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
                  <Card
                    key={parcel.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleParcelClick(parcel.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                              {parcel.name}
                            </CardTitle>
                            {parcel.crop_type && (
                              <CardDescription>{parcel.crop_type}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(parcel);
                            }}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(parcel.id, parcel.name);
                            }}
                            className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                          Cliquer pour voir les détails
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Parcel Confirmation Dialog */}
      <AlertDialog 
        open={!!parcelToDelete && !deleteParcelMutation.isSuccess} 
        onOpenChange={(open) => {
          if (!open && !deleteParcelMutation.isPending) {
            setParcelToDelete(null);
            deleteParcelMutation.reset();
          }
        }}
      >
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
            <AlertDialogCancel disabled={deleteParcelMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (parcelToDelete) {
                  deleteParcelMutation.mutate(parcelToDelete.id);
                  // Don't close dialog here - let onSuccess handle it
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
