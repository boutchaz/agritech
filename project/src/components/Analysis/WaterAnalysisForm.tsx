import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import type { WaterAnalysisData } from '../../types/analysis';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Parcel {
  id: string;
  name: string;
}

interface WaterAnalysisFormProps {
  onSave: (data: WaterAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const waterAnalysisSchema = z.object({
  analysisDate: z.string().min(1, 'Analysis date is required'),
  water_source: z.enum(['well', 'river', 'irrigation', 'rainwater', 'municipal', 'other']),
  ph_level: z.number().min(0).max(14).optional().or(z.literal('')),
  temperature_celsius: z.number().optional().or(z.literal('')),
  ec_ds_per_m: z.number().min(0).optional().or(z.literal('')),
  tds_ppm: z.number().min(0).optional().or(z.literal('')),
  calcium_ppm: z.number().min(0).optional().or(z.literal('')),
  magnesium_ppm: z.number().min(0).optional().or(z.literal('')),
  sodium_ppm: z.number().min(0).optional().or(z.literal('')),
  potassium_ppm: z.number().min(0).optional().or(z.literal('')),
  chloride_ppm: z.number().min(0).optional().or(z.literal('')),
  sulfate_ppm: z.number().min(0).optional().or(z.literal('')),
  nitrate_ppm: z.number().min(0).optional().or(z.literal('')),
  sar: z.number().min(0).optional().or(z.literal('')),
  hardness_ppm: z.number().min(0).optional().or(z.literal('')),
  irrigation_suitability: z.enum(['excellent', 'good', 'fair', 'poor', 'unsuitable']).optional().or(z.literal('')),
  laboratory: z.string().optional(),
  notes: z.string().optional(),
});

type WaterAnalysisFormData = z.infer<typeof waterAnalysisSchema>;

const WaterAnalysisForm: React.FC<WaterAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { handleFormError } = useFormErrors<WaterAnalysisFormData>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<WaterAnalysisFormData>({
    resolver: zodResolver(waterAnalysisSchema),
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      water_source: 'well',
      ph_level: '',
      temperature_celsius: '',
      ec_ds_per_m: '',
      tds_ppm: '',
      calcium_ppm: '',
      magnesium_ppm: '',
      sodium_ppm: '',
      potassium_ppm: '',
      chloride_ppm: '',
      sulfate_ppm: '',
      nitrate_ppm: '',
      sar: '',
      hardness_ppm: '',
      irrigation_suitability: '',
      laboratory: '',
      notes: '',
    },
  });

  const onSubmit = async (formData: WaterAnalysisFormData) => {
    try {
      const { analysisDate, laboratory, notes, ...waterData } = formData;
      const cleanWaterData = Object.fromEntries(
        Object.entries(waterData).filter(([_, v]) => v !== undefined && v !== '')
      ) as unknown as WaterAnalysisData;

      onSave(cleanWaterData, analysisDate, laboratory || undefined, notes || undefined);
    } catch (error: unknown) {
      handleFormError(error, setError);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Nouvelle Analyse d'Eau</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {selectedParcel && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Parcelle sélectionnée
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
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
              required
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

        {/* Water Source */}
        <div>
          <h4 className="font-medium mb-4">Source d'Eau</h4>
          <FormField label="Source" htmlFor="water_source" required>
            <Select
              id="water_source"
              {...register('water_source')}
              invalid={!!errors.water_source}
              required
            >
              <option value="well">Puits</option>
              <option value="river">Rivière</option>
              <option value="irrigation">Irrigation</option>
              <option value="rainwater">Eau de pluie</option>
              <option value="municipal">Réseau municipal</option>
              <option value="other">Autre</option>
            </Select>
            {errors.water_source && (
              <p className="text-red-600 text-sm mt-1">{errors.water_source.message}</p>
            )}
          </FormField>
        </div>

        {/* Physical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Physiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="pH" htmlFor="ph_level">
              <Input
                id="ph_level"
                type="number"
                step="0.1"
                min="0"
                max="14"
                {...register('ph_level', { valueAsNumber: true })}
                invalid={!!errors.ph_level}
              />
              {errors.ph_level && (
                <p className="text-red-600 text-sm mt-1">{errors.ph_level.message}</p>
              )}
            </FormField>

            <FormField label="Température (°C)" htmlFor="temperature">
              <Input
                id="temperature"
                type="number"
                step="0.1"
                {...register('temperature_celsius', { valueAsNumber: true })}
                invalid={!!errors.temperature_celsius}
              />
              {errors.temperature_celsius && (
                <p className="text-red-600 text-sm mt-1">{errors.temperature_celsius.message}</p>
              )}
            </FormField>

            <FormField label="Conductivité (dS/m)" htmlFor="ec">
              <Input
                id="ec"
                type="number"
                step="0.01"
                min="0"
                {...register('ec_ds_per_m', { valueAsNumber: true })}
                invalid={!!errors.ec_ds_per_m}
              />
              {errors.ec_ds_per_m && (
                <p className="text-red-600 text-sm mt-1">{errors.ec_ds_per_m.message}</p>
              )}
            </FormField>

            <FormField label="TDS (ppm)" htmlFor="tds">
              <Input
                id="tds"
                type="number"
                step="1"
                min="0"
                {...register('tds_ppm', { valueAsNumber: true })}
                invalid={!!errors.tds_ppm}
              />
              {errors.tds_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.tds_ppm.message}</p>
              )}
            </FormField>
          </div>
        </div>

        {/* Major Ions */}
        <div>
          <h4 className="font-medium mb-4">Ions Majeurs (ppm)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Calcium (Ca²⁺)" htmlFor="calcium">
              <Input
                id="calcium"
                type="number"
                step="0.1"
                min="0"
                {...register('calcium_ppm', { valueAsNumber: true })}
                invalid={!!errors.calcium_ppm}
              />
              {errors.calcium_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.calcium_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Magnésium (Mg²⁺)" htmlFor="magnesium">
              <Input
                id="magnesium"
                type="number"
                step="0.1"
                min="0"
                {...register('magnesium_ppm', { valueAsNumber: true })}
                invalid={!!errors.magnesium_ppm}
              />
              {errors.magnesium_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.magnesium_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Sodium (Na⁺)" htmlFor="sodium">
              <Input
                id="sodium"
                type="number"
                step="0.1"
                min="0"
                {...register('sodium_ppm', { valueAsNumber: true })}
                invalid={!!errors.sodium_ppm}
              />
              {errors.sodium_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.sodium_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Potassium (K⁺)" htmlFor="potassium">
              <Input
                id="potassium"
                type="number"
                step="0.1"
                min="0"
                {...register('potassium_ppm', { valueAsNumber: true })}
                invalid={!!errors.potassium_ppm}
              />
              {errors.potassium_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.potassium_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Chlorure (Cl⁻)" htmlFor="chloride">
              <Input
                id="chloride"
                type="number"
                step="0.1"
                min="0"
                {...register('chloride_ppm', { valueAsNumber: true })}
                invalid={!!errors.chloride_ppm}
              />
              {errors.chloride_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.chloride_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Sulfate (SO₄²⁻)" htmlFor="sulfate">
              <Input
                id="sulfate"
                type="number"
                step="0.1"
                min="0"
                {...register('sulfate_ppm', { valueAsNumber: true })}
                invalid={!!errors.sulfate_ppm}
              />
              {errors.sulfate_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.sulfate_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Nitrate (NO₃⁻)" htmlFor="nitrate">
              <Input
                id="nitrate"
                type="number"
                step="0.1"
                min="0"
                {...register('nitrate_ppm', { valueAsNumber: true })}
                invalid={!!errors.nitrate_ppm}
              />
              {errors.nitrate_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.nitrate_ppm.message}</p>
              )}
            </FormField>
          </div>
        </div>

        {/* Water Quality Indicators */}
        <div>
          <h4 className="font-medium mb-4">Indicateurs de Qualité</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="SAR (Sodium Adsorption Ratio)" htmlFor="sar">
              <Input
                id="sar"
                type="number"
                step="0.01"
                min="0"
                {...register('sar', { valueAsNumber: true })}
                invalid={!!errors.sar}
              />
              {errors.sar && (
                <p className="text-red-600 text-sm mt-1">{errors.sar.message}</p>
              )}
            </FormField>

            <FormField label="Dureté (ppm CaCO₃)" htmlFor="hardness">
              <Input
                id="hardness"
                type="number"
                step="1"
                min="0"
                {...register('hardness_ppm', { valueAsNumber: true })}
                invalid={!!errors.hardness_ppm}
              />
              {errors.hardness_ppm && (
                <p className="text-red-600 text-sm mt-1">{errors.hardness_ppm.message}</p>
              )}
            </FormField>

            <FormField label="Convenance irrigation" htmlFor="suitability">
              <Select
                id="suitability"
                {...register('irrigation_suitability')}
                invalid={!!errors.irrigation_suitability}
              >
                <option value="">Sélectionner...</option>
                <option value="excellent">Excellente</option>
                <option value="good">Bonne</option>
                <option value="fair">Acceptable</option>
                <option value="poor">Médiocre</option>
                <option value="unsuitable">Inadéquate</option>
              </Select>
              {errors.irrigation_suitability && (
                <p className="text-red-600 text-sm mt-1">{errors.irrigation_suitability.message}</p>
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
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default WaterAnalysisForm;
