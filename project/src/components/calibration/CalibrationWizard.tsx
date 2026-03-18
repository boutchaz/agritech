import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useForm, type FieldPath, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { analysesApi } from '@/lib/api/analyses';
import { useStartCalibrationV2 } from '@/hooks/useCalibrationV2';
import { useAuth } from '@/hooks/useAuth';
import type { Parcel } from '@/hooks/useParcelsQuery';
import {
  CalibrationWizardSchema,
  calibrationWizardDefaultValues,
  PlantationStepSchema,
  IrrigationStepSchema,
  WIZARD_STEP_FIELD_PATHS,
  type CalibrationWizardFormValues,
} from '@/schemas/calibrationWizardSchema';
import { useCalibrationWizardStore } from '@/stores/calibrationWizardStore';
import { PlantationStep } from './steps/PlantationStep';
import { IrrigationStep } from './steps/IrrigationStep';
import { SoilAnalysisStep } from './steps/SoilAnalysisStep';
import { WaterAnalysisStep } from './steps/WaterAnalysisStep';
import { FoliarAnalysisStep } from './steps/FoliarAnalysisStep';
import { HarvestHistoryStep } from './steps/HarvestHistoryStep';
import { CulturalHistoryStep } from './steps/CulturalHistoryStep';
import { ValidationStep } from './steps/ValidationStep';

interface CalibrationWizardProps {
  parcelId: string;
  parcelData?: Parcel | null;
}

interface WizardStepDefinition {
  number: number;
  title: string;
  status: 'required' | 'recommended' | 'optional';
}

const STEPS: WizardStepDefinition[] = [
  { number: 1, title: 'Complements plantation', status: 'required' },
  { number: 2, title: 'Historique irrigation', status: 'required' },
  { number: 3, title: 'Analyse sol', status: 'recommended' },
  { number: 4, title: 'Analyse eau', status: 'recommended' },
  { number: 5, title: 'Analyse foliaire', status: 'optional' },
  { number: 6, title: 'Historique recoltes', status: 'recommended' },
  { number: 7, title: 'Historique cultural', status: 'recommended' },
  { number: 8, title: 'Validation', status: 'required' },
];

const STATUS_LABELS: Record<WizardStepDefinition['status'], string> = {
  required: '● Obligatoire',
  recommended: '◑ Recommande',
  optional: '○ Optionnel',
};

function toMonthDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }
  return value;
}

function mapWaterSourceForAnalysis(source: CalibrationWizardFormValues['water_source']) {
  if (source === 'dam') {
    return 'river';
  }
  if (source === 'seguia') {
    return 'irrigation';
  }
  if (source === 'mixed') {
    return 'other';
  }
  return source;
}

export function CalibrationWizard({ parcelId, parcelData }: CalibrationWizardProps) {
  const { currentOrganization } = useAuth();
  const startCalibration = useStartCalibrationV2(parcelId);

  const {
    currentStep,
    formData,
    setStep,
    setParcelId,
    updateFormData,
  } = useCalibrationWizardStore();

  const prefilledValues = useMemo(() => {
    const estimatedAge = parcelData?.planting_year
      ? Math.max(0, new Date().getFullYear() - parcelData.planting_year)
      : calibrationWizardDefaultValues.plantation_age;

    const VALID_FREQUENCIES = ['daily', '2_3_per_week', 'weekly', 'biweekly', 'other'] as const;
    type Freq = (typeof VALID_FREQUENCIES)[number];
    const rawFreq = parcelData?.irrigation_frequency;
    const mappedFrequency: Freq =
      rawFreq && (VALID_FREQUENCIES as readonly string[]).includes(rawFreq)
        ? (rawFreq as Freq)
        : calibrationWizardDefaultValues.irrigation_frequency;

    const VALID_WATER_SOURCES = ['well', 'dam', 'seguia', 'municipal', 'mixed', 'other'] as const;
    type WS = (typeof VALID_WATER_SOURCES)[number];
    const rawWs = parcelData?.water_source;
    const mappedWaterSource: WS =
      rawWs && (VALID_WATER_SOURCES as readonly string[]).includes(rawWs)
        ? (rawWs as WS)
        : calibrationWizardDefaultValues.water_source;

    return {
      ...calibrationWizardDefaultValues,
      plantation_age: estimatedAge,
      real_tree_count: parcelData?.tree_count ?? calibrationWizardDefaultValues.real_tree_count,
      real_spacing: calibrationWizardDefaultValues.real_spacing,
      water_source: mappedWaterSource,
      irrigation_frequency: mappedFrequency,
      volume_per_tree_liters:
        parcelData?.water_quantity_per_session ?? calibrationWizardDefaultValues.volume_per_tree_liters,
      ...formData,
    } satisfies CalibrationWizardFormValues;
  }, [
    parcelData?.tree_count,
    parcelData?.planting_year,
    parcelData?.irrigation_frequency,
    parcelData?.water_source,
    parcelData?.water_quantity_per_session,
    formData,
  ]);

  const form = useForm<CalibrationWizardFormValues>({
    resolver: zodResolver(CalibrationWizardSchema as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<CalibrationWizardFormValues>,
    defaultValues: prefilledValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    setParcelId(parcelId);
  }, [parcelId, setParcelId]);

  useEffect(() => {
    form.reset(prefilledValues);
  }, [form, prefilledValues]);

  const values = form.watch();

  const stepOneComplete = PlantationStepSchema.safeParse(values).success;
  const stepTwoComplete = IrrigationStepSchema.safeParse(values).success;
  const canLaunchByRequiredData = stepOneComplete && stepTwoComplete;

  const persistCurrentForm = () => {
    updateFormData(form.getValues());
  };

  const isStepCompleted = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return true;
    }

    if (stepNumber === 1) {
      return stepOneComplete;
    }
    if (stepNumber === 2) {
      return stepTwoComplete;
    }

    const fields = WIZARD_STEP_FIELD_PATHS[stepNumber] ?? [];
    return fields.every((field) => {
      const fieldValue = form.getValues(field as FieldPath<CalibrationWizardFormValues>);
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.trim().length > 0;
      }
      return fieldValue !== undefined && fieldValue !== null;
    });
  };

  const handleNext = async () => {
    const fields = WIZARD_STEP_FIELD_PATHS[currentStep] ?? [];
    const isValid = await form.trigger(fields as Array<FieldPath<CalibrationWizardFormValues>>);

    if (!isValid) {
      return;
    }

    persistCurrentForm();
    setStep(Math.min(8, currentStep + 1));
  };

  const handlePrevious = () => {
    persistCurrentForm();
    setStep(Math.max(1, currentStep - 1));
  };

  const handleSaveAndCompleteLater = () => {
    persistCurrentForm();
    toast.success('Progression sauvegardee. Vous pouvez reprendre plus tard.');
  };

  const createAnalysesFromWizard = async (wizardValues: CalibrationWizardFormValues) => {
    if (!currentOrganization?.id) {
      throw new Error('No organization selected');
    }

    if (wizardValues.soil_analysis_available === 'yes') {
      const soilNotes = [
        wizardValues.soil_analysis_parameters.recommande.root_depth_cm != null
          ? `Root depth cm: ${wizardValues.soil_analysis_parameters.recommande.root_depth_cm}`
          : undefined,
        wizardValues.soil_analysis_parameters.optionnel.other_text
          ? `Other: ${wizardValues.soil_analysis_parameters.optionnel.other_text}`
          : undefined,
      ]
        .filter(Boolean)
        .join(' | ');

      await analysesApi.create(
        {
          parcel_id: parcelId,
          analysis_type: 'soil',
          analysis_date: toMonthDate(wizardValues.soil_analysis_date) ?? new Date().toISOString().slice(0, 10),
          laboratory: wizardValues.soil_analysis_laboratory || undefined,
          notes: soilNotes || undefined,
          data: {
            ph_level: wizardValues.soil_analysis_parameters.prioritaire.ph,
            electrical_conductivity: wizardValues.soil_analysis_parameters.prioritaire.ec_ds_m,
            texture: wizardValues.soil_analysis_parameters.prioritaire.texture as
              | 'sand'
              | 'loamy_sand'
              | 'sandy_loam'
              | 'sandy_clay_loam'
              | 'loam'
              | 'silt_loam'
              | 'silt'
              | 'clay_loam'
              | 'silty_clay_loam'
              | 'sandy_clay'
              | 'silty_clay'
              | 'clay'
              | undefined,
            organic_matter_percentage: wizardValues.soil_analysis_parameters.prioritaire.organic_matter_pct,
            phosphorus_ppm: wizardValues.soil_analysis_parameters.recommande.phosphorus_ppm,
            potassium_ppm: wizardValues.soil_analysis_parameters.recommande.potassium_ppm,
            calcium_ppm: wizardValues.soil_analysis_parameters.recommande.calcium_ppm,
            magnesium_ppm: wizardValues.soil_analysis_parameters.recommande.magnesium_ppm,
            total_limestone_pct: wizardValues.soil_analysis_parameters.recommande.total_limestone_pct,
            active_limestone_pct: wizardValues.soil_analysis_parameters.recommande.active_limestone_pct,
            nitrogen_ppm: wizardValues.soil_analysis_parameters.optionnel.nitrogen_ppm,
            iron_ppm: wizardValues.soil_analysis_parameters.optionnel.iron_ppm,
            zinc_ppm: wizardValues.soil_analysis_parameters.optionnel.zinc_ppm,
            manganese_ppm: wizardValues.soil_analysis_parameters.optionnel.manganese_ppm,
            boron_ppm: wizardValues.soil_analysis_parameters.optionnel.boron_ppm,
            copper_ppm: wizardValues.soil_analysis_parameters.optionnel.copper_ppm,
          },
        },
        currentOrganization.id,
      );
    }

    if (wizardValues.water_analysis_available === 'yes') {
      const waterNotes = wizardValues.water_analysis_parameters.optionnel.other_text || undefined;

      await analysesApi.create(
        {
          parcel_id: parcelId,
          analysis_type: 'water',
          analysis_date: toMonthDate(wizardValues.water_analysis_date) ?? new Date().toISOString().slice(0, 10),
          notes: waterNotes,
          data: {
            water_source: mapWaterSourceForAnalysis(wizardValues.water_source),
            ec_ds_per_m: wizardValues.water_analysis_parameters.prioritaire.ec_water,
            ph_level: wizardValues.water_analysis_parameters.prioritaire.ph_water,
            sar: wizardValues.water_analysis_parameters.prioritaire.sar,
            sodium_ppm: wizardValues.water_analysis_parameters.prioritaire.sodium_meq,
            chloride_ppm: wizardValues.water_analysis_parameters.prioritaire.chlorides_meq,
            bicarbonate_ppm: wizardValues.water_analysis_parameters.recommande.bicarbonates_meq,
            calcium_ppm: wizardValues.water_analysis_parameters.recommande.calcium_meq,
            magnesium_ppm: wizardValues.water_analysis_parameters.recommande.magnesium_meq,
            nitrate_ppm: wizardValues.water_analysis_parameters.recommande.nitrates_mg,
            boron_ppm: wizardValues.water_analysis_parameters.optionnel.boron_mg,
            sulfate_ppm: wizardValues.water_analysis_parameters.optionnel.sulfates_meq,
          },
        },
        currentOrganization.id,
      );
    }

    if (wizardValues.foliar_analysis_available === 'yes') {
      await analysesApi.create(
        {
          parcel_id: parcelId,
          analysis_type: 'plant',
          analysis_date: toMonthDate(wizardValues.foliar_analysis_date) ?? new Date().toISOString().slice(0, 10),
          notes: wizardValues.branch_type || undefined,
          data: {
            plant_part: 'leaf',
            growth_stage: wizardValues.phenological_stage_at_sampling,
            nitrogen_percentage: wizardValues.foliar_elements.nitrogen_pct,
            phosphorus_percentage: wizardValues.foliar_elements.phosphorus_pct,
            potassium_percentage: wizardValues.foliar_elements.potassium_pct,
            calcium_percentage: wizardValues.foliar_elements.calcium_pct,
            magnesium_percentage: wizardValues.foliar_elements.magnesium_pct,
            sodium_percentage: wizardValues.foliar_elements.sodium_pct,
            chlorine_percentage: wizardValues.foliar_elements.chlorides_pct,
            iron_ppm: wizardValues.foliar_elements.iron_ppm,
            zinc_ppm: wizardValues.foliar_elements.zinc_ppm,
            manganese_ppm: wizardValues.foliar_elements.manganese_ppm,
            boron_ppm: wizardValues.foliar_elements.boron_ppm,
            copper_ppm: wizardValues.foliar_elements.copper_ppm,
          },
        },
        currentOrganization.id,
      );
    }
  };

  const launchCalibration = async () => {
    const validatedValues = await form.trigger();
    if (!validatedValues) {
      return;
    }

    const wizardValues = form.getValues();

    if (!canLaunchByRequiredData) {
      toast.error('Les champs obligatoires des etapes 1 et 2 doivent etre completes.');
      return;
    }

    await createAnalysesFromWizard(wizardValues);

    await startCalibration.mutateAsync({
      plantation_age: wizardValues.plantation_age,
      real_tree_count: wizardValues.real_tree_count,
      real_spacing: wizardValues.real_spacing,
      water_source: wizardValues.water_source,
      water_source_changed: wizardValues.water_source_changed,
      water_source_change_date: toMonthDate(wizardValues.water_source_change_date),
      previous_water_source: wizardValues.previous_water_source,
      irrigation_frequency: wizardValues.irrigation_frequency,
      volume_per_tree_liters: wizardValues.volume_per_tree_liters,
      irrigation_regime_changed: wizardValues.irrigation_regime_changed,
      irrigation_change_date: toMonthDate(wizardValues.irrigation_change_date),
      previous_irrigation_frequency: wizardValues.previous_irrigation_frequency,
      previous_volume_per_tree_liters: wizardValues.previous_volume_per_tree_liters,
      harvests: wizardValues.harvests,
      harvest_regularity: wizardValues.harvest_regularity,
      pruning_practiced: wizardValues.pruning_practiced,
      pruning_type: wizardValues.pruning_type,
      last_pruning_date: toMonthDate(wizardValues.last_pruning_date),
      pruning_intensity: wizardValues.pruning_intensity,
      past_fertilization: wizardValues.past_fertilization,
      fertilization_type: wizardValues.fertilization_type,
      biostimulants_used: wizardValues.biostimulants_used,
      stress_events: wizardValues.stress_events,
      observations: wizardValues.observations,
    });

    persistCurrentForm();
    toast.success('Calibrage lance.');
  };

  const renderStepContent = () => {
    if (currentStep === 1) return <PlantationStep form={form} />;
    if (currentStep === 2) return <IrrigationStep form={form} />;
    if (currentStep === 3) return <SoilAnalysisStep form={form} />;
    if (currentStep === 4) return <WaterAnalysisStep form={form} />;
    if (currentStep === 5) return <FoliarAnalysisStep form={form} />;
    if (currentStep === 6) return <HarvestHistoryStep form={form} />;
    if (currentStep === 7) return <CulturalHistoryStep form={form} />;
    return (
      <ValidationStep
        parcelId={parcelId}
        onLaunchCalibration={launchCalibration}
        canLaunch={canLaunchByRequiredData}
        isLaunching={startCalibration.isPending}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assistant de calibrage F1</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Saisie initiale de la parcelle avant lancement du calibrage IA.</p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
          <span>● Obligatoire</span>
          <span>◑ Recommande</span>
          <span>○ Optionnel</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 overflow-x-auto">
        <div className="flex items-center min-w-[760px] justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = isStepCompleted(step.number);

            return (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${
                  isCompleted
                    ? 'bg-green-600 border-green-600 text-white'
                    : isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="ml-2 mr-3">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{STATUS_LABELS[step.status]}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ${isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (currentStep < 8) {
            void handleNext();
          }
        }}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-6"
      >
        {renderStepContent()}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={handleSaveAndCompleteLater}>
            Sauvegarder et completer plus tard
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              Precedent
            </Button>
            {currentStep < 8 && (
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Suivant
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
