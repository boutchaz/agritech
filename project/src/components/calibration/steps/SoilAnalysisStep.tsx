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

interface SoilAnalysisStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

interface SoilParameterConfig {
  name: FieldPath<CalibrationWizardFormValues>;
  label: string;
  unit?: string;
  placeholder?: string;
  inputType: 'number' | 'text';
}

const PRIORITAIRE_PARAMS: SoilParameterConfig[] = [
  { name: 'soil_analysis_parameters.prioritaire.ph', label: 'pH', placeholder: '0-14', inputType: 'number' },
  { name: 'soil_analysis_parameters.prioritaire.ec_ds_m', label: 'Conductivite electrique', unit: 'dS/m', inputType: 'number' },
  { name: 'soil_analysis_parameters.prioritaire.texture', label: 'Texture globale', placeholder: 'Sableux / Limoneux / Argileux / Mixte', inputType: 'text' },
  { name: 'soil_analysis_parameters.prioritaire.organic_matter_pct', label: 'Matiere organique', unit: '%', inputType: 'number' },
];

const RECOMMANDE_PARAMS: SoilParameterConfig[] = [
  { name: 'soil_analysis_parameters.recommande.phosphorus_ppm', label: 'Phosphore assimilable', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.potassium_ppm', label: 'Potassium echangeable', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.calcium_ppm', label: 'Calcium echangeable', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.magnesium_ppm', label: 'Magnesium echangeable', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.total_limestone_pct', label: 'Calcaire total', unit: '%', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.active_limestone_pct', label: 'Calcaire actif', unit: '%', inputType: 'number' },
  { name: 'soil_analysis_parameters.recommande.root_depth_cm', label: 'Profondeur exploitee', unit: 'cm', inputType: 'number' },
];

const OPTIONNEL_PARAMS: SoilParameterConfig[] = [
  { name: 'soil_analysis_parameters.optionnel.nitrogen_ppm', label: 'Azote total', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.iron_ppm', label: 'Fer', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.zinc_ppm', label: 'Zinc', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.manganese_ppm', label: 'Manganese', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.boron_ppm', label: 'Bore', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.copper_ppm', label: 'Cuivre', unit: 'ppm', inputType: 'number' },
  { name: 'soil_analysis_parameters.optionnel.other_text', label: 'Autres', placeholder: 'Parametre + unite + valeur', inputType: 'text' },
];

function SoilParamField({ form, config }: { form: UseFormReturn<CalibrationWizardFormValues>; config: SoilParameterConfig }) {
  const watchedValue = form.watch(config.name);
  const isChecked = watchedValue !== undefined;

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <label htmlFor={config.name} className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => {
            if (checked) {
              form.setValue(config.name, '' as never);
            } else {
              form.setValue(config.name, undefined as never);
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
              placeholder={config.placeholder}
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

function SoilParameterGroup({ title, subtitle, params, form }: { title: string; subtitle: string; params: SoilParameterConfig[]; form: UseFormReturn<CalibrationWizardFormValues> }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {params.map((config) => (
          <SoilParamField key={config.name} form={form} config={config} />
        ))}
      </div>
    </div>
  );
}

export function SoilAnalysisStep({ form }: SoilAnalysisStepProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const availability = watch('soil_analysis_available');
  const hasReport = availability === 'yes';

  useEffect(() => {
    if (!hasReport) {
      form.setValue('soil_analysis_date', undefined);
      form.setValue('soil_analysis_laboratory', undefined);
      form.setValue(
        'soil_analysis_parameters',
        calibrationWizardDefaultValues.soil_analysis_parameters,
      );
    }
  }, [hasReport, form]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Analyse sol disponible ?" htmlFor="soil_analysis_available" required error={errors.soil_analysis_available?.message}>
          <Select id="soil_analysis_available" {...register('soil_analysis_available')}>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="upcoming">A venir</option>
          </Select>
        </FormField>

        <FormField label="Date analyse" htmlFor="soil_analysis_date" error={errors.soil_analysis_date?.message}>
          <Input id="soil_analysis_date" type="month" {...register('soil_analysis_date')} invalid={!!errors.soil_analysis_date} />
        </FormField>

        <FormField label="Laboratoire / source" htmlFor="soil_analysis_laboratory" error={errors.soil_analysis_laboratory?.message}>
          <Input id="soil_analysis_laboratory" {...register('soil_analysis_laboratory')} invalid={!!errors.soil_analysis_laboratory} />
        </FormField>
      </div>

      {!hasReport && (
        <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
          L'analyse de sol est absente ou a venir. Le calibrage reste possible, mais le niveau de confiance sera reduit.
        </div>
      )}

      {hasReport && (
        <div className="space-y-6">
          <SoilParameterGroup title="Prioritaire" subtitle="Impact direct sur precision calibration" params={PRIORITAIRE_PARAMS} form={form} />
          <SoilParameterGroup title="Recommande" subtitle="Ameliore la finesse des recommandations" params={RECOMMANDE_PARAMS} form={form} />
          <SoilParameterGroup title="Optionnel" subtitle="Informations complementaires" params={OPTIONNEL_PARAMS} form={form} />
        </div>
      )}
    </div>
  );
}
