import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { useFormErrors } from '@/hooks/useFormErrors';
import type { PlantAnalysisData } from '../../types/analysis';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '@/components/ui/button';

interface Parcel {
  id: string;
  name: string;
}

interface PlantAnalysisFormProps {
  onSave: (data: PlantAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

type PlantParamKey = Exclude<keyof PlantAnalysisData, 'plant_part' | 'growth_stage' | 'stress_indicators'>;

interface ParameterItem {
  key: PlantParamKey;
  label: string;
  unit?: string;
}

const PLANT_PARAMETER_GROUPS: Array<{ category: string; parameters: ParameterItem[] }> = [
  {
    category: 'Macro-éléments',
    parameters: [
      { key: 'nitrogen_percentage', label: 'Azote (N)', unit: '%' },
      { key: 'phosphorus_percentage', label: 'Phosphore (P)', unit: '%' },
      { key: 'potassium_percentage', label: 'Potassium (K)', unit: '%' },
      { key: 'calcium_percentage', label: 'Calcium (Ca)', unit: '%' },
      { key: 'magnesium_percentage', label: 'Magnésium (Mg)', unit: '%' },
      { key: 'sodium_percentage', label: 'Sodium (Na)', unit: '%' },
      { key: 'chlorine_percentage', label: 'Chlore (Cl)', unit: '%' },
      { key: 'sulfur_percentage', label: 'Soufre (S)', unit: '%' },
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
      { key: 'arsenic_ppm', label: 'Arsenic (As)', unit: 'mg/kg' },
      { key: 'nickel_ppm', label: 'Nickel (Ni)', unit: 'mg/kg' },
      { key: 'chromium_ppm', label: 'Chrome (Cr)', unit: 'mg/kg' },
      { key: 'mercury_ppm', label: 'Mercure (Hg)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Éléments traces',
    parameters: [
      { key: 'cobalt_ppm', label: 'Cobalt (Co)', unit: 'mg/kg' },
      { key: 'silver_ppm', label: 'Argent (Ag)', unit: 'mg/kg' },
      { key: 'barium_ppm', label: 'Baryum (Ba)', unit: 'mg/kg' },
      { key: 'vanadium_ppm', label: 'Vanadium (V)', unit: 'mg/kg' },
      { key: 'molybdenum_ppm', label: 'Molybdène (Mo)', unit: 'mg/kg' },
    ],
  },
  {
    category: 'Éléments secondaires',
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

const DEFAULT_PLANT_PARAMS: PlantParamKey[] = [
  'nitrogen_percentage',
  'phosphorus_percentage',
  'potassium_percentage',
  'calcium_percentage',
  'magnesium_percentage',
  'sulfur_percentage',
];

const plantAnalysisSchema = z.object({
  analysisDate: z.string().min(1, 'La date d\'analyse est requise'),
  plant_part: z.enum(['leaf', 'stem', 'root', 'fruit', 'whole_plant']),
  growth_stage: z.string().optional(),
  laboratory: z.string().optional(),
  notes: z.string().optional(),
  nitrogen_percentage: z.string().optional(),
  phosphorus_percentage: z.string().optional(),
  potassium_percentage: z.string().optional(),
  calcium_percentage: z.string().optional(),
  magnesium_percentage: z.string().optional(),
  sulfur_percentage: z.string().optional(),
  sodium_percentage: z.string().optional(),
  chlorine_percentage: z.string().optional(),
  iron_ppm: z.string().optional(),
  zinc_ppm: z.string().optional(),
  copper_ppm: z.string().optional(),
  manganese_ppm: z.string().optional(),
  boron_ppm: z.string().optional(),
  molybdenum_ppm: z.string().optional(),
  chlorine_ppm: z.string().optional(),
  cadmium_ppm: z.string().optional(),
  lead_ppm: z.string().optional(),
  arsenic_ppm: z.string().optional(),
  cobalt_ppm: z.string().optional(),
  silver_ppm: z.string().optional(),
  barium_ppm: z.string().optional(),
  vanadium_ppm: z.string().optional(),
  nickel_ppm: z.string().optional(),
  chromium_ppm: z.string().optional(),
  mercury_ppm: z.string().optional(),
  silicon_ppm: z.string().optional(),
  selenium_ppm: z.string().optional(),
  gold_ppm: z.string().optional(),
  lithium_ppm: z.string().optional(),
  aluminum_ppm: z.string().optional(),
  antimony_ppm: z.string().optional(),
  bismuth_ppm: z.string().optional(),
  dry_matter_percentage: z.string().optional(),
  moisture_percentage: z.string().optional(),
  chlorophyll_content: z.string().optional(),
});

type PlantAnalysisFormData = z.infer<typeof plantAnalysisSchema>;

const PlantAnalysisForm: React.FC<PlantAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const { handleFormError } = useFormErrors<PlantAnalysisFormData>();
  const [selectedParams, setSelectedParams] = useState<PlantParamKey[]>(DEFAULT_PLANT_PARAMS);
  const selectedParamSet = useMemo(() => new Set(selectedParams), [selectedParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<PlantAnalysisFormData>({
    resolver: zodResolver(plantAnalysisSchema),
    defaultValues: {
      analysisDate: new Date().toISOString().split('T')[0],
      plant_part: 'leaf',
      growth_stage: '',
      laboratory: '',
      notes: '',
    },
  });

  const toggleParam = (key: PlantParamKey, checked: boolean) => {
    setSelectedParams((prev) => {
      if (checked) {
        if (prev.includes(key)) {
          return prev;
        }
        return [...prev, key];
      }
      setValue(key as keyof PlantAnalysisFormData, undefined);
      return prev.filter((item) => item !== key);
    });
  };

  const onSubmit = async (formData: PlantAnalysisFormData) => {
    try {
      const parseNumber = (value: string | undefined) => {
        if (!value || value.trim() === '') {
          return undefined;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      };

      const cleanData: PlantAnalysisData = {
        plant_part: formData.plant_part,
        growth_stage: formData.growth_stage?.trim() || undefined,
      };

      selectedParams.forEach((key) => {
        const parsed = parseNumber(formData[key as keyof PlantAnalysisFormData] as string | undefined);
        if (parsed !== undefined) {
          (cleanData[key] as number | undefined) = parsed;
        }
      });

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
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {selectedParcel && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
              Parcelle selectionnee
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
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

        <div>
          <h4 className="font-medium mb-4">Informations sur l'echantillon</h4>
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
                <option value="whole_plant">Plante entiere</option>
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

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Parametres analyses</p>
          <details className="rounded-md border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              Choisir les parametres testes ({selectedParams.length})
            </summary>
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 p-4">
              {PLANT_PARAMETER_GROUPS.map((group) => (
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

        {PLANT_PARAMETER_GROUPS.map((group) => {
          const visibleParameters = group.parameters.filter((parameter) => selectedParamSet.has(parameter.key));
          if (visibleParameters.length === 0) {
            return null;
          }

          return (
            <div key={`group-${group.category}`}>
              <h4 className="font-medium mb-4">{group.category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleParameters.map((parameter) => {
                  const label = parameter.unit ? `${parameter.label} (${parameter.unit})` : parameter.label;
                  return (
                    <FormField key={parameter.key} label={label} htmlFor={parameter.key}>
                      <Input
                        id={parameter.key}
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(parameter.key as keyof PlantAnalysisFormData)}
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
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PlantAnalysisForm;
