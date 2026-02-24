import React, { useMemo, useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { soilAnalysisSchema, type SoilAnalysisFormValues } from '../../schemas/analysisSchemas';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/checkbox';

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

type SoilParamKey = Exclude<keyof SoilAnalysisFormValues, 'analysisDate' | 'laboratory' | 'notes'>;

interface ParameterItem {
  key: SoilParamKey;
  label: string;
  unit?: string;
  fieldType?: 'number' | 'select';
}

const SOIL_PARAMETER_GROUPS: Array<{ category: string; parameters: ParameterItem[] }> = [
  {
    category: 'Proprietes physiques',
    parameters: [
      { key: 'ph_level', label: 'pH', unit: '' },
      { key: 'texture', label: 'Texture du sol', fieldType: 'select' },
      { key: 'moisture_percentage', label: 'Humidite', unit: '%' },
      { key: 'bulk_density', label: 'Densite apparente', unit: 'g/cm3' },
      { key: 'granulometry_sand_pct', label: 'Granulometrie sable', unit: '%' },
      { key: 'granulometry_silt_pct', label: 'Granulometrie limon', unit: '%' },
      { key: 'granulometry_clay_pct', label: 'Granulometrie argile', unit: '%' },
      { key: 'granulometry_fine_sand_pct', label: 'Granulometrie sable fin', unit: '%' },
      { key: 'granulometry_coarse_sand_pct', label: 'Granulometrie sable grossier', unit: '%' },
    ],
  },
  {
    category: 'Macro elements',
    parameters: [
      { key: 'organic_matter_percentage', label: 'Matiere organique', unit: '%' },
      { key: 'nitrogen_ppm', label: 'Azote total (N)', unit: 'ppm' },
      { key: 'ammonium_nitrogen_ppm', label: 'Azote ammoniacal (N-NH4)', unit: 'ppm' },
      { key: 'nitrate_nitrogen_ppm', label: 'Azote nitrique (N-NO3)', unit: 'ppm' },
      { key: 'phosphorus_ppm', label: 'Phosphore (P)', unit: 'ppm' },
      { key: 'phosphorus_olsen_ppm', label: 'Phosphore Olsen (P2O5)', unit: 'ppm' },
      { key: 'potassium_ppm', label: 'Potassium (K)', unit: 'ppm' },
      { key: 'calcium_ppm', label: 'Calcium (Ca)', unit: 'ppm' },
      { key: 'magnesium_ppm', label: 'Magnesium (Mg)', unit: 'ppm' },
      { key: 'sulfur_ppm', label: 'Soufre (S)', unit: 'ppm' },
      { key: 'sodium_ppm', label: 'Sodium (Na2O)', unit: 'ppm' },
      { key: 'chloride_ppm', label: 'Chlorure (Cl)', unit: 'ppm' },
      { key: 'total_limestone_pct', label: 'Calcaire total', unit: '%' },
      { key: 'active_limestone_pct', label: 'Calcaire actif', unit: '%' },
    ],
  },
  {
    category: 'Oligo-elements',
    parameters: [
      { key: 'iron_ppm', label: 'Fer (Fe)', unit: 'ppm' },
      { key: 'zinc_ppm', label: 'Zinc (Zn)', unit: 'ppm' },
      { key: 'copper_ppm', label: 'Cuivre (Cu)', unit: 'ppm' },
      { key: 'manganese_ppm', label: 'Manganese (Mn)', unit: 'ppm' },
      { key: 'boron_ppm', label: 'Bore (B)', unit: 'ppm' },
      { key: 'silicon_ppm', label: 'Silicium (Si)', unit: 'ppm' },
      { key: 'selenium_ppm', label: 'Selenium (Se)', unit: 'ppm' },
      { key: 'gold_ppm', label: 'Or (Au)', unit: 'ppm' },
      { key: 'lithium_ppm', label: 'Lithium (Li)', unit: 'ppm' },
      { key: 'aluminum_ppm', label: 'Aluminium (Al)', unit: 'ppm' },
      { key: 'antimony_ppm', label: 'Antimoine (Sb)', unit: 'ppm' },
      { key: 'bismuth_ppm', label: 'Bismuth (Bi)', unit: 'ppm' },
    ],
  },
  {
    category: 'Metaux lourds',
    parameters: [
      { key: 'cadmium_ppm', label: 'Cadmium (Cd)', unit: 'ppm' },
      { key: 'lead_ppm', label: 'Plomb (Pb)', unit: 'ppm' },
      { key: 'nickel_ppm', label: 'Nickel (Ni)', unit: 'ppm' },
      { key: 'chromium_ppm', label: 'Chrome (Cr)', unit: 'ppm' },
      { key: 'arsenic_ppm', label: 'Arsenic (As)', unit: 'ppm' },
      { key: 'mercury_ppm', label: 'Mercure (Hg)', unit: 'ppm' },
    ],
  },
  {
    category: 'Cations echangeables',
    parameters: [
      { key: 'cao_meq', label: 'CaO', unit: 'meq/100g' },
      { key: 'mgo_meq', label: 'MgO', unit: 'meq/100g' },
      { key: 'k2o_meq', label: 'K2O', unit: 'meq/100g' },
      { key: 'na2o_meq', label: 'Na2O', unit: 'meq/100g' },
      { key: 'cec_meq_per_100g', label: 'CEC', unit: 'meq/100g' },
      { key: 'base_saturation_percentage', label: 'Saturation des bases', unit: '%' },
    ],
  },
  {
    category: 'Indicateurs du sol',
    parameters: [
      { key: 'salinity_level', label: 'Salinite', unit: 'dS/m' },
      { key: 'electrical_conductivity', label: 'Conductivite electrique', unit: 'dS/m' },
      { key: 'earthworm_count', label: 'Nombre de vers de terre', unit: '' },
      { key: 'biological_carbon', label: 'Carbone biologique', unit: 'ppm' },
    ],
  },
];

const DEFAULT_SOIL_PARAMS: SoilParamKey[] = [
  'ph_level',
  'texture',
  'organic_matter_percentage',
  'nitrogen_ppm',
  'phosphorus_ppm',
  'potassium_ppm',
  'calcium_ppm',
  'magnesium_ppm',
  'sulfur_ppm',
  'salinity_level',
  'cec_meq_per_100g',
];

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
        {...register(name, type === 'number' ? {
          setValueAs: (value: string) => value === '' ? undefined : Number(value),
        } : undefined)}
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
  const [selectedParams, setSelectedParams] = useState<SoilParamKey[]>(DEFAULT_SOIL_PARAMS);

  const selectedParamSet = useMemo(() => new Set(selectedParams), [selectedParams]);
  const selectedCount = selectedParams.length;

  const toggleParam = (key: SoilParamKey, checked: boolean) => {
    setSelectedParams((prev) => {
      if (checked) {
        if (prev.includes(key)) {
          return prev;
        }
        return [...prev, key];
      }
      methods.setValue(key, undefined);
      return prev.filter((item) => item !== key);
    });
  };

  const onSubmit = async (values: SoilAnalysisFormValues) => {
    try {
      const cleanValues: Partial<SoilAnalysisFormValues> = {
        analysisDate: values.analysisDate,
        laboratory: values.laboratory?.trim() || '',
        notes: values.notes?.trim() || '',
      };

      selectedParams.forEach((key) => {
        const value = values[key];
        if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
          Object.assign(cleanValues, { [key]: value });
        }
      });

      await onSave(cleanValues as SoilAnalysisFormValues);
      methods.reset();
      setSelectedParams(DEFAULT_SOIL_PARAMS);
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

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Parametres analyses</p>
            <details className="rounded-md border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                Choisir les parametres testes ({selectedCount})
              </summary>
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 p-4">
                {SOIL_PARAMETER_GROUPS.map((group) => (
                  <div key={group.category}>
                    <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{group.category}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.parameters.map((parameter) => (
                        <label key={parameter.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Checkbox
                            checked={selectedParamSet.has(parameter.key)}
                            onCheckedChange={(checked) => toggleParam(parameter.key, checked === true)}
                          />
                          <span>{parameter.label}{parameter.unit ? ` (${parameter.unit})` : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {SOIL_PARAMETER_GROUPS.map((group) => {
            const visibleParameters = group.parameters.filter((parameter) => selectedParamSet.has(parameter.key));
            if (visibleParameters.length === 0) {
              return null;
            }

            return (
              <div key={`fields-${group.category}`}>
                <h4 className="font-medium mb-4">{group.category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleParameters.map((parameter) => {
                    const label = parameter.unit ? `${parameter.label} (${parameter.unit})` : parameter.label;
                    if (parameter.key === 'texture') {
                      return (
                        <SelectField
                          key={parameter.key}
                          name="texture"
                          label={label}
                          options={textureOptions}
                        />
                      );
                    }

                    return (
                      <TextField
                        key={parameter.key}
                        name={parameter.key}
                        label={label}
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <TextareaField
            name="notes"
            label="Notes (optionnel)"
            placeholder="Observations supplementaires..."
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
