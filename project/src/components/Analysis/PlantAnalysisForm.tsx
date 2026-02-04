import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { useFormErrors } from '@/hooks/useFormErrors';
import type { PlantAnalysisData } from '../../types/analysis';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Parcel {
  id: string;
  name: string;
}

interface PlantAnalysisFormProps {
  onSave: (data: PlantAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const plantAnalysisSchema = z.object({
  analysisDate: z.string().min(1, 'Analysis date is required'),
  plant_part: z.enum(['leaf', 'stem', 'root', 'fruit', 'whole_plant']),
  growth_stage: z.string().optional(),
  nitrogen_percentage: z.string().optional(),
  phosphorus_percentage: z.string().optional(),
  potassium_percentage: z.string().optional(),
  calcium_percentage: z.string().optional(),
  magnesium_percentage: z.string().optional(),
  sulfur_percentage: z.string().optional(),
  dry_matter_percentage: z.string().optional(),
  chlorophyll_content: z.string().optional(),
  laboratory: z.string().optional(),
  notes: z.string().optional(),
});

type PlantAnalysisFormData = z.infer<typeof plantAnalysisSchema>;

const PlantAnalysisForm: React.FC<PlantAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { handleFormError } = useFormErrors<PlantAnalysisFormData>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PlantAnalysisFormData>({
    resolver: zodResolver(plantAnalysisSchema),
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      plant_part: 'leaf',
      growth_stage: '',
      nitrogen_percentage: '',
      phosphorus_percentage: '',
      potassium_percentage: '',
      calcium_percentage: '',
      magnesium_percentage: '',
      sulfur_percentage: '',
      dry_matter_percentage: '',
      chlorophyll_content: '',
      laboratory: '',
      notes: '',
    },
  });

  const onSubmit = async (formData: PlantAnalysisFormData) => {
    try {
      const parseNumber = (val: string | undefined) => val && val !== '' ? Number(val) : undefined;

      const cleanData: PlantAnalysisData = {
        plant_part: formData.plant_part,
        growth_stage: formData.growth_stage?.trim() || undefined,
        nitrogen_percentage: parseNumber(formData.nitrogen_percentage),
        phosphorus_percentage: parseNumber(formData.phosphorus_percentage),
        potassium_percentage: parseNumber(formData.potassium_percentage),
        calcium_percentage: parseNumber(formData.calcium_percentage),
        magnesium_percentage: parseNumber(formData.magnesium_percentage),
        sulfur_percentage: parseNumber(formData.sulfur_percentage),
        dry_matter_percentage: parseNumber(formData.dry_matter_percentage),
        chlorophyll_content: parseNumber(formData.chlorophyll_content),
      };

      onSave(cleanData, formData.analysisDate, formData.laboratory?.trim() || undefined, formData.notes?.trim() || undefined);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: 'Failed to save plant analysis',
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Nouvelle Analyse de Plante</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {selectedParcel && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
              Parcelle sélectionnée
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>{selectedParcel.name}</strong>
            </p>
          </div>
        )}

        {/* General Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Date d'analyse" htmlFor="analysisDate">
            <Input
              id="analysisDate"
              type="date"
              {...register('analysisDate')}
              invalid={!!errors.analysisDate}
            />
            {errors.analysisDate && (
              <p className="text-red-600 text-sm mt-1">{errors.analysisDate.message}</p>
            )}
          </FormField>

          <FormField label="Laboratoire (optionnel)" htmlFor="laboratory">
            <Input
              id="laboratory"
              type="text"
              {...register('laboratory')}
              invalid={!!errors.laboratory}
              placeholder="Nom du laboratoire"
            />
            {errors.laboratory && (
              <p className="text-red-600 text-sm mt-1">{errors.laboratory.message}</p>
            )}
          </FormField>
        </div>

        {/* Plant Information */}
        <div>
          <h4 className="font-medium mb-4">Informations sur l'Échantillon</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Partie de la plante" htmlFor="plant_part" required>
              <Select
                id="plant_part"
                {...register('plant_part')}
                invalid={!!errors.plant_part}
              >
                <option value="leaf">Feuille</option>
                <option value="stem">Tige</option>
                <option value="root">Racine</option>
                <option value="fruit">Fruit</option>
                <option value="whole_plant">Plante entière</option>
              </Select>
              {errors.plant_part && (
                <p className="text-red-600 text-sm mt-1">{errors.plant_part.message}</p>
              )}
            </FormField>

            <FormField label="Stade de croissance" htmlFor="growth_stage">
              <Input
                id="growth_stage"
                type="text"
                {...register('growth_stage')}
                invalid={!!errors.growth_stage}
                placeholder="Ex: Floraison, Fructification..."
              />
              {errors.growth_stage && (
                <p className="text-red-600 text-sm mt-1">{errors.growth_stage.message}</p>
              )}
            </FormField>
          </div>
        </div>

        {/* Macronutrients (%) */}
        <div>
          <h4 className="font-medium mb-4">Macronutriments (%)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Azote (N)" htmlFor="nitrogen">
              <Input
                id="nitrogen"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('nitrogen_percentage')}
                invalid={!!errors.nitrogen_percentage}
              />
              {errors.nitrogen_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.nitrogen_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Phosphore (P)" htmlFor="phosphorus">
              <Input
                id="phosphorus"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('phosphorus_percentage')}
                invalid={!!errors.phosphorus_percentage}
              />
              {errors.phosphorus_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.phosphorus_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Potassium (K)" htmlFor="potassium">
              <Input
                id="potassium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('potassium_percentage')}
                invalid={!!errors.potassium_percentage}
              />
              {errors.potassium_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.potassium_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Calcium (Ca)" htmlFor="calcium">
              <Input
                id="calcium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('calcium_percentage')}
                invalid={!!errors.calcium_percentage}
              />
              {errors.calcium_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.calcium_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Magnésium (Mg)" htmlFor="magnesium">
              <Input
                id="magnesium"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('magnesium_percentage')}
                invalid={!!errors.magnesium_percentage}
              />
              {errors.magnesium_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.magnesium_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Soufre (S)" htmlFor="sulfur">
              <Input
                id="sulfur"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('sulfur_percentage')}
                invalid={!!errors.sulfur_percentage}
              />
              {errors.sulfur_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.sulfur_percentage.message}</p>
              )}
            </FormField>
          </div>
        </div>

        {/* Health Indicators */}
        <div>
          <h4 className="font-medium mb-4">Indicateurs de Santé</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Matière sèche (%)" htmlFor="dry_matter">
              <Input
                id="dry_matter"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('dry_matter_percentage')}
                invalid={!!errors.dry_matter_percentage}
              />
              {errors.dry_matter_percentage && (
                <p className="text-red-600 text-sm mt-1">{errors.dry_matter_percentage.message}</p>
              )}
            </FormField>

            <FormField label="Chlorophylle (SPAD)" htmlFor="chlorophyll">
              <Input
                id="chlorophyll"
                type="number"
                step="0.1"
                min="0"
                {...register('chlorophyll_content')}
                invalid={!!errors.chlorophyll_content}
              />
              {errors.chlorophyll_content && (
                <p className="text-red-600 text-sm mt-1">{errors.chlorophyll_content.message}</p>
              )}
            </FormField>
          </div>
        </div>

        {/* Notes */}
        <FormField label="Notes (optionnel)" htmlFor="notes">
          <textarea
            id="notes"
            {...register('notes')}
            className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.notes ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
            }`}
            rows={4}
            placeholder="Observations supplémentaires..."
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
          )}
        </FormField>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlantAnalysisForm;
