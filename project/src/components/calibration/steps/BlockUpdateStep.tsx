import { Controller, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { ChevronDown, FlaskConical, TableProperties } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type {
  CalibrationWizardFormValues,
  ComparisonFieldConfig,
  RecalibrationMotif,
} from '@/components/calibration/RecalibrationWizard';
import { IrrigationStep } from './IrrigationStep';
import { SoilAnalysisStep } from './SoilAnalysisStep';
import { WaterAnalysisStep } from './WaterAnalysisStep';
import { FoliarAnalysisStep } from './FoliarAnalysisStep';

interface BaselineValue {
  value: unknown;
  date?: string;
}

interface BlockUpdateStepProps {
  motif: RecalibrationMotif;
  form: UseFormReturn<CalibrationWizardFormValues>;
  fields: ComparisonFieldConfig[];
  baselineValues: Record<string, BaselineValue>;
}

function formatUnknownValue(value: unknown): string {
  if (value == null || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  return String(value);
}

function formatOldValue(row: ComparisonFieldConfig, baseline: BaselineValue | undefined): string {
  if (!baseline) {
    return '-';
  }

  const formatted = formatUnknownValue(baseline.value);
  if (formatted === '-') {
    return '-';
  }

  const withUnit = row.unit ? `${formatted} ${row.unit}` : formatted;
  if (!baseline.date) {
    return withUnit;
  }

  return `${withUnit} (${baseline.date})`;
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function renderDelta(oldValue: unknown, newValue: unknown, unit?: string): string {
  const oldNumeric = parseNumericValue(oldValue);
  const newNumeric = parseNumericValue(newValue);

  if (oldNumeric == null || newNumeric == null) {
    return '—';
  }

  const delta = newNumeric - oldNumeric;
  const sign = delta > 0 ? '+' : '';
  const withPrecision = Math.abs(delta) < 1 ? delta.toFixed(2) : delta.toFixed(1);

  return unit ? `${sign}${withPrecision} ${unit}` : `${sign}${withPrecision}`;
}

function NewValueInput({
  form,
  field: fieldConfig,
}: {
  form: UseFormReturn<CalibrationWizardFormValues>;
  field: ComparisonFieldConfig;
}) {
  if (fieldConfig.inputType === 'select' && fieldConfig.options && fieldConfig.options.length > 0) {
    const options = fieldConfig.options;

    return (
      <Controller
        control={form.control}
        name={fieldConfig.path}
        render={({ field: rhfField }) => (
          <Select
            value={rhfField.value == null ? '' : String(rhfField.value)}
            onChange={(event) => rhfField.onChange(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      />
    );
  }

  return (
    <Controller
      control={form.control}
      name={fieldConfig.path}
      render={({ field: rhfField }) => (
        <Input
          type={fieldConfig.inputType === 'number' ? 'number' : fieldConfig.inputType}
          step={fieldConfig.inputType === 'number' ? '0.01' : undefined}
          value={rhfField.value == null ? '' : String(rhfField.value)}
          onChange={(event) => {
            if (fieldConfig.inputType === 'number') {
              rhfField.onChange(event.target.value === '' ? undefined : Number(event.target.value));
              return;
            }
            rhfField.onChange(event.target.value);
          }}
        />
      )}
    />
  );
}

function BlockDetails({ motif, form }: { motif: RecalibrationMotif; form: UseFormReturn<CalibrationWizardFormValues> }) {
  if (motif === 'water_source_change') {
    return (
      <div className="space-y-6">
        <div>
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bloc irrigation (F1 Step 2)</h5>
          <IrrigationStep form={form} />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bloc analyse eau (F1 Step 4)</h5>
          <WaterAnalysisStep form={form} />
        </div>
      </div>
    );
  }

  if (motif === 'irrigation_change') {
    return <IrrigationStep form={form} />;
  }

  if (motif === 'new_soil_analysis') {
    return <SoilAnalysisStep form={form} />;
  }

  if (motif === 'new_water_analysis') {
    return <WaterAnalysisStep form={form} />;
  }

  if (motif === 'new_foliar_analysis') {
    return <FoliarAnalysisStep form={form} />;
  }

  return null;
}

export function BlockUpdateStep({ motif, form, fields, baselineValues }: BlockUpdateStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Mise a jour du bloc cible</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Comparez les valeurs du profil de reference precedent avec les nouvelles donnees a appliquer.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <TableProperties className="h-4 w-4" />
            <span>Comparatif ancien vs nouveau</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-white dark:bg-gray-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Parameter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Old Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">New Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/30">
              {fields.map((row) => {
                const baseline = baselineValues[row.path];
                const currentValue = form.watch(row.path as FieldPath<CalibrationWizardFormValues>);
                const oldValue = baseline?.value;

                return (
                  <tr key={row.path}>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.label}</div>
                      {row.unit && <div className="text-xs text-gray-500 dark:text-gray-400">{row.unit}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top">{formatOldValue(row, baseline)}</td>
                    <td className="px-4 py-3 align-top min-w-[220px]">
                      <NewValueInput form={form} field={row} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top">
                      {renderDelta(oldValue, currentValue, row.unit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <FlaskConical className="h-4 w-4" />
            <span>Formulaire detaille du bloc (reuse F1)</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </summary>
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <BlockDetails motif={motif} form={form} />
        </div>
      </details>
    </div>
  );
}
