import {  useMemo, useState  } from "react";
import { useTranslation } from 'react-i18next';
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

const createSoilParameterGroups = (t: any): Array<{ category: string; parameters: ParameterItem[] }> => [
  {
    category: t('soilAnalysisForm.categories.physical', 'Physical properties'),
    parameters: [
      { key: 'granulometry_sand_pct', label: t('soilAnalysisForm.parameters.sand', 'Sand'), unit: '%' },
      { key: 'granulometry_silt_pct', label: t('soilAnalysisForm.parameters.silt', 'Silt'), unit: '%' },
      { key: 'granulometry_clay_pct', label: t('soilAnalysisForm.parameters.clay', 'Clay'), unit: '%' },
      { key: 'granulometry_fine_sand_pct', label: t('soilAnalysisForm.parameters.fineSandFraction', 'Fine sand fraction'), unit: '%' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.generalChemical', 'General chemical properties'),
    parameters: [
      { key: 'ph_level', label: t('soilAnalysisForm.parameters.ph', 'pH'), unit: 'pH' },
      { key: 'electrical_conductivity', label: t('soilAnalysisForm.parameters.electricalConductivity', 'Electrical conductivity (EC)'), unit: 'dS/m' },
      { key: 'organic_matter_percentage', label: t('soilAnalysisForm.parameters.organicMatter', 'Organic matter'), unit: '%' },
      { key: 'total_limestone_pct', label: t('soilAnalysisForm.parameters.totalLimestone', 'Total limestone'), unit: '%' },
      { key: 'active_limestone_pct', label: t('soilAnalysisForm.parameters.activeLimestone', 'Active limestone'), unit: '%' },
      { key: 'cec_meq_per_100g', label: t('soilAnalysisForm.parameters.cec', 'CEC'), unit: 'cmol(+)/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.nitrogen', 'Nitrogen'),
    parameters: [
      { key: 'ammonium_nitrogen_ppm', label: t('soilAnalysisForm.parameters.ammoniumNitrogen', 'Ammonium nitrogen (N-NH4)'), unit: 'mg/kg' },
      { key: 'nitrate_nitrogen_ppm', label: t('soilAnalysisForm.parameters.nitrateNitrogen', 'Nitrate nitrogen (N-NO3)'), unit: 'mg/kg' },
      { key: 'nitrogen_ppm', label: t('soilAnalysisForm.parameters.totalMineralNitrogen', 'Total mineral nitrogen'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.phosphorus', 'Phosphorus'),
    parameters: [
      { key: 'phosphorus_olsen_ppm', label: t('soilAnalysisForm.parameters.availablePhosphorus', 'Available phosphorus (P2O5 Olsen)'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.exchangeableCations', 'Exchangeable cations'),
    parameters: [
      { key: 'cao_meq', label: t('soilAnalysisForm.parameters.calcium', 'Calcium (Ca)'), unit: 'cmol(+)/kg' },
      { key: 'mgo_meq', label: t('soilAnalysisForm.parameters.magnesium', 'Magnesium (Mg)'), unit: 'cmol(+)/kg' },
      { key: 'k2o_meq', label: t('soilAnalysisForm.parameters.potassium', 'Potassium (K)'), unit: 'cmol(+)/kg' },
      { key: 'na2o_meq', label: t('soilAnalysisForm.parameters.sodium', 'Sodium (Na)'), unit: 'cmol(+)/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.anions', 'Anions'),
    parameters: [
      { key: 'sulfates_ppm', label: t('soilAnalysisForm.parameters.sulfates', 'Sulfates (SO4)'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.micronutrients', 'Micronutrients'),
    parameters: [
      { key: 'boron_ppm', label: t('soilAnalysisForm.parameters.boron', 'Boron (B)'), unit: 'mg/kg' },
      { key: 'copper_ppm', label: t('soilAnalysisForm.parameters.copper', 'Copper (Cu)'), unit: 'mg/kg' },
      { key: 'iron_ppm', label: t('soilAnalysisForm.parameters.iron', 'Iron (Fe)'), unit: 'mg/kg' },
      { key: 'manganese_ppm', label: t('soilAnalysisForm.parameters.manganese', 'Manganese (Mn)'), unit: 'mg/kg' },
      { key: 'zinc_ppm', label: t('soilAnalysisForm.parameters.zinc', 'Zinc (Zn)'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.heavyMetals', 'Heavy metals'),
    parameters: [
      { key: 'cadmium_ppm', label: t('soilAnalysisForm.parameters.cadmium', 'Cadmium (Cd)'), unit: 'mg/kg' },
      { key: 'lead_ppm', label: t('soilAnalysisForm.parameters.lead', 'Lead (Pb)'), unit: 'mg/kg' },
      { key: 'nickel_ppm', label: t('soilAnalysisForm.parameters.nickel', 'Nickel (Ni)'), unit: 'mg/kg' },
      { key: 'chromium_ppm', label: t('soilAnalysisForm.parameters.chromium', 'Chromium (Cr)'), unit: 'mg/kg' },
      { key: 'arsenic_ppm', label: t('soilAnalysisForm.parameters.arsenic', 'Arsenic (As)'), unit: 'mg/kg' },
      { key: 'mercury_ppm', label: t('soilAnalysisForm.parameters.mercury', 'Mercury (Hg)'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.traceElements', 'Trace elements'),
    parameters: [
      { key: 'silicon_ppm', label: t('soilAnalysisForm.parameters.silicon', 'Silicon (Si)'), unit: 'mg/kg' },
      { key: 'selenium_ppm', label: t('soilAnalysisForm.parameters.selenium', 'Selenium (Se)'), unit: 'mg/kg' },
      { key: 'lithium_ppm', label: t('soilAnalysisForm.parameters.lithium', 'Lithium (Li)'), unit: 'mg/kg' },
      { key: 'aluminum_ppm', label: t('soilAnalysisForm.parameters.aluminum', 'Aluminum (Al)'), unit: 'mg/kg' },
    ],
  },
  {
    category: t('soilAnalysisForm.categories.rareElements', 'Rare elements'),
    parameters: [
      { key: 'gold_ppm', label: t('soilAnalysisForm.parameters.gold', 'Gold (Au)'), unit: 'mg/kg' },
      { key: 'antimony_ppm', label: t('soilAnalysisForm.parameters.antimony', 'Antimony (Sb)'), unit: 'mg/kg' },
      { key: 'bismuth_ppm', label: t('soilAnalysisForm.parameters.bismuth', 'Bismuth (Bi)'), unit: 'mg/kg' },
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
const TextField = ({ name, label, type = 'text', step, min, max, required, placeholder }: {
  name: keyof SoilAnalysisFormValues;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
}) => {
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
const SelectField = ({ name, label, options, required }: {
  name: keyof SoilAnalysisFormValues;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) => {
  const { t } = useTranslation();
  const { register, formState: { errors } } = useFormContext<SoilAnalysisFormValues>();

  return (
    <FormField label={label} htmlFor={name} required={required}>
      <Select
        id={name}
        {...register(name)}
        aria-invalid={errors[name] ? 'true' : 'false'}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      >
        <option value="">{t('soilAnalysisForm.selectPlaceholder', 'Select...')}</option>
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
const TextareaField = ({ name, label, placeholder, rows = 4 }: {
  name: keyof SoilAnalysisFormValues;
  label: string;
  placeholder?: string;
  rows?: number;
}) => {
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

const SoilAnalysisForm = ({ onSave, onCancel, selectedParcel }: SoilAnalysisFormProps) => {
  const { t } = useTranslation();
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
  const soilParameterGroups = useMemo(() => createSoilParameterGroups(t), [t]);
  const textureOptions = useMemo(() => [
    { value: 'sand', label: t('soilAnalysisForm.texture.sand', 'Sand') },
    { value: 'loamy_sand', label: t('soilAnalysisForm.texture.loamySand', 'Loamy sand') },
    { value: 'sandy_loam', label: t('soilAnalysisForm.texture.sandyLoam', 'Sandy loam') },
    { value: 'loam', label: t('soilAnalysisForm.texture.loam', 'Loam') },
    { value: 'silt_loam', label: t('soilAnalysisForm.texture.siltLoam', 'Silt loam') },
    { value: 'silt', label: t('soilAnalysisForm.texture.silt', 'Silt') },
    { value: 'clay_loam', label: t('soilAnalysisForm.texture.clayLoam', 'Clay loam') },
    { value: 'silty_clay_loam', label: t('soilAnalysisForm.texture.siltyClayLoam', 'Silty clay loam') },
    { value: 'sandy_clay', label: t('soilAnalysisForm.texture.sandyClay', 'Sandy clay') },
    { value: 'silty_clay', label: t('soilAnalysisForm.texture.siltyClay', 'Silty clay') },
    { value: 'clay', label: t('soilAnalysisForm.texture.clay', 'Clay') },
  ], [t]);

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{t('soilAnalysisForm.title', 'New Soil Analysis')}</h3>
        <Button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={t('soilAnalysisForm.cancel', 'Cancel')}
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
                {t('soilAnalysisForm.selectedParcel', 'Selected parcel')}
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{selectedParcel.name}</strong>
                {selectedParcel.soil_type && (
                  <span> - {t('soilAnalysisForm.soilType', 'Soil type')}: {selectedParcel.soil_type}</span>
                )}
              </p>
            </div>
          )}

          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              name="analysisDate"
              label={t('soilAnalysisForm.analysisDate', 'Analysis date')}
              type="date"
              required
            />
            <TextField
              name="laboratory"
              label={t('soilAnalysisForm.laboratory', 'Laboratory (optional)')}
              type="text"
              placeholder={t('soilAnalysisForm.laboratoryPlaceholder', 'Laboratory name')}
            />
          </div>

          <SelectField
            name="sampling_depth"
            label={t('soilAnalysisForm.samplingDepth', 'Sampling depth (optional)')}
            options={[
              { value: '0-30', label: t('soilAnalysisForm.depths.0to30', '0 – 30 cm') },
              { value: '30-60', label: t('soilAnalysisForm.depths.30to60', '30 – 60 cm') },
              { value: '60-90', label: t('soilAnalysisForm.depths.60to90', '60 – 90 cm') },
              { value: '90-120', label: t('soilAnalysisForm.depths.90to120', '90 – 120 cm') },
              { value: 'profil_complet', label: t('soilAnalysisForm.depths.fullProfile', 'Full profile') },
            ]}
          />

          <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('soilAnalysisForm.parametersTitle', 'Analysis parameters')}</p>
            <details className="rounded-md border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('soilAnalysisForm.chooseParameters', 'Choose tested parameters')} ({selectedCount})
              </summary>
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 p-4">
                {soilParameterGroups.map((group) => (
                  <div key={group.category}>
                    <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{group.category}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.parameters.map((parameter) => (
                        <label key={parameter.key} htmlFor={`soil-param-${parameter.key}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Checkbox
                            id={`soil-param-${parameter.key}`}
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

          {soilParameterGroups.map((group) => {
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
            label={t('soilAnalysisForm.notes', 'Notes (optional)')}
            placeholder={t('soilAnalysisForm.notesPlaceholder', 'Additional observations...')}
            rows={4}
          />

          {/* Form-level errors */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {t('soilAnalysisForm.formErrors', 'Please correct the errors in the form')}
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
              {t('soilAnalysisForm.cancel', 'Cancel')}
            </Button>
            <Button variant="green" type="submit" className="px-4 py-2 rounded-md flex items-center space-x-2 disabled:cursor-not-allowed" disabled={isSubmitting} >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? t('soilAnalysisForm.saving', 'Saving...') : t('soilAnalysisForm.save', 'Save')}</span>
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SoilAnalysisForm;
