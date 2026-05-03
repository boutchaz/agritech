import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
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
useConfirmNutritionOption,
useCalibrationBundle, } from '@/hooks/useCalibrationReport';
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
// Wizards are heavy and only rendered when the user opens a dialog.
// Code-split them so the initial calibration page payload shrinks.
const CalibrationWizard = lazy(() =>
  import('@/components/calibration/CalibrationWizard').then((m) => ({ default: m.CalibrationWizard })),
);
const RecalibrationWizard = lazy(() =>
  import('@/components/calibration/RecalibrationWizard').then((m) => ({ default: m.RecalibrationWizard })),
);
const AnnualRecalibrationWizard = lazy(() =>
  import('@/components/calibration/AnnualRecalibrationWizard').then((m) => ({
    default: m.AnnualRecalibrationWizard,
  })),
);
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { TargetYieldStep } from '@/components/calibration/TargetYieldStep';
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
import { cn } from '@/lib/utils';

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

const CALIBRATION_TYPE_LABELS: Record<string, string> = {
  initial: 'Initial',
  F2_partial: 'Partial',
  F3_complete: 'Annual',
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

  // "Active baseline" = most-recent validated run; it's what AI diagnostics
  // and the annual plan actually read. Without this marker, users confuse
  // the latest (possibly failed) run with the live reference.
  const activeBaselineId = records.find((r) => r.status === 'validated')?.id ?? null;

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const style = statusStyles[record.status] ?? statusStyles.pending;
        const isLatest = index === 0;
        const isActiveBaseline = record.id === activeBaselineId;
        const typeLabel = CALIBRATION_TYPE_LABELS[record.type] ?? record.type;

        return (
          <div
            key={record.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isActiveBaseline
                ? 'border-green-300 dark:border-green-700/60 bg-green-50 dark:bg-green-900/15 ring-1 ring-green-200 dark:ring-green-800/40'
                : isLatest
                ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCalibrationHistoryRunAt(record.created_at, i18n.language)}
                  </span>
                  {isActiveBaseline && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-600 text-white font-medium">
                      Active baseline
                    </span>
                  )}
                  {isLatest && !isActiveBaseline && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                      Latest run
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                    {typeLabel}
                  </span>
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

/** Validate + re-run only (copy lives in the hero card — no second amber panel). */
const CalibrationValidateControls = ({
  calibrationId,
  parcelId,
  healthScore,
  confidence,
  onReCalibrate,
}: {
  calibrationId: string;
  parcelId: string;
  healthScore: number;
  confidence: number;
  onReCalibrate: () => void;
}) => {
  const { mutate: validate, isPending: isValidating } = useValidateCalibration(parcelId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="amber"
            type="button"
            disabled={isValidating}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg transition-colors font-medium"
            data-testid="calibration-validate-open-dialog"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isValidating ? 'Validating...' : 'Validate & Activate'}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validate this calibration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock in the current baseline (health score: {healthScore}/100, confidence:{' '}
              {(confidence * 100).toFixed(0)}%). You will then be asked to select a nutrition management option.
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
        variant="outline"
        onClick={onReCalibrate}
        className="inline-flex items-center space-x-2 px-4 py-2.5 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
      >
        <Play className="w-4 h-4" />
        <span>Re-run Calibration</span>
      </Button>
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

const CALIBRATION_STEP_ICONS: Record<string, React.ReactNode> = {
  data_collection: <Satellite className="w-4 h-4" />,
  satellite_sync: <Satellite className="w-4 h-4" />,
  weather_sync: <CloudRain className="w-4 h-4" />,
  raster_extraction: <Target className="w-4 h-4" />,
  gdd_precompute: <Thermometer className="w-4 h-4" />,
  calibration_engine: <BrainCircuit className="w-4 h-4" />,
  saving_results: <Save className="w-4 h-4" />,
  ai_reports: <Activity className="w-4 h-4" />,
  finalizing: <CheckCircle2 className="w-4 h-4" />,
};

const CALIBRATION_STEP_LABELS: Record<string, { fr: string; en: string }> = {
  data_collection: { fr: 'Collecte des données', en: 'Data collection' },
  satellite_sync: { fr: 'Synchronisation satellite', en: 'Satellite sync' },
  weather_sync: { fr: 'Synchronisation météo', en: 'Weather sync' },
  raster_extraction: { fr: 'Extraction pixels NDVI', en: 'NDVI pixel extraction' },
  gdd_precompute: { fr: 'Calcul degrés-jours', en: 'Growing degree days' },
  calibration_engine: { fr: 'Moteur de calibration', en: 'Calibration engine' },
  saving_results: { fr: 'Sauvegarde résultats', en: 'Saving results' },
  ai_reports: { fr: 'Rapports IA', en: 'AI reports' },
  finalizing: { fr: 'Finalisation', en: 'Finalizing' },
};

function resolveStepLabel(key: string, locale: string): string {
  const entry = CALIBRATION_STEP_LABELS[key];
  if (!entry) return key;
  const lang = (locale || '').toLowerCase().split('-')[0];
  return lang === 'fr' ? entry.fr : entry.en;
}

// ─── Journey timeline (always visible)  ─────────────────────────────
type JourneyStepKey = 'data' | 'calibration' | 'baseline' | 'monitoring';

function deriveJourneyStep(
  phase: CalibrationPhase | null | undefined,
  hasV2Report: boolean,
): JourneyStepKey {
  if (phase === 'active') return 'monitoring';
  if (phase === 'calibrated' || phase === 'awaiting_nutrition_option') return 'baseline';
  if (phase === 'calibrating') return 'calibration';
  if (hasV2Report) return 'baseline';
  return 'data';
}

const PhaseTimeline = ({ current }: { current: JourneyStepKey }) => {
  const steps: Array<{ key: JourneyStepKey; label: string; hint: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'data', label: 'Data', hint: 'Year, satellite, weather', Icon: Satellite },
    { key: 'calibration', label: 'Calibration', hint: 'Running models', Icon: BrainCircuit },
    { key: 'baseline', label: 'Baseline', hint: 'Validate + nutrition', Icon: Shield },
    { key: 'monitoring', label: 'Monitoring', hint: 'AI diagnostics live', Icon: Activity },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Calibration journey">
      {steps.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        const tone = isDone
          ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800/60 dark:bg-green-900/20 dark:text-green-100'
          : isActive
          ? 'border-emerald-400 bg-white ring-2 ring-emerald-400/40 text-gray-900 dark:border-emerald-500 dark:bg-gray-900 dark:text-white shadow-sm'
          : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500';

        return (
          <li
            key={step.key}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
              tone,
            )}
          >
            <div
              className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                isDone
                  ? 'bg-green-600 text-white'
                  : isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
              )}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <step.Icon className="h-3.5 w-3.5 opacity-70" />
                {step.label}
              </div>
              <p className="text-[11px] leading-tight opacity-80 mt-0.5">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

// ─── Hero status card  ─────────────────────────────────────────────
type HeroTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const HERO_TONE_CLASSES: Record<HeroTone, { card: string; pill: string; icon: string }> = {
  neutral: {
    card: 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
    pill: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    icon: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  },
  info: {
    card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/50 dark:from-blue-950/30 dark:to-gray-900',
    pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  },
  warning: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-gray-900',
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  },
  success: {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-gray-900',
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  danger: {
    card: 'border-red-200 bg-gradient-to-br from-red-50 to-white dark:border-red-900/50 dark:from-red-950/30 dark:to-gray-900',
    pill: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  },
};

interface HeroStatus {
  tone: HeroTone;
  statusLabel: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function deriveHeroStatus({
  phase,
  isFailed,
  isCalibrating,
  missingPlantingYear,
  isObservationOnly,
}: {
  phase: CalibrationPhase | null | undefined;
  isFailed: boolean;
  isCalibrating: boolean;
  missingPlantingYear: boolean;
  isObservationOnly: boolean;
}): HeroStatus {
  if (missingPlantingYear) {
    return {
      tone: 'warning',
      statusLabel: 'Needs input',
      title: 'Planting year required',
      description: 'Tell us when this parcel was planted so we can tune age-aware thresholds.',
      Icon: TreePine,
    };
  }
  if (isFailed) {
    return {
      tone: 'danger',
      statusLabel: 'Failed',
      title: 'Calibration failed',
      description: 'Something went wrong during the last run — retry calibration to continue.',
      Icon: AlertCircle,
    };
  }
  if (isCalibrating) {
    return {
      tone: 'info',
      statusLabel: 'In progress',
      title: 'Calibration running',
      description: 'We’re analyzing satellite imagery, weather and parcel data.',
      Icon: BrainCircuit,
    };
  }
  if (phase === 'active') {
    return {
      tone: isObservationOnly ? 'warning' : 'success',
      statusLabel: isObservationOnly ? 'Observation mode' : 'Active',
      title: isObservationOnly ? 'Observation mode active' : 'AI diagnostics live',
      description: isObservationOnly
        ? 'Low confidence — AI suggestions are shown but treated as observations only.'
        : 'Baseline validated. The AI is monitoring this parcel in real time.',
      Icon: isObservationOnly ? Eye : CheckCircle2,
    };
  }
  if (phase === 'awaiting_nutrition_option') {
    return {
      tone: 'info',
      statusLabel: 'Awaiting nutrition choice',
      title: 'Choose a nutrition program',
      description: 'Pick a nutrition program to finish activating AI diagnostics.',
      Icon: Leaf,
    };
  }
  if (phase === 'calibrated') {
    return {
      tone: 'warning',
      statusLabel: 'Awaiting validation',
      title: 'Validate the calibration baseline',
      description: 'Review the report below and validate to lock in the reference state.',
      Icon: Shield,
    };
  }
  // ready_calibration | awaiting_data | unknown
  return {
    tone: 'neutral',
    statusLabel: 'Not calibrated',
    title: 'Start calibration',
    description: 'Run the calibration wizard to build the parcel’s baseline.',
    Icon: BrainCircuit,
  };
}

interface HeroStatusCardProps {
  status: HeroStatus;
  healthScore: number | null;
  confidenceFraction: number | null;
  baselineDate: string | null;
  locale: string;
  /** When set, replaces the default primary/secondary CTAs (e.g. validate baseline controls). */
  actionSlot?: React.ReactNode;
  primaryCta?: { label: string; onClick: () => void; disabled?: boolean; Icon?: React.ComponentType<{ className?: string }> };
  secondaryCta?: { label: string; onClick: () => void; disabled?: boolean; Icon?: React.ComponentType<{ className?: string }> };
}

const HeroStatusCard = ({
  status,
  healthScore,
  confidenceFraction,
  baselineDate,
  locale,
  actionSlot,
  primaryCta,
  secondaryCta,
}: HeroStatusCardProps) => {
  const tone = HERO_TONE_CLASSES[status.tone];
  const StatusIcon = status.Icon;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 sm:p-6 shadow-sm',
        tone.card,
      )}
      data-testid="calibration-hero-status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', tone.icon)}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tone.pill)}>
              {status.statusLabel}
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {status.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-prose">
              {status.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:w-72 sm:shrink-0">
          <HeroMetric
            label="Health"
            value={healthScore != null ? `${healthScore}` : '—'}
            suffix={healthScore != null ? '/100' : undefined}
            valueClassName={healthScore != null ? healthScoreColor(healthScore) : undefined}
          />
          <HeroMetric
            label="Confidence"
            value={
              confidenceFraction != null
                ? `${Math.round(confidenceFraction * 100)}`
                : '—'
            }
            suffix={confidenceFraction != null ? '%' : undefined}
          />
          <HeroMetric
            label="Baseline"
            value={
              baselineDate
                ? new Date(baselineDate).toLocaleDateString(locale || undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
            }
            valueClassName="text-sm sm:text-base"
          />
        </div>
      </div>

      {(actionSlot || primaryCta || secondaryCta) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-black/5 dark:border-white/5">
          {actionSlot ? (
            actionSlot
          ) : (
            <>
              {primaryCta && (
                <Button
                  variant={status.tone === 'danger' ? 'red' : status.tone === 'warning' ? 'amber' : status.tone === 'success' ? 'green' : 'blue'}
                  type="button"
                  onClick={primaryCta.onClick}
                  disabled={primaryCta.disabled}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  data-testid="calibration-hero-primary-cta"
                >
                  {primaryCta.Icon ? <primaryCta.Icon className="w-4 h-4" /> : null}
                  {primaryCta.label}
                </Button>
              )}
              {secondaryCta && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={secondaryCta.onClick}
                  disabled={secondaryCta.disabled}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  data-testid="calibration-hero-secondary-cta"
                >
                  {secondaryCta.Icon ? <secondaryCta.Icon className="w-4 h-4" /> : null}
                  {secondaryCta.label}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const HeroMetric = ({
  label,
  value,
  suffix,
  valueClassName,
}: {
  label: string;
  value: string;
  suffix?: string;
  valueClassName?: string;
}) => (
  <div className="rounded-lg bg-white/70 dark:bg-gray-950/40 border border-black/5 dark:border-white/5 p-2.5">
    <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className={cn('mt-0.5 text-lg font-bold text-gray-900 dark:text-white', valueClassName)}>
      {value}
      {suffix && (
        <span className="ml-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const CalibrationProgressStepper = ({ progress }: { progress: CalibrationProgressEvent | null }) => {
  const { i18n } = useTranslation();
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
          const stepIcon = CALIBRATION_STEP_ICONS[key];
          const stepLabel = resolveStepLabel(key, i18n.language);
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
                {stepIcon}
                <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                  {stepLabel}
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
  const { t: tAi, i18n } = useTranslation('ai');
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const [isPartialWizardOpen, setIsPartialWizardOpen] = useState(false);
  const [isFullWizardOpen, setIsFullWizardOpen] = useState(false);
  const [lastCalibrationLaunchAt, setLastCalibrationLaunchAt] = useState<number | null>(null);

  const { data: parcelData, refetch: refetchParcel } = useParcelById(parcelId);
  // Aggregate fetch — must run before the per-piece hooks so its onSuccess
  // can seed their queryKeys before they evaluate their fetchers.
  useCalibrationBundle(parcelId);
  const { data: calibration, isLoading: isCalibrationLoading, isFetching: isCalibrationFetching, refetch: refetchCalibration } = useAICalibration(parcelId);
  const { data: phase, isFetching: isPhaseFetching, refetch: refetchPhase } = useCalibrationPhase(parcelId);
  const { data: diagnostics } = useAIDiagnostics(parcelId, phase === 'active');
  const calibrationProgress = useCalibrationProgress(parcelId);

  const { data: reportData, isLoading: isReportLoading, isFetching: isReportFetching, refetch: refetchReport } = useCalibrationReport(parcelId);
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
    ((phase === 'unknown' || !phase) && !hasV2Report && !calibrationActuallyRunning);
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

  // "Soft" F2/F3 recalibration banner — freshness check on the latest run.
  // Hoisted above the early `isResolving` return so hooks fire in a stable order.
  const latestHistoryHeadForSoftBanner = historyRecords?.[0] ?? null;
  const softRecalibrationKind: 'Partial' | 'Annual' | null = useMemo(() => {
    const h = latestHistoryHeadForSoftBanner;
    if (!h || phase !== 'active' || h.status !== 'validated') return null;
    if (h.type !== 'F2_partial' && h.type !== 'F3_complete') return null;
    const completedAt = h.completed_at ? Date.parse(h.completed_at) : NaN;
    if (!Number.isFinite(completedAt)) return null;
    // eslint-disable-next-line react-hooks/purity -- freshness check: stale after 30 min
    const ageMinutes = (Date.now() - completedAt) / 60000;
    if (ageMinutes > 30) return null;
    return h.type === 'F2_partial' ? 'Partial' : 'Annual';
  }, [latestHistoryHeadForSoftBanner, phase]);
  const shouldShowSoftRecalibration = softRecalibrationKind !== null;

  // Show loader during initial load OR during background refetch when the
  // current (possibly stale) data would produce an empty page.
  const wouldBeEmptyPage = !hasV2Report && !isCalibrating && !isFailed &&
    (phase === 'unknown' || !phase) && !calibrationCompletedButPhaseStuck;
  const isResolving = isCalibrationLoading || isReportLoading ||
    (wouldBeEmptyPage && (isCalibrationFetching || isReportFetching || isPhaseFetching));

  if (isResolving) {
    return <SectionLoader className="h-64 py-0" />;
  }

  // Hero status — derived from phase/flags to surface the most relevant CTA
  const heroStatus = deriveHeroStatus({
    phase,
    isFailed,
    isCalibrating,
    missingPlantingYear,
    isObservationOnly,
  });

  const latestHistory = historyRecords?.[0] ?? null;
  const baselineDate = latestHistory?.completed_at ?? latestHistory?.created_at ?? null;
  const heroHealthScore = v2Output?.step8?.health_score?.total ?? latestHistory?.health_score ?? null;
  const heroConfidence =
    (v2Output ? confidenceToFraction(v2Output.confidence.normalized_score) : null) ??
    (latestHistory?.confidence_score != null
      ? confidenceToFraction(latestHistory.confidence_score)
      : null);

  let heroPrimary: HeroStatusCardProps['primaryCta'] | undefined;
  let heroSecondary: HeroStatusCardProps['secondaryCta'] | undefined;

  if (missingPlantingYear) {
    heroPrimary = {
      label: 'Add planting year',
      onClick: () => {
        document.getElementById('planting-year-input')?.focus();
      },
      Icon: TreePine,
    };
  } else if (isFailed) {
    heroPrimary = {
      label: 'Retry calibration',
      onClick: handleOpenFullRecalibrationWizard,
      Icon: Play,
      disabled: missingPlantingYear,
    };
  } else if (isCalibrating) {
    heroPrimary = {
      label: 'Calibrating…',
      onClick: () => {},
      disabled: true,
      Icon: BrainCircuit,
    };
  } else if (phase === 'calibrated') {
    // Validate + re-run live in the hero card (CalibrationValidateControls via actionSlot).
  } else if (phase === 'awaiting_nutrition_option') {
    heroPrimary = {
      label: 'Choose nutrition option',
      onClick: () =>
        document
          .querySelector('[data-testid="calibration-action-panels"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      Icon: Leaf,
    };
  } else if (phase === 'active') {
    heroPrimary = {
      label: tAi('calibration.nextStep.openSaison', 'Open the season'),
      onClick: () =>
        navigate({
          to: '/parcels/$parcelId/ai/plan/summary',
          params: { parcelId },
          search: { farmId: undefined },
        }),
      Icon: ArrowRight,
    };
    heroSecondary = {
      label: tAi('calibration.page.partialUpdate'),
      onClick: handleOpenPartialRecalibration,
      Icon: GitCompareArrows,
      disabled: isBusy,
    };
  } else if (phase !== 'calibrating' && !isWizardPhase) {
    heroPrimary = {
      label: isCalibrating ? tAi('calibration.page.calculating') : tAi('calibration.page.fullRecalibration'),
      onClick: handleOpenFullRecalibrationWizard,
      Icon: Play,
      disabled: isBusy || missingPlantingYear,
    };
  }

  const journeyStep = deriveJourneyStep(phase, hasV2Report);

  const heroValidateActionSlot =
    (phase === 'calibrated' || calibrationCompletedButPhaseStuck) &&
    calibration?.status !== 'validated' &&
    hasV2Report &&
    v2Output &&
    reportData?.calibration?.id ? (
      <CalibrationValidateControls
        calibrationId={reportData.calibration.id}
        parcelId={parcelId}
        healthScore={v2Output.step8.health_score.total}
        confidence={confidenceToFraction(v2Output.confidence.normalized_score) ?? 0}
        onReCalibrate={handleOpenFullRecalibrationWizard}
      />
    ) : undefined;

  return (
    <div className="space-y-6" data-testid="calibration-page">
      <HeroStatusCard
        status={heroStatus}
        healthScore={heroHealthScore}
        confidenceFraction={heroConfidence}
        baselineDate={baselineDate}
        locale={i18n.language}
        actionSlot={heroValidateActionSlot}
        primaryCta={heroValidateActionSlot ? undefined : heroPrimary}
        secondaryCta={heroValidateActionSlot ? undefined : heroSecondary}
      />

      <PhaseTimeline current={journeyStep} />

      {shouldShowSoftRecalibration && softRecalibrationKind && (
        <div
          className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4"
          data-testid="recalibration-review-banner"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {softRecalibrationKind} recalibration applied
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Baselines were automatically updated. Review the changes to confirm they match your expectations.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                document
                  .querySelector('[data-testid="calibration-review-section"]')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="shrink-0"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Review changes
            </Button>
          </div>
        </div>
      )}

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
          {(phase === 'awaiting_nutrition_option' ||
            calibration?.status === 'validated' ||
            calibrationCompletedButPhaseStuck) &&
            parcelData?.ai_phase !== 'active' && (
            <>
              <TargetYieldStep
                parcelId={parcelId}
                calibrationId={reportData.calibration.id}
              />
              <NutritionOptionSelector
                parcelId={parcelId}
                calibrationId={reportData.calibration.id}
                disabled={calibrationActuallyRunning}
              />
            </>
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
            <Suspense fallback={<SectionLoader />}>
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
            </Suspense>
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
            <Suspense fallback={<SectionLoader />}>
              <CalibrationWizard
                parcelId={parcelId}
                parcelData={parcelData}
                onStarted={handleCalibrationLaunchStarted}
              />
            </Suspense>
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
        <Suspense fallback={<SectionLoader />}>
          <AnnualRecalibrationWizard
            parcelId={parcelId}
            estimatedCampaignCount={estimatedCampaignCount}
            onClose={() => setShowAnnualRecalibrationWizard(false)}
          />
        </Suspense>
      )}

      {missingPlantingYear && (
        <PlantingYearPrompt parcelId={parcelId} onSaved={() => refetchParcel()} />
      )}

      {isWizardPhase && !missingPlantingYear && !isFullWizardOpen && !isWaitingForCalibrationResult && (
        <Suspense fallback={<SectionLoader />}>
          <CalibrationWizard
            parcelId={parcelId}
            parcelData={parcelData}
            onStarted={handleCalibrationLaunchStarted}
          />
        </Suspense>
      )}

      {isCalibrating && (
        <CalibrationProgressStepper progress={calibrationProgress} />
      )}

      {/* Observation mode is surfaced in the hero status card above */}

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

      {!isCalibrating && !isFailed && !isWizardPhase && !hasV2Report &&
        (phase === 'unknown' || !phase) && !calibrationCompletedButPhaseStuck && (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <AlertCircle className="w-8 h-8 text-gray-400 mb-3" />
          <p className="text-muted-foreground text-sm">Unable to determine calibration state.</p>
          <Button
            variant="outline"
            type="button"
            onClick={() => { refetchCalibration(); refetchPhase(); refetchReport(); }}
            className="mt-4"
          >
            Refresh
          </Button>
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
