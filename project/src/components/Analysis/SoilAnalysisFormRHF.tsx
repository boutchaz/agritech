import React, { useMemo, useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { soilAnalysisSchema, type SoilAnalysisFormValues } from '../../schemas/analysisSchemas';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '@/components/ui/button';

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

type SoilParamKey = Exclude<keyof SoilAnalysisFormValues, 'analysisDate' | 'laboratory' | 'notes' | 'sampling_depth'>;

interface ParameterItem {
  key: SoilParamKey;
  label: string;
  unit?: string;
  fieldType?: 'number' | 'select';
}

const SOIL_PARAMETER_GROUPS: Array<{ category: string; parameters: ParameterItem[] }> = [
  {
    category: 'Propriétés physiques',
    parameters: [
      { key: 'granulometry_sand_pct', label: 'Sable', unit: '%' },
      { key: 'granulometry_silt_pct', label: 'Limon', unit: '%' },
      { key: 'granulometry_clay_pct', label: 'Argile', unit: '%' },
      { key: 'granulometry_fine_sand_pct', label: 'Granulométrie fractions', unit: '%' },
    ],
  },
  {
    category: 'Propriétés chimiques générales',
    parameters: [
      { key: 'ph_level', label: 'pH', unit: 'pH' },
      { key: 'electrical_conductivity', label: 'Conductivité électrique (CE)', unit: 'dS/m' },
      { key: 'organic_matter_percentage', label: 'Matière organique', unit: '%' },
      { key: 'total_limestone_pct', label: 'Calcaire total', unit: '%' },
      { key: 'active_limestone_pct', label: 'Calcaire actif', unit: '%' },
      { key: 'cec_meq_per_100g', label: 'CEC', unit: 'cmol(+)/kg' },
    ],
  },
  {
    category: 'Azote',
    parameters: [
      { key: 'ammonium_nitrogen_ppm', label: 'Azote ammoniacal (N-NH4)', unit: 'mg/kg' },
      { key: 'nitrate_nitrogen_ppm', label: 'Azote nitrique (N-NO3)', unit: 'mg/kg' },
      { key: 'nitrogen_ppm', label: 'Azote minéral total', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Phosphore',
    parameters: [
      { key: 'phosphorus_olsen_ppm', label: 'Phosphore assimilable (P2O5 Olsen)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Cations échangeables',
    parameters: [
      { key: 'cao_meq', label: 'Calcium (Ca)', unit: 'cmol(+)/kg' },
      { key: 'mgo_meq', label: 'Magnésium (Mg)', unit: 'cmol(+)/kg' },
      { key: 'k2o_meq', label: 'Potassium (K)', unit: 'cmol(+)/kg' },
      { key: 'na2o_meq', label: 'Sodium (Na)', unit: 'cmol(+)/kg' },
    ],
  },
  {
    category: 'Anions',
    parameters: [
      { key: 'sulfates_ppm', label: 'Sulfates (SO4)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Oligo-éléments',
    parameters: [
      { key: 'boron_ppm', label: 'Bore (B)', unit: 'mg/kg' },
      { key: 'copper_ppm', label: 'Cuivre (Cu)', unit: 'mg/kg' },
      { key: 'iron_ppm', label: 'Fer (Fe)', unit: 'mg/kg' },
      { key: 'manganese_ppm', label: 'Manganèse (Mn)', unit: 'mg/kg' },
      { key: 'zinc_ppm', label: 'Zinc (Zn)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Métaux lourds',
    parameters: [
      { key: 'cadmium_ppm', label: 'Cadmium (Cd)', unit: 'mg/kg' },
      { key: 'lead_ppm', label: 'Plomb (Pb)', unit: 'mg/kg' },
      { key: 'nickel_ppm', label: 'Nickel (Ni)', unit: 'mg/kg' },
      { key: 'chromium_ppm', label: 'Chrome (Cr)', unit: 'mg/kg' },
      { key: 'arsenic_ppm', label: 'Arsenic (As)', unit: 'mg/kg' },
      { key: 'mercury_ppm', label: 'Mercure (Hg)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Éléments traces',
    parameters: [
      { key: 'silicon_ppm', label: 'Silicium (Si)', unit: 'mg/kg' },
      { key: 'selenium_ppm', label: 'Sélénium (Se)', unit: 'mg/kg' },
      { key: 'lithium_ppm', label: 'Lithium (Li)', unit: 'mg/kg' },
      { key: 'aluminum_ppm', label: 'Aluminium (Al)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Éléments rares',
    parameters: [
      { key: 'gold_ppm', label: 'Or (Au)', unit: 'mg/kg' },
      { key: 'antimony_ppm', label: 'Antimoine (Sb)', unit: 'mg/kg' },
      { key: 'bismuth_ppm', label: 'Bismuth (Bi)', unit: 'mg/kg' },
    ],
  },
];

const DEFAULT_SOIL_PARAMS: SoilParamKey[] = [
  'ph_level',
  'electrical_conductivity',
  'organic_matter_percentage',
  'total_limestone_pct',
  'active_limestone_pct',
  'nitrogen_ppm',
  'phosphorus_olsen_ppm',
  'cao_meq',
  'mgo_meq',
  'k2o_meq',
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
          setValueAs: (v: string) => {
            if (v === '' || v == null) return undefined;
            const n = parseFloat(v);
            return Number.isNaN(n) ? undefined : n;
          },
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
      sampling_depth: '',
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

      if (values.sampling_depth) {
        cleanValues.sampling_depth = values.sampling_depth;
      }

      selectedParams.forEach((key) => {
        const value = values[key];
        if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
          Object.assign(cleanValues, { [key]: value });
        }
      });

      await onSave(cleanValues as SoilAnalysisFormValues);
      methods.reset({ analysisDate: new Date().toISOString().split('T')[0], laboratory: '', notes: '', sampling_depth: '' });
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
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Annuler"
        >
          <X className="h-5 w-5" />
        </Button>
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

          <SelectField
            name="sampling_depth"
            label="Profondeur de prélèvement (optionnel)"
            options={[
              { value: '0-30', label: '0 – 30 cm' },
              { value: '30-60', label: '30 – 60 cm' },
              { value: '60-90', label: '60 – 90 cm' },
              { value: '90-120', label: '90 – 120 cm' },
              { value: 'profil_complet', label: 'Profil complet' },
            ]}
          />

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
            <Button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SoilAnalysisForm;
