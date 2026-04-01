import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useForm, type FieldPath } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  calibrationWizardDefaultValues,
  type CalibrationWizardFormValues as FullCalibrationWizardFormValues,
} from '@/schemas/calibrationWizardSchema';
import { useStartPartialRecalibration } from '@/hooks/useCalibrationV2';
import {
  MotifSelectionStep,
  RECALIBRATION_MOTIFS,
} from './steps/MotifSelectionStep';
import { BlockUpdateStep } from './steps/BlockUpdateStep';
import {
  ImpactPreviewStep,
  type ModifiedParameterPreview,
} from './steps/ImpactPreviewStep';
import { RecalibrationValidationStep } from './steps/RecalibrationValidationStep';

export type CalibrationWizardFormValues = FullCalibrationWizardFormValues;

export type RecalibrationMotif =
  | 'water_source_change'
  | 'irrigation_change'
  | 'new_soil_analysis'
  | 'new_water_analysis'
  | 'new_foliar_analysis'
  | 'parcel_restructure'
  | 'other';

export interface ComparisonFieldOption {
  value: string;
  label: string;
}

export interface ComparisonFieldConfig {
  path: FieldPath<CalibrationWizardFormValues>;
  label: string;
  unit?: string;
  inputType: 'number' | 'text' | 'date' | 'month' | 'select';
  options?: ComparisonFieldOption[];
}

interface BaselineValue {
  value: unknown;
  date?: string;
}

interface RecalibrationWizardProps {
  parcelId: string;
  baselineData?: unknown;
  confidenceScore?: number;
  onClose: () => void;
  onSwitchToFullRecalibration: () => void;
}

const STEPS = [
  { number: 1, title: 'Motif' },
  { number: 2, title: 'Bloc a mettre a jour' },
  { number: 3, title: 'Apercu d\'impact' },
  { number: 4, title: 'Validation' },
] as const;

const IRRIGATION_FREQUENCY_OPTIONS: ComparisonFieldOption[] = [
  { value: 'daily', label: 'Quotidien' },
  { value: '2_3_per_week', label: '2-3 fois / semaine' },
  { value: 'weekly', label: '1 fois / semaine' },
  { value: 'biweekly', label: '1 fois / 15 jours' },
  { value: 'other', label: 'Autre' },
];

const WATER_ANALYSIS_FIELDS: ComparisonFieldConfig[] = [
  { path: 'water_analysis_parameters.prioritaire.ec_water', label: 'CE eau', unit: 'dS/m', inputType: 'number' },
  { path: 'water_analysis_parameters.prioritaire.ph_water', label: 'pH eau', inputType: 'number' },
  { path: 'water_analysis_parameters.prioritaire.sar', label: 'SAR', inputType: 'number' },
  { path: 'water_analysis_parameters.prioritaire.sodium_meq', label: 'Sodium', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_parameters.prioritaire.chlorides_meq', label: 'Chlorures', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_parameters.recommande.bicarbonates_meq', label: 'Bicarbonates', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_parameters.recommande.calcium_meq', label: 'Calcium', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_parameters.recommande.magnesium_meq', label: 'Magnesium', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_parameters.recommande.nitrates_mg', label: 'Nitrates', unit: 'mg/L', inputType: 'number' },
  { path: 'water_analysis_parameters.optionnel.boron_mg', label: 'Bore', unit: 'mg/L', inputType: 'number' },
  { path: 'water_analysis_parameters.optionnel.sulfates_meq', label: 'Sulfates', unit: 'meq/L', inputType: 'number' },
  { path: 'water_analysis_date', label: 'Date analyse eau', inputType: 'month' },
];

const IRRIGATION_FIELDS: ComparisonFieldConfig[] = [
  { path: 'irrigation_frequency', label: 'Frequence irrigation', inputType: 'select', options: IRRIGATION_FREQUENCY_OPTIONS },
  { path: 'volume_per_tree_liters', label: 'Volume par arbre', unit: 'L', inputType: 'number' },
  { path: 'irrigation_change_date', label: 'Date changement irrigation', inputType: 'month' },
  { path: 'previous_irrigation_frequency', label: 'Frequence precedente', inputType: 'text' },
  { path: 'previous_volume_per_tree_liters', label: 'Volume precedent', unit: 'L', inputType: 'number' },
];

const SOIL_ANALYSIS_FIELDS: ComparisonFieldConfig[] = [
  { path: 'soil_analysis_parameters.prioritaire.ph', label: 'pH sol', inputType: 'number' },
  { path: 'soil_analysis_parameters.prioritaire.ec_ds_m', label: 'CE sol', unit: 'dS/m', inputType: 'number' },
  { path: 'soil_analysis_parameters.prioritaire.texture', label: 'Texture', inputType: 'text' },
  { path: 'soil_analysis_parameters.prioritaire.organic_matter_pct', label: 'Matiere organique', unit: '%', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.phosphorus_ppm', label: 'Phosphore', unit: 'ppm', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.potassium_ppm', label: 'Potassium', unit: 'ppm', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.calcium_ppm', label: 'Calcium', unit: 'ppm', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.magnesium_ppm', label: 'Magnesium', unit: 'ppm', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.total_limestone_pct', label: 'Calcaire total', unit: '%', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.active_limestone_pct', label: 'Calcaire actif', unit: '%', inputType: 'number' },
  { path: 'soil_analysis_parameters.recommande.root_depth_cm', label: 'Profondeur racinaire', unit: 'cm', inputType: 'number' },
  { path: 'soil_analysis_date', label: 'Date analyse sol', inputType: 'month' },
];

const FOLIAR_ANALYSIS_FIELDS: ComparisonFieldConfig[] = [
  { path: 'foliar_elements.nitrogen_pct', label: 'Azote', unit: '%', inputType: 'number' },
  { path: 'foliar_elements.phosphorus_pct', label: 'Phosphore', unit: '%', inputType: 'number' },
  { path: 'foliar_elements.potassium_pct', label: 'Potassium', unit: '%', inputType: 'number' },
  { path: 'foliar_elements.calcium_pct', label: 'Calcium', unit: '%', inputType: 'number' },
  { path: 'foliar_elements.magnesium_pct', label: 'Magnesium', unit: '%', inputType: 'number' },
  { path: 'foliar_elements.iron_ppm', label: 'Fer', unit: 'ppm', inputType: 'number' },
  { path: 'foliar_elements.zinc_ppm', label: 'Zinc', unit: 'ppm', inputType: 'number' },
  { path: 'foliar_elements.manganese_ppm', label: 'Manganese', unit: 'ppm', inputType: 'number' },
  { path: 'foliar_elements.boron_ppm', label: 'Bore', unit: 'ppm', inputType: 'number' },
  { path: 'foliar_elements.copper_ppm', label: 'Cuivre', unit: 'ppm', inputType: 'number' },
  { path: 'foliar_analysis_date', label: 'Date analyse foliaire', inputType: 'date' },
];

const MOTIF_FIELD_MAP: Record<Exclude<RecalibrationMotif, 'parcel_restructure' | 'other'>, ComparisonFieldConfig[]> = {
  water_source_change: [...WATER_ANALYSIS_FIELDS, ...IRRIGATION_FIELDS],
  irrigation_change: IRRIGATION_FIELDS,
  new_soil_analysis: SOIL_ANALYSIS_FIELDS,
  new_water_analysis: WATER_ANALYSIS_FIELDS,
  new_foliar_analysis: FOLIAR_ANALYSIS_FIELDS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function flattenRecord(value: unknown, prefix = '', output: Record<string, unknown> = {}, depth = 0): Record<string, unknown> {
  if (depth > 8) {
    return output;
  }

  if (!isRecord(value)) {
    if (prefix) {
      output[prefix] = value;
    }
    return output;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(nestedValue)) {
      return;
    }
    flattenRecord(nestedValue, next, output, depth + 1);
  });

  return output;
}

function pickComparableValue(value: unknown): string {
  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return String(value).trim();
}

function formatPreviewValue(value: unknown, unit?: string): string {
  const normalized = pickComparableValue(value);
  if (!normalized) {
    return '-';
  }
  return unit ? `${normalized} ${unit}` : normalized;
}

function getFieldListByMotif(motif: RecalibrationMotif | null): ComparisonFieldConfig[] {
  if (!motif) {
    return [];
  }

  if (motif === 'parcel_restructure' || motif === 'other') {
    return [];
  }

  return MOTIF_FIELD_MAP[motif];
}

function getModulesByMotif(motif: RecalibrationMotif | null): string[] {
  if (!motif) {
    return [];
  }

  if (motif === 'water_source_change') {
    return ['Hydrique', 'Nutrition'];
  }

  if (motif === 'irrigation_change') {
    return ['Hydrique'];
  }

  if (motif === 'new_soil_analysis') {
    return ['Nutrition', 'Hydrique'];
  }

  if (motif === 'new_water_analysis') {
    return ['Hydrique', 'Nutrition'];
  }

  if (motif === 'new_foliar_analysis') {
    return ['Nutrition', 'Phytosanitaire'];
  }

  if (motif === 'parcel_restructure') {
    return ['Nutrition', 'Hydrique', 'Phytosanitaire'];
  }

  return ['Nutrition', 'Hydrique'];
}

function createBaselineMap(source: unknown): Record<string, BaselineValue> {
  if (!source) {
    return {};
  }

  const flattened = flattenRecord(source);
  const baselineEntries: Record<string, BaselineValue> = {};

  Object.entries(flattened).forEach(([path, value]) => {
    baselineEntries[path] = { value };
  });

  return baselineEntries;
}

function resolveBaselineValue(
  baselineMap: Record<string, BaselineValue>,
  path: string,
): BaselineValue | undefined {
  if (baselineMap[path]) {
    return baselineMap[path];
  }

  const suffixMatch = Object.entries(baselineMap).find(([key]) => key.endsWith(`.${path}`));
  if (suffixMatch) {
    return suffixMatch[1];
  }

  return undefined;
}

function buildModifiedParameters(
  fields: ComparisonFieldConfig[],
  formValues: CalibrationWizardFormValues,
  baselineMap: Record<string, BaselineValue>,
): ModifiedParameterPreview[] {
  return fields.reduce<ModifiedParameterPreview[]>((acc, field) => {
      const oldValue = resolveBaselineValue(baselineMap, field.path);
      const newRawValue = field.path
        .split('.')
        .reduce<unknown>((acc, segment) => (isRecord(acc) ? acc[segment] : undefined), formValues);

      const oldComparable = pickComparableValue(oldValue?.value);
      const newComparable = pickComparableValue(newRawValue);

      if (!newComparable || oldComparable === newComparable) {
        return acc;
      }

      acc.push({
        path: field.path,
        label: field.label,
        oldValue: formatPreviewValue(oldValue?.value, field.unit),
        newValue: formatPreviewValue(newRawValue, field.unit),
      });

      return acc;
    }, []);
}

function computeConfidencePreview(
  baseConfidence: number,
  modifiedCount: number,
  motif: RecalibrationMotif | null,
): number {
  const baseline = Number.isFinite(baseConfidence) ? baseConfidence : 0.7;
  const countBoost = Math.min(0.08, modifiedCount * 0.01);

  let motifBoost = 0;
  if (motif === 'new_soil_analysis' || motif === 'new_water_analysis' || motif === 'new_foliar_analysis') {
    motifBoost = 0.03;
  }

  if (motif === 'parcel_restructure') {
    motifBoost = -0.04;
  }

  return Math.max(0, Math.min(0.99, baseline + countBoost + motifBoost));
}

function buildPartialPayload(
  motif: RecalibrationMotif,
  motifDetail: string,
  formValues: CalibrationWizardFormValues,
  modifiedParameters: ModifiedParameterPreview[],
  modulesToRecalculate: string[],
  confidencePreview: number,
  recommendation: 'partial' | 'full',
) {
  const updates: Record<string, unknown> = {};

  if (motif === 'water_source_change') {
    updates.irrigation = {
      irrigation_frequency: formValues.irrigation_frequency,
      volume_per_tree_liters: formValues.volume_per_tree_liters,
      irrigation_change_date: formValues.irrigation_change_date,
      previous_irrigation_frequency: formValues.previous_irrigation_frequency,
      previous_volume_per_tree_liters: formValues.previous_volume_per_tree_liters,
    };
    updates.water_analysis = {
      water_analysis_date: formValues.water_analysis_date,
      water_analysis_parameters: formValues.water_analysis_parameters,
    };
  }

  if (motif === 'irrigation_change') {
    updates.irrigation = {
      irrigation_frequency: formValues.irrigation_frequency,
      volume_per_tree_liters: formValues.volume_per_tree_liters,
      irrigation_change_date: formValues.irrigation_change_date,
      previous_irrigation_frequency: formValues.previous_irrigation_frequency,
      previous_volume_per_tree_liters: formValues.previous_volume_per_tree_liters,
    };
  }

  if (motif === 'new_soil_analysis') {
    updates.soil_analysis = {
      soil_analysis_date: formValues.soil_analysis_date,
      soil_analysis_laboratory: formValues.soil_analysis_laboratory,
      soil_analysis_parameters: formValues.soil_analysis_parameters,
    };
  }

  if (motif === 'new_water_analysis') {
    updates.water_analysis = {
      water_analysis_date: formValues.water_analysis_date,
      water_analysis_parameters: formValues.water_analysis_parameters,
    };
  }

  if (motif === 'new_foliar_analysis') {
    updates.foliar_analysis = {
      foliar_analysis_date: formValues.foliar_analysis_date,
      phenological_stage_at_sampling: formValues.phenological_stage_at_sampling,
      branch_type: formValues.branch_type,
      foliar_elements: formValues.foliar_elements,
    };
  }

  return {
    recalibration_motif: motif,
    recalibration_motif_detail: motif === 'other' ? motifDetail : undefined,
    updates,
    impact_preview: {
      modified_parameters: modifiedParameters,
      modules_to_recalculate: modulesToRecalculate,
      confidence_preview: confidencePreview,
      ai_recommendation: recommendation,
    },
  };
}

export function RecalibrationWizard({
  parcelId,
  baselineData,
  confidenceScore,
  onClose,
  onSwitchToFullRecalibration,
}: RecalibrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMotif, setSelectedMotif] = useState<RecalibrationMotif | null>(null);
  const [motifDetail, setMotifDetail] = useState('');

  const form = useForm<CalibrationWizardFormValues>({
    defaultValues: calibrationWizardDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (selectedMotif !== 'other' && motifDetail.length > 0) {
      setMotifDetail('');
    }
  }, [selectedMotif, motifDetail]);

  const handleSelectMotif = (motif: RecalibrationMotif) => {
    setSelectedMotif(motif);
    form.reset(calibrationWizardDefaultValues);
  };

  const partialRecalibration = useStartPartialRecalibration(parcelId);
  const baselineMap = useMemo(() => createBaselineMap(baselineData), [baselineData]);

  const comparisonFields = useMemo(() => getFieldListByMotif(selectedMotif), [selectedMotif]);

  const formValues = form.watch();

  const modifiedParameters = useMemo(
    () => buildModifiedParameters(comparisonFields, formValues, baselineMap),
    [baselineMap, comparisonFields, formValues],
  );

  const modulesToRecalculate = useMemo(() => getModulesByMotif(selectedMotif), [selectedMotif]);

  const confidencePreview = useMemo(
    () => computeConfidencePreview(confidenceScore ?? 0.7, modifiedParameters.length, selectedMotif),
    [confidenceScore, modifiedParameters.length, selectedMotif],
  );

  const recommendation: 'partial' | 'full' =
    selectedMotif === 'parcel_restructure' || modifiedParameters.length > 12 ? 'full' : 'partial';

  const canGoNext = useMemo(() => {
    if (currentStep === 1) {
      if (!selectedMotif) {
        return false;
      }
      if (selectedMotif === 'other' && motifDetail.trim().length < 5) {
        return false;
      }
      return true;
    }

    if (currentStep === 2 && selectedMotif !== 'parcel_restructure') {
      return modifiedParameters.length > 0;
    }

    return true;
  }, [currentStep, modifiedParameters.length, motifDetail, selectedMotif]);

  const submitPartialRecalibration = async () => {
    if (!selectedMotif) {
      return;
    }

    const payload = buildPartialPayload(
      selectedMotif,
      motifDetail,
      form.getValues(),
      modifiedParameters,
      modulesToRecalculate,
      confidencePreview,
      recommendation,
    );

    await partialRecalibration.mutateAsync(payload);
    onClose();
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <MotifSelectionStep
          selectedMotif={selectedMotif}
          motifDetail={motifDetail}
          onSelectMotif={handleSelectMotif}
          onMotifDetailChange={setMotifDetail}
        />
      );
    }

    if (!selectedMotif) {
      return null;
    }

    if (currentStep === 2) {
      if (selectedMotif === 'parcel_restructure') {
        return (
          <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
            Ce motif necessite un recalibrage complet. Passez a l&apos;etape suivante pour confirmer.
          </div>
        );
      }

      return (
        <BlockUpdateStep
          motif={selectedMotif}
          form={form}
          fields={comparisonFields}
          baselineValues={Object.fromEntries(
            comparisonFields.map((field) => [field.path, resolveBaselineValue(baselineMap, field.path) ?? { value: undefined }]),
          )}
        />
      );
    }

    if (currentStep === 3) {
      return (
        <ImpactPreviewStep
          modifiedParameters={modifiedParameters}
          modulesToRecalculate={modulesToRecalculate}
          confidencePreview={confidencePreview}
          recommendation={recommendation}
        />
      );
    }

    return (
      <RecalibrationValidationStep
        canSubmit={selectedMotif !== null && (selectedMotif === 'parcel_restructure' || modifiedParameters.length > 0)}
        isSubmitting={partialRecalibration.isPending}
        onCancel={onClose}
        onValidate={() => {
          if (selectedMotif === 'parcel_restructure' || recommendation === 'full') {
            onSwitchToFullRecalibration();
            return;
          }
          void submitPartialRecalibration();
        }}
        onFullRecalibration={onSwitchToFullRecalibration}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assistant de recalibrage partiel</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Met a jour un bloc specifique sans relancer un recalibrage complet de la parcelle.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 overflow-x-auto">
        <div className="flex items-center min-w-[640px] justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${
                    isCompleted
                      ? 'bg-green-600 border-green-600 text-white'
                      : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="ml-2 mr-3">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {step.title}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className={`h-4 w-4 ${isCompleted ? 'text-green-600' : 'text-gray-400 dark:text-gray-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-6">
        {renderStep()}

        {currentStep < 4 && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
              Precedent
            </Button>
            <Button variant="blue" type="button" disabled={!canGoNext} onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>

      {currentStep === 2 && selectedMotif !== 'parcel_restructure' && modifiedParameters.length === 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Modifiez au moins un parametre pour continuer vers la previsualisation d&apos;impact.
        </p>
      )}

      {currentStep === 1 && selectedMotif === 'other' && motifDetail.trim().length < 5 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Precisez le motif en 5 caracteres minimum pour continuer.
        </p>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {selectedMotif && (
          <span>
            Motif selectionne: {RECALIBRATION_MOTIFS.find((motif) => motif.value === selectedMotif)?.label ?? selectedMotif}
          </span>
        )}
        <span className="ml-2">Parcelle: {parcelId}</span>
      </div>
    </div>
  );
}
