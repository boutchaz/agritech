import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import type { WaterAnalysisData } from '../../types/analysis';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/checkbox';

interface Parcel {
  id: string;
  name: string;
}

interface WaterAnalysisFormProps {
  onSave: (data: WaterAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

type WaterParamKey = Exclude<keyof WaterAnalysisData, 'water_source'>;

interface ParameterItem {
  key: WaterParamKey;
  label: string;
  unit?: string;
  fieldType?: 'number' | 'select';
}

const WATER_PARAMETER_GROUPS: Array<{ category: string; parameters: ParameterItem[] }> = [
  {
    category: 'Proprietes physiques',
    parameters: [
      { key: 'ph_level', label: 'pH' },
      { key: 'temperature_celsius', label: 'Temperature', unit: 'degC' },
      { key: 'turbidity_ntu', label: 'Turbidite', unit: 'NTU' },
      { key: 'ec_ds_per_m', label: 'Conductivite electrique', unit: 'dS/m' },
      { key: 'tds_ppm', label: 'TDS', unit: 'ppm' },
    ],
  },
  {
    category: 'Macro elements',
    parameters: [
      { key: 'calcium_ppm', label: 'Calcium (Ca)', unit: 'ppm' },
      { key: 'magnesium_ppm', label: 'Magnesium (Mg)', unit: 'ppm' },
      { key: 'sodium_ppm', label: 'Sodium (Na)', unit: 'ppm' },
      { key: 'potassium_ppm', label: 'Potassium (K)', unit: 'ppm' },
      { key: 'ammonium_ppm', label: 'Ammonium (NH4)', unit: 'ppm' },
      { key: 'bicarbonate_ppm', label: 'Bicarbonate (HCO3)', unit: 'ppm' },
      { key: 'carbonate_ppm', label: 'Carbonate (CO3)', unit: 'ppm' },
      { key: 'chloride_ppm', label: 'Chlorure (Cl)', unit: 'ppm' },
      { key: 'sulfate_ppm', label: 'Sulfate (SO4)', unit: 'ppm' },
      { key: 'nitrate_ppm', label: 'Nitrate (NO3)', unit: 'ppm' },
      { key: 'phosphate_ppm', label: 'Phosphate (PO4)', unit: 'ppm' },
      { key: 'h2po4_ppm', label: 'H2PO4', unit: 'ppm' },
    ],
  },
  {
    category: 'Oligo-elements',
    parameters: [
      { key: 'iron_ppm', label: 'Fer (Fe)', unit: 'ppm' },
      { key: 'manganese_ppm', label: 'Manganese (Mn)', unit: 'ppm' },
      { key: 'zinc_ppm', label: 'Zinc (Zn)', unit: 'ppm' },
      { key: 'copper_ppm', label: 'Cuivre (Cu)', unit: 'ppm' },
      { key: 'boron_ppm', label: 'Bore (B)', unit: 'ppm' },
      { key: 'cobalt_ppm', label: 'Cobalt (Co)', unit: 'ppm' },
      { key: 'silver_ppm', label: 'Argent (Ag)', unit: 'ppm' },
      { key: 'barium_ppm', label: 'Barium (Ba)', unit: 'ppm' },
      { key: 'vanadium_ppm', label: 'Vanadium (V)', unit: 'ppm' },
      { key: 'nickel_ppm', label: 'Nickel (Ni)', unit: 'ppm' },
      { key: 'chromium_ppm', label: 'Chrome (Cr)', unit: 'ppm' },
      { key: 'molybdenum_ppm', label: 'Molybdene (Mo)', unit: 'ppm' },
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
      { key: 'lead_ppb', label: 'Plomb (Pb)', unit: 'ppb' },
      { key: 'cadmium_ppb', label: 'Cadmium (Cd)', unit: 'ppb' },
      { key: 'arsenic_ppb', label: 'Arsenic (As)', unit: 'ppb' },
      { key: 'mercury_ppb', label: 'Mercure (Hg)', unit: 'ppb' },
      { key: 'cadmium_ppm', label: 'Cadmium (Cd)', unit: 'ppm' },
      { key: 'mercury_ppm', label: 'Mercure (Hg)', unit: 'ppm' },
    ],
  },
  {
    category: 'Indicateurs de qualite',
    parameters: [
      { key: 'sar', label: 'SAR' },
      { key: 'hardness_ppm', label: 'Durete (CaCO3)', unit: 'ppm' },
      { key: 'alkalinity_ppm', label: 'Alcalinite (CaCO3)', unit: 'ppm' },
      { key: 'irrigation_suitability', label: 'Convenance irrigation', fieldType: 'select' },
    ],
  },
];

const DEFAULT_WATER_PARAMS: WaterParamKey[] = [
  'ph_level',
  'ec_ds_per_m',
  'tds_ppm',
  'calcium_ppm',
  'magnesium_ppm',
  'sodium_ppm',
  'chloride_ppm',
  'sulfate_ppm',
  'nitrate_ppm',
  'sar',
  'hardness_ppm',
];

const waterAnalysisSchema = z.object({
  analysisDate: z.string().min(1, 'La date d\'analyse est requise'),
  water_source: z.enum(['well', 'river', 'irrigation', 'rainwater', 'municipal', 'other']),
  laboratory: z.string().optional(),
  notes: z.string().optional(),
  ph_level: z.string().optional(),
  temperature_celsius: z.string().optional(),
  turbidity_ntu: z.string().optional(),
  ec_ds_per_m: z.string().optional(),
  tds_ppm: z.string().optional(),
  calcium_ppm: z.string().optional(),
  magnesium_ppm: z.string().optional(),
  sodium_ppm: z.string().optional(),
  potassium_ppm: z.string().optional(),
  ammonium_ppm: z.string().optional(),
  bicarbonate_ppm: z.string().optional(),
  carbonate_ppm: z.string().optional(),
  chloride_ppm: z.string().optional(),
  sulfate_ppm: z.string().optional(),
  nitrate_ppm: z.string().optional(),
  phosphate_ppm: z.string().optional(),
  h2po4_ppm: z.string().optional(),
  iron_ppm: z.string().optional(),
  manganese_ppm: z.string().optional(),
  zinc_ppm: z.string().optional(),
  copper_ppm: z.string().optional(),
  boron_ppm: z.string().optional(),
  cobalt_ppm: z.string().optional(),
  silver_ppm: z.string().optional(),
  barium_ppm: z.string().optional(),
  vanadium_ppm: z.string().optional(),
  nickel_ppm: z.string().optional(),
  chromium_ppm: z.string().optional(),
  molybdenum_ppm: z.string().optional(),
  silicon_ppm: z.string().optional(),
  selenium_ppm: z.string().optional(),
  gold_ppm: z.string().optional(),
  lithium_ppm: z.string().optional(),
  aluminum_ppm: z.string().optional(),
  antimony_ppm: z.string().optional(),
  bismuth_ppm: z.string().optional(),
  lead_ppb: z.string().optional(),
  cadmium_ppb: z.string().optional(),
  arsenic_ppb: z.string().optional(),
  mercury_ppb: z.string().optional(),
  cadmium_ppm: z.string().optional(),
  mercury_ppm: z.string().optional(),
  sar: z.string().optional(),
  hardness_ppm: z.string().optional(),
  alkalinity_ppm: z.string().optional(),
  irrigation_suitability: z.enum(['excellent', 'good', 'fair', 'poor', 'unsuitable']).optional(),
});

type WaterAnalysisFormData = z.infer<typeof waterAnalysisSchema>;

const WaterAnalysisForm: React.FC<WaterAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { handleFormError } = useFormErrors<WaterAnalysisFormData>();
  const [selectedParams, setSelectedParams] = useState<WaterParamKey[]>(DEFAULT_WATER_PARAMS);
  const selectedParamSet = useMemo(() => new Set(selectedParams), [selectedParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
  } = useForm<WaterAnalysisFormData>({
    resolver: zodResolver(waterAnalysisSchema),
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      water_source: 'well',
      laboratory: '',
      notes: '',
    },
  });

  const toggleParam = (key: WaterParamKey, checked: boolean) => {
    setSelectedParams((prev) => {
      if (checked) {
        if (prev.includes(key)) {
          return prev;
        }
        return [...prev, key];
      }
      setValue(key as keyof WaterAnalysisFormData, undefined);
      return prev.filter((item) => item !== key);
    });
  };

  const onSubmit = async (formData: WaterAnalysisFormData) => {
    try {
      const parseNumber = (value: string | undefined) => {
        if (!value || value.trim() === '') {
          return undefined;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      };

      const cleanWaterData: WaterAnalysisData = {
        water_source: formData.water_source,
      };

      selectedParams.forEach((key) => {
        if (key === 'irrigation_suitability') {
          if (formData.irrigation_suitability) {
            cleanWaterData.irrigation_suitability = formData.irrigation_suitability;
          }
          return;
        }

        const value = parseNumber(formData[key as keyof WaterAnalysisFormData] as string | undefined);
        if (value !== undefined) {
          (cleanWaterData[key] as number | undefined) = value;
        }
      });

      onSave(
        cleanWaterData,
        formData.analysisDate,
        formData.laboratory?.trim() || undefined,
        formData.notes?.trim() || undefined,
      );
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
              Parcelle selectionnee
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{selectedParcel.name}</strong>
            </p>
          </div>
        )}

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

        <FormField label="Source" htmlFor="water_source" required>
          <Select
            id="water_source"
            {...register('water_source')}
            invalid={!!errors.water_source}
            required
          >
            <option value="well">Puits</option>
            <option value="river">Riviere</option>
            <option value="irrigation">Irrigation</option>
            <option value="rainwater">Eau de pluie</option>
            <option value="municipal">Reseau municipal</option>
            <option value="other">Autre</option>
          </Select>
          {errors.water_source && (
            <p className="text-red-600 text-sm mt-1">{errors.water_source.message}</p>
          )}
        </FormField>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Parametres analyses</p>
          <details className="rounded-md border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              Choisir les parametres testes ({selectedParams.length})
            </summary>
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 p-4">
              {WATER_PARAMETER_GROUPS.map((group) => (
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

        {WATER_PARAMETER_GROUPS.map((group) => {
          const visibleParameters = group.parameters.filter((parameter) => selectedParamSet.has(parameter.key));
          if (visibleParameters.length === 0) {
            return null;
          }

          return (
            <div key={`group-${group.category}`}>
              <h4 className="font-medium mb-4">{group.category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleParameters.map((parameter) => {
                  const fieldName = parameter.key as keyof WaterAnalysisFormData;
                  const label = parameter.unit ? `${parameter.label} (${parameter.unit})` : parameter.label;
                  if (parameter.fieldType === 'select' && parameter.key === 'irrigation_suitability') {
                    return (
                      <FormField key={parameter.key} label={label} htmlFor={parameter.key}>
                        <Select id={parameter.key} {...register('irrigation_suitability')}>
                          <option value="">Selectionner...</option>
                          <option value="excellent">Excellente</option>
                          <option value="good">Bonne</option>
                          <option value="fair">Acceptable</option>
                          <option value="poor">Mediocre</option>
                          <option value="unsuitable">Inadequate</option>
                        </Select>
                      </FormField>
                    );
                  }

                  return (
                    <FormField key={parameter.key} label={label} htmlFor={parameter.key}>
                      <Input
                        id={parameter.key}
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(fieldName)}
                      />
                    </FormField>
                  );
                })}
              </div>
            </div>
          );
        })}

        <FormField label="Notes (optionnel)" htmlFor="notes">
          <textarea
            id="notes"
            {...register('notes')}
            className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.notes ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
            }`}
            rows={4}
            placeholder="Observations supplementaires..."
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
          )}
        </FormField>

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
