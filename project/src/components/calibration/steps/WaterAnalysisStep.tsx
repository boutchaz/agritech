import { useEffect } from 'react';
import { Controller, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  calibrationWizardDefaultValues,
  type CalibrationWizardFormValues,
} from '@/schemas/calibrationWizardSchema';

interface WaterAnalysisStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

interface WaterParameterConfig {
  name: FieldPath<CalibrationWizardFormValues>;
  label: string;
  unit?: string;
  inputType: 'number' | 'text';
}

const PRIORITAIRE_PARAMS: WaterParameterConfig[] = [
  { name: 'water_analysis_parameters.prioritaire.ec_water', label: 'CE eau', unit: 'dS/m', inputType: 'number' },
  { name: 'water_analysis_parameters.prioritaire.ph_water', label: 'pH eau', inputType: 'number' },
  { name: 'water_analysis_parameters.prioritaire.sar', label: 'SAR', inputType: 'number' },
  { name: 'water_analysis_parameters.prioritaire.sodium_meq', label: 'Sodium (Na+)', unit: 'meq/L', inputType: 'number' },
  { name: 'water_analysis_parameters.prioritaire.chlorides_meq', label: 'Chlorures (Cl-)', unit: 'meq/L', inputType: 'number' },
];

const RECOMMANDE_PARAMS: WaterParameterConfig[] = [
  { name: 'water_analysis_parameters.recommande.bicarbonates_meq', label: 'Bicarbonates (HCO3-)', unit: 'meq/L', inputType: 'number' },
  { name: 'water_analysis_parameters.recommande.calcium_meq', label: 'Calcium (Ca2+)', unit: 'meq/L', inputType: 'number' },
  { name: 'water_analysis_parameters.recommande.magnesium_meq', label: 'Magnesium (Mg2+)', unit: 'meq/L', inputType: 'number' },
  { name: 'water_analysis_parameters.recommande.nitrates_mg', label: 'Nitrates (NO3-)', unit: 'mg/L', inputType: 'number' },
];

const OPTIONNEL_PARAMS: WaterParameterConfig[] = [
  { name: 'water_analysis_parameters.optionnel.boron_mg', label: 'Bore (B)', unit: 'mg/L', inputType: 'number' },
  { name: 'water_analysis_parameters.optionnel.sulfates_meq', label: 'Sulfates (SO4)', unit: 'meq/L', inputType: 'number' },
  { name: 'water_analysis_parameters.optionnel.other_text', label: 'Autres', inputType: 'text' },
];

function WaterParamField({ form, config }: { form: UseFormReturn<CalibrationWizardFormValues>; config: WaterParameterConfig }) {
  const watchedValue = form.watch(config.name);
  const isChecked = watchedValue !== undefined && watchedValue !== '';

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <label htmlFor={config.name} className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => {
            if (!checked) {
              form.setValue(config.name, undefined);
            }
          }}
        />
        <span>
          {config.label}
          {config.unit ? ` (${config.unit})` : ''}
        </span>
      </label>

      {isChecked && (
        <Controller
          control={form.control}
          name={config.name}
          render={({ field }) => (
            <Input
              id={config.name}
              type={config.inputType}
              step={config.inputType === 'number' ? '0.01' : undefined}
              value={field.value == null ? '' : String(field.value)}
              onChange={(event) => {
                if (config.inputType === 'number') {
                  field.onChange(event.target.value === '' ? undefined : Number(event.target.value));
                  return;
                }
                field.onChange(event.target.value);
              }}
            />
          )}
        />
      )}
    </div>
  );
}

function WaterParameterGroup({ title, subtitle, params, form }: { title: string; subtitle: string; params: WaterParameterConfig[]; form: UseFormReturn<CalibrationWizardFormValues> }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {params.map((config) => (
          <WaterParamField key={config.name} form={form} config={config} />
        ))}
      </div>
    </div>
  );
}

export function WaterAnalysisStep({ form }: WaterAnalysisStepProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const availability = watch('water_analysis_available');
  const hasReport = availability === 'yes';

  useEffect(() => {
    if (!hasReport) {
      form.setValue('water_analysis_date', undefined);
      form.setValue(
        'water_analysis_parameters',
        calibrationWizardDefaultValues.water_analysis_parameters,
      );
    }
  }, [hasReport, form]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Analyse eau disponible ?" htmlFor="water_analysis_available" required error={errors.water_analysis_available?.message}>
          <Select id="water_analysis_available" {...register('water_analysis_available')}>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="upcoming">A venir</option>
          </Select>
        </FormField>

        <FormField label="Date analyse" htmlFor="water_analysis_date" error={errors.water_analysis_date?.message}>
          <Input id="water_analysis_date" type="month" {...register('water_analysis_date')} invalid={!!errors.water_analysis_date} />
        </FormField>
      </div>

      {!hasReport && (
        <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
          Sans analyse eau, la strategie hydrique et la gestion de la salinite seront moins precises.
        </div>
      )}

      {hasReport && (
        <div className="space-y-6">
          <WaterParameterGroup title="Prioritaire" subtitle="Necessaire pour bilan salinite/sodicite" params={PRIORITAIRE_PARAMS} form={form} />
          <WaterParameterGroup title="Recommande" subtitle="Ameliore la recommandation hydrique" params={RECOMMANDE_PARAMS} form={form} />
          <WaterParameterGroup title="Optionnel" subtitle="Informations complementaires" params={OPTIONNEL_PARAMS} form={form} />
        </div>
      )}
    </div>
  );
}
