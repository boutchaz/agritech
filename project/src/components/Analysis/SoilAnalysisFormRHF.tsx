import React from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { soilAnalysisSchema, type SoilAnalysisFormValues } from '../../schemas/analysisSchemas';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface Parcel {
  id: string;
  name: string;
  soil_type?: string | null;
}

interface SoilAnalysisFormProps {
  onSave: (values: SoilAnalysisFormValues) => Promise<void>;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

// TextField component using useFormContext
const TextField: React.FC<{
  name: keyof SoilAnalysisFormValues;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ name, label, type = 'text', step, min, max, required, placeholder }) => {
  const { register, formState: { errors } } = useFormContext<SoilAnalysisFormValues>();

  return (
    <FormField label={label} htmlFor={name} required={required}>
      <Input
        id={name}
        type={type}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        {...register(name, { valueAsNumber: type === 'number' })}
        aria-invalid={errors[name] ? 'true' : 'false'}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors[name]?.message as string}
        </p>
      )}
    </FormField>
  );
};

// SelectField component using useFormContext
const SelectField: React.FC<{
  name: keyof SoilAnalysisFormValues;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}> = ({ name, label, options, required }) => {
  const { register, formState: { errors } } = useFormContext<SoilAnalysisFormValues>();

  return (
    <FormField label={label} htmlFor={name} required={required}>
      <Select
        id={name}
        {...register(name)}
        aria-invalid={errors[name] ? 'true' : 'false'}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      >
        <option value="">Sélectionner...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors[name]?.message as string}
        </p>
      )}
    </FormField>
  );
};

// TextareaField component using useFormContext
const TextareaField: React.FC<{
  name: keyof SoilAnalysisFormValues;
  label: string;
  placeholder?: string;
  rows?: number;
}> = ({ name, label, placeholder, rows = 4 }) => {
  const { register, formState: { errors } } = useFormContext<SoilAnalysisFormValues>();

  return (
    <FormField label={label} htmlFor={name}>
      <textarea
        id={name}
        {...register(name)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        rows={rows}
        placeholder={placeholder}
        aria-invalid={errors[name] ? 'true' : 'false'}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors[name]?.message as string}
        </p>
      )}
    </FormField>
  );
};

const SoilAnalysisForm: React.FC<SoilAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const methods = useForm<SoilAnalysisFormValues>({
    resolver: zodResolver(soilAnalysisSchema),
    mode: 'onSubmit',
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      laboratory: '',
      notes: '',
      ph_level: undefined,
      texture: undefined,
      organic_matter_percentage: undefined,
      nitrogen_ppm: undefined,
      phosphorus_ppm: undefined,
      potassium_ppm: undefined,
      calcium_ppm: undefined,
      magnesium_ppm: undefined,
      sulfur_ppm: undefined,
      salinity_level: undefined,
      cec_meq_per_100g: undefined,
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors } } = methods;

  const onSubmit = async (values: SoilAnalysisFormValues) => {
    try {
      await onSave(values);
      methods.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const textureOptions = [
    { value: 'sand', label: 'Sable' },
    { value: 'loamy_sand', label: 'Sable limoneux' },
    { value: 'sandy_loam', label: 'Limon sableux' },
    { value: 'loam', label: 'Limon' },
    { value: 'silt_loam', label: 'Limon argileux' },
    { value: 'silt', label: 'Silt' },
    { value: 'clay_loam', label: 'Argile limoneuse' },
    { value: 'silty_clay_loam', label: 'Argile silteuse limoneuse' },
    { value: 'sandy_clay', label: 'Argile sableuse' },
    { value: 'silty_clay', label: 'Argile silteuse' },
    { value: 'clay', label: 'Argile' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Nouvelle Analyse de Sol</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Annuler"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Parcel Information */}
          {selectedParcel && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Parcelle sélectionnée
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{selectedParcel.name}</strong>
                {selectedParcel.soil_type && (
                  <span> - Type de sol: {selectedParcel.soil_type}</span>
                )}
              </p>
            </div>
          )}

          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              name="analysisDate"
              label="Date d'analyse"
              type="date"
              required
            />
            <TextField
              name="laboratory"
              label="Laboratoire (optionnel)"
              type="text"
              placeholder="Nom du laboratoire"
            />
          </div>

          {/* Physical Properties */}
          <div>
            <h4 className="font-medium mb-4">Propriétés Physiques</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="ph_level"
                label="pH"
                type="number"
                step="0.1"
                min="0"
                max="14"
              />
              <SelectField
                name="texture"
                label="Texture du sol"
                options={textureOptions}
              />
              <TextField
                name="organic_matter_percentage"
                label="Matière organique (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Chemical Properties - Macronutrients */}
          <div>
            <h4 className="font-medium mb-4">Macronutriments (ppm)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                name="nitrogen_ppm"
                label="Azote (N)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="phosphorus_ppm"
                label="Phosphore (P)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="potassium_ppm"
                label="Potassium (K)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="calcium_ppm"
                label="Calcium (Ca)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="magnesium_ppm"
                label="Magnésium (Mg)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="sulfur_ppm"
                label="Soufre (S)"
                type="number"
                step="0.1"
                min="0"
              />
            </div>
          </div>

          {/* Soil Health Indicators */}
          <div>
            <h4 className="font-medium mb-4">Indicateurs de Santé du Sol</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="salinity_level"
                label="Salinité (EC dS/m)"
                type="number"
                step="0.1"
                min="0"
              />
              <TextField
                name="cec_meq_per_100g"
                label="CEC (meq/100g)"
                type="number"
                step="0.1"
                min="0"
              />
            </div>
          </div>

          {/* Notes */}
          <TextareaField
            name="notes"
            label="Notes (optionnel)"
            placeholder="Observations supplémentaires..."
            rows={4}
          />

          {/* Form-level errors */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Veuillez corriger les erreurs dans le formulaire
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SoilAnalysisForm;
