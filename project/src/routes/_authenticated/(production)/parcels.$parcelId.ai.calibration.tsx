import React, { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAICalibration } from '@/hooks/useAICalibration';
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics';
import { useUpdateParcel, useParcelById } from '@/hooks/useParcelsQuery';
import { useCalibrationReport,
useCalibrationPhase,
useCalibrationHistory,
useValidateCalibration,
useNutritionSuggestion,
useConfirmNutritionOption, } from '@/hooks/useCalibrationReport';
import { useCalibrationProgress, type CalibrationProgressEvent } from '@/hooks/useCalibrationSocket';
import { useAIPlan } from '@/hooks/useAIPlan';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import type { CalibrationHistoryRecord } from '@/lib/api/calibration-output';
import type {
  CalibrationMaturityPhase,
  NutritionOption,
} from '@/types/calibration-output';
import type { CalibrationPhase } from '@/lib/api/calibration-output';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BrainCircuit,
  Play,
  AlertCircle,
  Satellite,
  CloudRain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Leaf,
  Activity,
  Shield,
  Calendar,
  Thermometer,
  AlertTriangle,
  Info,
  TreePine,
  Save,
  GitCompareArrows,
  Eye,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { SelectionCard } from '@/components/onboarding';
import { ButtonLoader, SectionLoader } from '@/components/ui/loader';
import { CalibrationWizard } from '@/components/calibration/CalibrationWizard';
import { RecalibrationWizard } from '@/components/calibration/RecalibrationWizard';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { AnnualRecalibrationWizard } from '@/components/calibration/AnnualRecalibrationWizard';
import { CalibrationRunInputsPanel } from '@/components/calibration/CalibrationRunInputsPanel';
import { CalibrationReviewSection } from '@/components/calibration/review/CalibrationReviewSection';
import { CalibrationSyntheseBanner } from '@/components/calibration/CalibrationSyntheseBanner';
import { useAnnualEligibility } from '@/hooks/useAnnualRecalibration';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  confidenceToFraction,
  formatConfidencePercent,
} from '@/lib/calibration-confidence';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection = ({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </Button>
      {isOpen && <div className="p-4 bg-white dark:bg-gray-800">{children}</div>}
    </div>
  );
};

const MATURITY_LABELS: Record<CalibrationMaturityPhase, string> = {
  juvenile: 'Juvenile',
  entree_production: 'Early Production',
  pleine_production: 'Full Production',
  maturite_avancee: 'Advanced Maturity',
  senescence: 'Senescence',
  unknown: 'Unknown',
};

function healthScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function formatCalibrationHistoryRunAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale || undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PhaseBanner = ({ phase }: { phase: CalibrationPhase }) => {
  if (phase === 'calibrated') {
    return (
      <div
        className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="calibrated"
      >
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Awaiting Validation</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Review the calibration status below and validate to activate AI diagnostics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'awaiting_nutrition_option') {
    return (
      <div
        className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="awaiting_nutrition_option"
      >
        <div className="flex items-center space-x-3">
          <Leaf className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Select Nutrition Option</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Choose a nutrition management option to complete calibration setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    return (
      <div
        className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30 p-4"
        data-testid="calibration-phase-banner"
        data-phase="active"
      >
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">Calibration Active</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              AI diagnostics and monitoring are fully operational for this parcel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const CalibrationHistoryList = ({ records }: { records: CalibrationHistoryRecord[] }) => {
  const { i18n } = useTranslation();

  if (records.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <Info className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">No previous calibration runs.</span>
      </div>
    );
  }

  const statusStyles: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  };

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const style = statusStyles[record.status] ?? statusStyles.pending;
        const isLatest = index === 0;

        return (
          <div
            key={record.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isLatest
                ? 'border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCalibrationHistoryRunAt(record.created_at, i18n.language)}
                  </span>
                  {isLatest && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                      Current
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                    {record.status}
                  </span>
                </div>
                {record.phase_age && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {MATURITY_LABELS[record.phase_age as CalibrationMaturityPhase] ?? record.phase_age}
                  </span>
                )}
                {record.status === 'failed' && record.error_message && (
                  <span className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate max-w-xs">
                    {record.error_message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 shrink-0">
              {record.health_score != null && (
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Health</div>
                  <div className={`text-sm font-bold ${healthScoreColor(record.health_score)}`}>
                    {record.health_score}
                  </div>
                </div>
              )}
              {record.confidence_score != null && (
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Confidence</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatConfidencePercent(record.confidence_score)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NUTRITION_OPTION_LABELS: Record<NutritionOption, { name: string; description: string }> = {
  A: {
    name: 'Option A — Standard',
    description: 'Balanced fertigation with standard foliar applications.',
  },
  B: {
    name: 'Option B — Enhanced',
    description: 'Enhanced fertigation with biostimulant mix for improved vigor.',
  },
  C: {
    name: 'Option C — Intensive',
    description: 'Intensive program with leaching management and soil amendments.',
  },
};

const NUTRITION_OPTION_ICONS: Record<
  NutritionOption,
  React.ReactNode
> = {
  A: <Leaf className="w-5 h-5" aria-hidden />,
  B: <Sparkles className="w-5 h-5" aria-hidden />,
  C: <TreePine className="w-5 h-5" aria-hidden />,
};

const ValidationPanel = ({ calibrationId, parcelId, healthScore, confidence, onReCalibrate }: { calibrationId: string;
  parcelId: string;
  healthScore: number;
  confidence: number;
  onReCalibrate: () => void; }) => {
  const { mutate: validate, isPending: isValidating } = useValidateCalibration(parcelId);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 p-6">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
          <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Validate Calibration Baseline
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Review the report above. If the results look correct for this parcel, validate to proceed.
          </p>

          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div>
              <span className="text-amber-600 dark:text-amber-400">Health Score:</span>{' '}
              <span className="font-bold text-amber-900 dark:text-amber-100">{healthScore}/100</span>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-400">Confidence:</span>{' '}
              <span className="font-bold text-amber-900 dark:text-amber-100">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="amber" type="button" disabled={isValidating} className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg transition-colors font-medium" >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isValidating ? 'Validating...' : 'Validate & Activate'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Validate this calibration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will lock in the current baseline (health score: {healthScore}/100, confidence: {(confidence * 100).toFixed(0)}%).
                    You will then be asked to select a nutrition management option.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => validate(calibrationId)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Validate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              onClick={onReCalibrate}
              className="inline-flex items-center space-x-2 px-4 py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Re-run Calibration</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NutritionOptionSelector = ({ parcelId, calibrationId, disabled }: {
  parcelId: string;
  calibrationId: string;
  disabled?: boolean;
}) => {
  const { data: suggestion, isLoading: isSuggestionLoading } = useNutritionSuggestion(parcelId);
  const { mutate: confirm, isPending: isConfirming } = useConfirmNutritionOption(parcelId);
  const [selectedOption, setSelectedOption] = useState<NutritionOption | null>(null);

  const effectiveSelection = selectedOption ?? suggestion?.suggested_option ?? null;
  // The backend handles all phase transitions in confirmNutritionOption —
  // don't gate on specific phases here. If the selector is rendered, the
  // user should be able to confirm.
  const canConfirmNutrition = !disabled;

  if (isSuggestionLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <ButtonLoader className="h-6 w-6 text-blue-600" />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Unable to load nutrition suggestions. Please try re-calibrating.
          </span>
        </div>
      </div>
    );
  }

  const options: NutritionOption[] = ['A', 'B', 'C'];

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-6">
      <div className="flex items-start space-x-4 mb-5">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
          <Leaf className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Select Nutrition Option
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Choose a nutrition management program for this parcel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-5 min-w-0">
        {options.map((opt) => {
          const alt = suggestion.alternatives.find((a) => a.option === opt);
          const isEligible = alt?.eligible ?? true;
          const isSuggested = suggestion.suggested_option === opt;
          const isSelected = effectiveSelection === opt;
          const label = NUTRITION_OPTION_LABELS[opt];

          return (
            <div key={opt} className="min-w-0">
              <SelectionCard
                title={label.name}
                description={label.description}
                icon={NUTRITION_OPTION_ICONS[opt]}
                selected={isSelected}
                onClick={() => {
                  if (isEligible && !isConfirming) {
                    setSelectedOption(opt);
                  }
                }}
                disabled={!isEligible || isConfirming}
                color="indigo"
                badge={isSuggested ? 'Recommended' : undefined}
                descriptionClassName="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-4 break-words"
                footer={
                  alt?.reason ? (
                    <p
                      className={
                        isEligible
                          ? 'text-xs text-gray-500 dark:text-gray-400'
                          : 'text-xs text-red-600 dark:text-red-400'
                      }
                    >
                      {alt.reason}
                    </p>
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {canConfirmNutrition && (
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3 rounded-lg bg-white/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 px-3 py-2">
          Choose an option above (highlight updates when you tap a card), then confirm to finish activation.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="blue"
          type="button"
          disabled={!effectiveSelection || isConfirming || !canConfirmNutrition}
          onClick={() => {
            if (effectiveSelection && canConfirmNutrition) {
              confirm({ calibrationId, option: effectiveSelection });
            }
          }}
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg transition-colors font-medium"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isConfirming ? 'Confirming...' : 'Confirm Selection'}</span>
        </Button>
        {effectiveSelection && effectiveSelection !== suggestion.suggested_option && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Overriding system suggestion ({suggestion.suggested_option})
          </span>
        )}
      </div>
    </div>
  );
};

const PlantingYearPrompt = ({ parcelId, onSaved }: { parcelId: string;
  onSaved: () => void; }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>('');
  const updateParcel = useUpdateParcel();
  const isSaving = updateParcel.isPending;

  const parsedYear = parseInt(year, 10);
  const isValid = !Number.isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= currentYear;

  const handleSave = () => {
    if (!isValid) return;
    updateParcel.mutate(
      { id: parcelId, updates: { planting_year: parsedYear } },
      { onSuccess: onSaved },
    );
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-6">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
          <TreePine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            Planting Year Required
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Calibration V2 uses the plantation age to adjust thresholds and maturity models.
            Please specify the year this parcel was planted.
          </p>
          <div className="flex items-end space-x-3 mt-4">
            <div>
              <label htmlFor="planting-year-input" className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                Year planted
              </label>
              <input
                id="planting-year-input"
                type="number"
                min={1900}
                max={currentYear}
                placeholder={String(currentYear - 10)}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) handleSave();
                }}
                className="w-28 px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <Button variant="amber" type="button" onClick={handleSave} disabled={!isValid || isSaving} className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium" >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Continue'}</span>
            </Button>
          </div>
          {year && !isValid && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Enter a year between 1900 and {currentYear}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const CALIBRATION_STEPS: Record<string, { icon: React.ReactNode; label: string }> = {
  data_collection: { icon: <Satellite className="w-4 h-4" />, label: 'Collecte des données' },
  satellite_sync: { icon: <Satellite className="w-4 h-4" />, label: 'Synchronisation satellite' },
  weather_sync: { icon: <CloudRain className="w-4 h-4" />, label: 'Synchronisation météo' },
  raster_extraction: { icon: <Target className="w-4 h-4" />, label: 'Extraction pixels NDVI' },
  gdd_precompute: { icon: <Thermometer className="w-4 h-4" />, label: 'Calcul degrés-jours' },
  calibration_engine: { icon: <BrainCircuit className="w-4 h-4" />, label: 'Moteur de calibration' },
  saving_results: { icon: <Save className="w-4 h-4" />, label: 'Sauvegarde résultats' },
  ai_reports: { icon: <Activity className="w-4 h-4" />, label: 'Rapports IA' },
  finalizing: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Finalisation' },
};

const CalibrationProgressStepper = ({ progress }: { progress: CalibrationProgressEvent | null }) => {
  const currentStep = progress?.step ?? 0;
  const totalSteps = progress?.total_steps ?? 7;
  const percent = progress?.percent ?? 0;
  const stepKey = progress?.step_key ?? '';
  const message = progress?.message ?? 'Initialisation du calibrage...';

  const stepKeys = totalSteps === 5
    ? ['data_collection', 'calibration_engine', 'saving_results', 'ai_reports', 'finalizing']
    : ['data_collection', 'satellite_sync', 'raster_extraction', 'gdd_precompute', 'calibration_engine', 'saving_results', 'ai_reports'];

  return (
    <div
      className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30 p-6"
      data-testid="calibration-in-progress"
    >
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Calibration en cours</h3>
          <p className="text-sm text-purple-700 dark:text-purple-300">{message}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{percent}%</span>
        </div>
      </div>

      <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-5 overflow-hidden">
        <div
          className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>

      <div className="space-y-2">
        {stepKeys.map((key, index) => {
          const stepNum = index + 1;
          const stepDef = CALIBRATION_STEPS[key];
          const isActive = key === stepKey;
          const isCompleted = currentStep > stepNum;

          return (
            <div
              key={key}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-purple-100 dark:bg-purple-900/40 ring-1 ring-purple-300 dark:ring-purple-700'
                  : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'opacity-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">{stepNum}</span>
                )}
              </div>

              <div className={`flex items-center space-x-2 ${
                isActive
                  ? 'text-purple-900 dark:text-purple-100'
                  : isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-400 dark:text-gray-500'
              }`}>
                {stepDef?.icon}
                <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                  {stepDef?.label ?? key}
                </span>
              </div>

              {isActive && (
                <div className="ml-auto">
                  <div className="w-4 h-4 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AICalibrationPage = () => {
  const { parcelId } = Route.useParams();
  const { t: tAi } = useTranslation('ai');
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const [isPartialWizardOpen, setIsPartialWizardOpen] = useState(false);
  const [isFullWizardOpen, setIsFullWizardOpen] = useState(false);
  const [lastCalibrationLaunchAt, setLastCalibrationLaunchAt] = useState<number | null>(null);

  const { data: parcelData, refetch: refetchParcel } = useParcelById(parcelId);
  const { data: calibration, isLoading: isCalibrationLoading, refetch: refetchCalibration } = useAICalibration(parcelId);
  const { data: phase, refetch: refetchPhase } = useCalibrationPhase(parcelId);
  const { data: diagnostics } = useAIDiagnostics(parcelId, phase === 'active');
  const calibrationProgress = useCalibrationProgress(parcelId);

  const { data: reportData, isLoading: isReportLoading, refetch: refetchReport } = useCalibrationReport(parcelId);
  const { data: historyRecords } = useCalibrationHistory(parcelId);
  const { data: annualPlan } = useAIPlan(parcelId);
  const { data: aiRecommendations } = useAIRecommendations(parcelId);
  const [showAnnualRecalibrationWizard, setShowAnnualRecalibrationWizard] = useState(false);

  const { data: annualEligibility, isLoading: isAnnualEligibilityLoading } = useAnnualEligibility(
    phase === 'active' ? parcelId : '',
  );

  const v2Output = reportData?.report?.output ?? null;
  const hasV2Report = v2Output !== null;
  const missingPlantingYear = parcelData !== null && parcelData !== undefined && !parcelData.planting_year;

  const calibrationActuallyRunning = calibration?.status === 'in_progress' || calibration?.status === 'provisioning';
  const isCalibrating = calibrationActuallyRunning || (phase === 'calibrating' && !calibration && !hasV2Report);
  const calibrationCompletedButPhaseStuck =
    ((phase === 'unknown' || !phase) && hasV2Report && calibration?.status !== 'failed' && calibration?.status !== 'in_progress') ||
    (phase === 'calibrating' && !calibrationActuallyRunning && hasV2Report && (calibration?.status === 'completed' || calibration?.status === 'validated'));
  const isBusy = isCalibrating;
  const isFailed = calibration?.status === 'failed';
  const isWizardPhase =
    phase === 'awaiting_data' ||
    phase === 'ready_calibration' ||
    ((phase === 'unknown' || !phase) && !calibration && !hasV2Report);
  const canShowAnnualBanner = phase === 'active' && annualEligibility?.eligible === true;
  const isObservationOnly = phase === 'active' && parcelData?.ai_observation_only === true;
  const estimatedCampaignCount = Math.max(2, historyRecords?.length ?? 1);
  const isWaitingForCalibrationResult =
    lastCalibrationLaunchAt !== null &&
    !(hasV2Report || calibrationCompletedButPhaseStuck || phase === 'calibrated' || phase === 'awaiting_nutrition_option' || phase === 'active' || isFailed);

  const handleOpenPartialRecalibration = () => {
    setIsPartialWizardOpen(true);
  };

  const handleClosePartialRecalibration = () => {
    setIsPartialWizardOpen(false);
  };

  const handleCancelPartialRecalibration = () => {
    setIsPartialWizardOpen(false);
    navigate({ to: `/parcels/${parcelId}` });
  };

  const handleOpenFullRecalibrationWizard = () => {
    setIsPartialWizardOpen(false);
    setIsFullWizardOpen(true);
  };

  const handleCloseFullWizard = () => {
    setIsFullWizardOpen(false);
  };

  const handleCalibrationLaunchStarted = () => {
    setLastCalibrationLaunchAt(Date.now());
    setIsFullWizardOpen(false);
  };

  useEffect(() => {
    if (!parcelId || (!isWaitingForCalibrationResult && !isCalibrating)) {
      return;
    }

    const pollCalibrationState = () => {
      void refetchCalibration();
      void refetchPhase();
      void refetchReport();
      void refetchParcel();
    };

    pollCalibrationState();
    const intervalId = window.setInterval(pollCalibrationState, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isCalibrating,
    isWaitingForCalibrationResult,
    parcelId,
    refetchCalibration,
    refetchParcel,
    refetchPhase,
    refetchReport,
  ]);

  if (isCalibrationLoading || isReportLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  return (
    <div className="space-y-6" data-testid="calibration-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="calibration-page-title">
            {tAi('calibration.page.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tAi('calibration.page.subtitle')}
          </p>
        </div>
        {(calibration || hasV2Report) && (
          <div className="flex items-center gap-2">
            {phase === 'active' && (
              <Button variant="blue" type="button" onClick={handleOpenPartialRecalibration} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" data-testid="calibration-open-partial-recalibration" >
                <GitCompareArrows className="w-4 h-4" />
                <span>{tAi('calibration.page.partialUpdate')}</span>
              </Button>
            )}

            <Button variant="green" type="button" onClick={handleOpenFullRecalibrationWizard} disabled={isBusy || missingPlantingYear} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" title={missingPlantingYear ? tAi('calibration.page.plantingYearTitle') : undefined} data-testid="calibration-open-full-recalibration" >
              {isBusy ? (
                <BrainCircuit className="w-4 h-4 animate-pulse" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {isCalibrating ? tAi('calibration.page.calculating') : tAi('calibration.page.fullRecalibration')}
              </span>
            </Button>
          </div>
        )}
      </div>

      {phase && <PhaseBanner phase={phase} />}

      {!isCalibrating && hasV2Report && (phase === 'calibrated' || phase === 'awaiting_nutrition_option' || phase === 'active' || calibrationCompletedButPhaseStuck) && (
        <CalibrationSyntheseBanner
          parcelId={parcelId}
          onNavigateToReview={() => {
            document.querySelector('[data-testid="calibration-review-section"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {!isCalibrating &&
        (phase === 'calibrated' || phase === 'awaiting_nutrition_option' || phase === 'calibrating' || calibrationCompletedButPhaseStuck) &&
        reportData?.calibration?.id && (
        <div className="space-y-4" data-testid="calibration-action-panels">
          {(phase === 'calibrated' || calibrationCompletedButPhaseStuck) && calibration?.status !== 'validated' && hasV2Report && v2Output && (
            <ValidationPanel
              calibrationId={reportData.calibration.id}
              parcelId={parcelId}
              healthScore={v2Output.step8.health_score.total}
              confidence={
                confidenceToFraction(v2Output.confidence.normalized_score) ?? 0
              }
              onReCalibrate={handleOpenFullRecalibrationWizard}
            />
          )}
          {(phase === 'awaiting_nutrition_option' ||
            calibration?.status === 'validated' ||
            calibrationCompletedButPhaseStuck) &&
            parcelData?.ai_phase !== 'active' && (
          <NutritionOptionSelector
            parcelId={parcelId}
            calibrationId={reportData.calibration.id}
            disabled={calibrationActuallyRunning}
          />
          )}
        </div>
      )}

      {hasV2Report && reportData?.report && typeof reportData.report === 'object' && (
        <CalibrationRunInputsPanel
          report={reportData.report as Record<string, unknown>}
          onOpenPartialRecalibration={phase === 'active' ? handleOpenPartialRecalibration : undefined}
          onOpenFullRecalibration={handleOpenFullRecalibrationWizard}
          fullRecalibrationDisabled={isBusy || missingPlantingYear}
          fullRecalibrationTitle={missingPlantingYear ? tAi('calibration.page.plantingYearTitle') : undefined}
        />
      )}

      {!isCalibrating && (phase === 'calibrated' || phase === 'awaiting_nutrition_option' || phase === 'active' || calibrationCompletedButPhaseStuck) && (
        <CalibrationReviewSection parcelId={parcelId} />
      )}

      <ResponsiveDialog
        open={isPartialWizardOpen}
        onOpenChange={(open) => (open ? setIsPartialWizardOpen(true) : handleClosePartialRecalibration())}
        size="4xl"
        className="p-0"
        contentClassName="max-h-[92vh] overflow-y-auto p-0"
      >
        <div data-testid="calibration-partial-recalibration-dialog">
          <div className="px-2 pt-2 pb-1 sm:px-4 sm:pt-4 sm:pb-2">
            <RecalibrationWizard
              parcelId={parcelId}
              baselineData={reportData}
              confidenceScore={
                v2Output?.confidence.normalized_score != null
                  ? (confidenceToFraction(v2Output.confidence.normalized_score) ??
                    undefined)
                  : undefined
              }
              onClose={handleCancelPartialRecalibration}
              onSwitchToFullRecalibration={handleOpenFullRecalibrationWizard}
            />
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={isFullWizardOpen}
        onOpenChange={(open) => (open ? setIsFullWizardOpen(true) : handleCloseFullWizard())}
        size="4xl"
        className="p-0"
        contentClassName="max-h-[92vh] overflow-y-auto p-0"
      >
          <div className="px-2 pt-2 pb-1 sm:px-4 sm:pt-4 sm:pb-2">
            <CalibrationWizard
              parcelId={parcelId}
              parcelData={parcelData}
              onStarted={handleCalibrationLaunchStarted}
            />
          </div>
      </ResponsiveDialog>

      {phase === 'active' && !isAnnualEligibilityLoading && canShowAnnualBanner && (
        <div
          className="rounded-xl border border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/20 p-4"
          data-testid="calibration-annual-eligibility-banner"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">{tAi('calibration.annualBanner.title')}</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {tAi('calibration.annualBanner.body')}
              </p>
            </div>
            <Button variant="green"
              type="button"
              onClick={() => setShowAnnualRecalibrationWizard(true)}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              data-testid="calibration-start-annual-recalibration"
            >
              {tAi('calibration.annualBanner.cta')}
            </Button>
          </div>
        </div>
      )}

      {phase === 'active' && (() => {
        const saisonReady = !!annualPlan?.id && annualPlan.status !== undefined;
        return (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  {tAi('calibration.nextStep.title')}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {saisonReady
                    ? tAi('calibration.nextStep.body')
                    : tAi(
                        'calibration.nextStep.preparing',
                        'Votre saison se prépare. Ouvrez-la pour suivre la progression — elle sera prête dans 1 à 2 min.',
                      )}
                </p>
                {saisonReady && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {annualPlan?.status === 'draft'
                      ? tAi('calibration.nextStep.hintDraft')
                      : aiRecommendations && aiRecommendations.length > 0
                        ? tAi('calibration.nextStep.hintTips')
                        : tAi('calibration.nextStep.hintNoTips')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="blue"
                  type="button"
                  onClick={() =>
                    navigate({
                      to: '/parcels/$parcelId/ai/plan/summary',
                      params: { parcelId },
                      search: { farmId: undefined },
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {tAi('calibration.nextStep.openSaison', 'Ouvrir la Saison')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showAnnualRecalibrationWizard && (
        <AnnualRecalibrationWizard
          parcelId={parcelId}
          estimatedCampaignCount={estimatedCampaignCount}
          onClose={() => setShowAnnualRecalibrationWizard(false)}
        />
      )}

      {missingPlantingYear && (
        <PlantingYearPrompt parcelId={parcelId} onSaved={() => refetchParcel()} />
      )}

      {isWizardPhase && !missingPlantingYear && !isFullWizardOpen && !isWaitingForCalibrationResult && (
        <CalibrationWizard
          parcelId={parcelId}
          parcelData={parcelData}
          onStarted={handleCalibrationLaunchStarted}
        />
      )}

      {isCalibrating && (
        <CalibrationProgressStepper progress={calibrationProgress} />
      )}

      {isObservationOnly && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4">
          <div className="flex items-start space-x-3">
            <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">{tAi('calibration.observationMode.title')}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {tAi('calibration.observationMode.body')}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasV2Report &&
        !isCalibrating &&
        v2Output?.metadata?.data_quality_flags?.includes('insufficient_satellite_data') && (
          <div className="space-y-4" data-testid="calibration-report">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-700 p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Limited Satellite Data</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    This calibration was computed with fewer than 6 satellite observations. Results may be unreliable —
                    consider re-calibrating once more imagery is available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {historyRecords && historyRecords.length > 1 && !isCalibrating && (
        <CollapsibleSection
          title="Calibration History"
          icon={<Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
          badge={(
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
              {historyRecords.length}
            </span>
          )}
          defaultOpen={false}
        >
          <CalibrationHistoryList records={historyRecords} />
        </CollapsibleSection>
      )}

      {isFailed && !isCalibrating && (
        <div
          className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/30 p-6"
          data-testid="calibration-failed-panel"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Calibration Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The calibration process encountered an error.
                {calibration?.error_message && (
                  <> Reason: <span className="font-medium">{calibration.error_message}</span></>
                )}
              </p>
              <Button variant="red" type="button" onClick={handleOpenFullRecalibrationWizard} disabled={missingPlantingYear} className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors" >
                <Play className="w-4 h-4" />
                <span>Retry Calibration</span>
              </Button>
            </div>
          </div>
        </div>
      )}



      {phase === 'active' && diagnostics && typeof diagnostics === 'object' && 'scenario_code' in diagnostics && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diagnostics</h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <span>Scénario {diagnostics.scenario_code}</span>
              <span>·</span>
              <span>
                Confiance{' '}
                {Math.round(
                  diagnostics.confidence <= 1 ? diagnostics.confidence * 100 : diagnostics.confidence,
                )}
                %
              </span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">{diagnostics.scenario}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{diagnostics.description}</p>
            {diagnostics.observation_only && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Mode observation — suivi prudent.</p>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/calibration')({
  component: AICalibrationPage,
});
