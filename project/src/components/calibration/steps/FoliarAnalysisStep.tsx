import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Controller, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  calibrationWizardDefaultValues,
  type CalibrationWizardFormValues,
} from '@/schemas/calibrationWizardSchema';

interface FoliarAnalysisStepProps {
  form: UseFormReturn<CalibrationWizardFormValues>;
}

interface FoliarElementConfig {
  name: FieldPath<CalibrationWizardFormValues>;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  upperOnly?: number;
}

const FOLIAR_ELEMENTS: FoliarElementConfig[] = [
  { name: 'foliar_elements.nitrogen_pct', label: 'Azote (N)', unit: '%', min: 1.5, max: 2.0 },
  { name: 'foliar_elements.phosphorus_pct', label: 'Phosphore (P)', unit: '%', min: 0.1, max: 0.3 },
  { name: 'foliar_elements.potassium_pct', label: 'Potassium (K)', unit: '%', min: 0.8, max: 1.2 },
  { name: 'foliar_elements.calcium_pct', label: 'Calcium (Ca)', unit: '%', min: 1.0, max: 3.0 },
  { name: 'foliar_elements.magnesium_pct', label: 'Magnesium (Mg)', unit: '%', min: 0.1, max: 0.3 },
  { name: 'foliar_elements.iron_ppm', label: 'Fer (Fe)', unit: 'ppm', min: 50, max: 150 },
  { name: 'foliar_elements.zinc_ppm', label: 'Zinc (Zn)', unit: 'ppm', min: 15, max: 30 },
  { name: 'foliar_elements.manganese_ppm', label: 'Manganese (Mn)', unit: 'ppm', min: 20, max: 80 },
  { name: 'foliar_elements.boron_ppm', label: 'Bore (B)', unit: 'ppm', min: 19, max: 150 },
  { name: 'foliar_elements.copper_ppm', label: 'Cuivre (Cu)', unit: 'ppm', min: 4, max: 20 },
  { name: 'foliar_elements.sodium_pct', label: 'Sodium (Na)', unit: '%', upperOnly: 0.2 },
  { name: 'foliar_elements.chlorides_pct', label: 'Chlorures (Cl)', unit: '%', upperOnly: 0.5 },
];

function getElementStatus(value: number, config: FoliarElementConfig): 'sufficient' | 'deficient' | 'critical' {
  if (config.upperOnly != null) {
    if (value <= config.upperOnly) {
      return 'sufficient';
    }
    if (value <= config.upperOnly * 1.5) {
      return 'deficient';
    }
    return 'critical';
  }

  if (config.min == null || config.max == null) {
    return 'sufficient';
  }

  if (value >= config.min && value <= config.max) {
    return 'sufficient';
  }

  const tolerance = (config.max - config.min) * 0.25;
  if (value >= config.min - tolerance && value <= config.max + tolerance) {
    return 'deficient';
  }

  return 'critical';
}

function StatusBadge({ status }: { status: 'sufficient' | 'deficient' | 'critical' }) {
  if (status === 'sufficient') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
        <CheckCircle2 className="w-3 h-3" />
        Suffisant
      </span>
    );
  }

  if (status === 'deficient') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        Deficient
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
      <AlertCircle className="w-3 h-3" />
      Carence
    </span>
  );
}

function FoliarElementField({ form, config }: { form: UseFormReturn<CalibrationWizardFormValues>; config: FoliarElementConfig }) {
  const value = form.watch(config.name);
  const isChecked = value !== undefined;

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <label htmlFor={config.name} className="flex items-center justify-between gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <span className="flex items-center gap-2">
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (!checked) {
                form.setValue(config.name, undefined);
              }
            }}
          />
          <span>
            {config.label} ({config.unit})
          </span>
        </span>
        {typeof value === 'number' && <StatusBadge status={getElementStatus(value, config)} />}
      </label>

      {isChecked && (
        <Controller
          control={form.control}
          name={config.name}
          render={({ field }) => (
            <Input
              id={config.name}
              type="number"
              step="0.01"
              value={field.value == null ? '' : String(field.value)}
              onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
            />
          )}
        />
      )}
    </div>
  );
}

export function FoliarAnalysisStep({ form }: FoliarAnalysisStepProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const availability = watch('foliar_analysis_available');
  const hasReport = availability === 'yes';

  useEffect(() => {
    if (!hasReport) {
      form.setValue('foliar_analysis_date', undefined);
      form.setValue('phenological_stage_at_sampling', undefined);
      form.setValue('branch_type', undefined);
      form.setValue('foliar_elements', calibrationWizardDefaultValues.foliar_elements);
    }
  }, [hasReport, form]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Analyse foliaire disponible ?" htmlFor="foliar_analysis_available" error={errors.foliar_analysis_available?.message}>
          <Select id="foliar_analysis_available" {...register('foliar_analysis_available')}>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="planned">Prevue</option>
          </Select>
        </FormField>

        <FormField label="Date prelevement" htmlFor="foliar_analysis_date" error={errors.foliar_analysis_date?.message}>
          <Input id="foliar_analysis_date" type="date" {...register('foliar_analysis_date')} invalid={!!errors.foliar_analysis_date} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Stade phenologique au prelevement"
          htmlFor="phenological_stage_at_sampling"
          error={errors.phenological_stage_at_sampling?.message}
        >
          <Input id="phenological_stage_at_sampling" placeholder="Ex: BBCH 75" {...register('phenological_stage_at_sampling')} invalid={!!errors.phenological_stage_at_sampling} />
        </FormField>

        <FormField label="Type de rameaux" htmlFor="branch_type" error={errors.branch_type?.message}>
          <Select id="branch_type" {...register('branch_type')}>
            <option value="fruiting">Fructiferes</option>
            <option value="non_fruiting">Non fructiferes</option>
            <option value="mixed">Mixte</option>
          </Select>
        </FormField>
      </div>

      {!hasReport && (
        <div className="rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          L'analyse foliaire est optionnelle a la creation. Si disponible, elle augmente fortement la qualite d'interpretation.
        </div>
      )}

      {hasReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FOLIAR_ELEMENTS.map((config) => (
            <FoliarElementField key={config.name} form={form} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
