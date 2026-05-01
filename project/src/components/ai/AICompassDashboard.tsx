import { Fragment, type ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BrainCircuit,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Cloud,
  Compass,
  FlaskConical,
  Flower,
  Leaf,
  Lightbulb,
  MapPin,
  Satellite,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { AIStatusBadge } from '@/components/ai/AIStatusBadge';
import { useAICalibration } from '@/hooks/useAICalibration';
import { useAIDiagnostics } from '@/hooks/useAIDiagnostics';
import { useActiveAIAlerts } from '@/hooks/useAIAlerts';
import { useAIPlanSummary } from '@/hooks/useAIPlan';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { useParcelById } from '@/hooks/useParcelsQuery';
import type { AiScenarioCode } from '@/lib/api/ai-calibration';
import { SectionLoader } from '@/components/ui/loader';

type AIStatusBadgeStatus = ComponentProps<typeof AIStatusBadge>['status'];

type CompassPhaseKey = 'active' | 'calibrated' | 'awaiting_nutrition_option' | 'calibrating' | 'ready_calibration' | 'awaiting_data' | 'archived' | 'default';

type WorkflowStep = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  current: boolean;
  icon: typeof Settings;
  href?: '/parcels/$parcelId/ai/calibration';
};

function compassPhaseKey(phase: string | null | undefined): CompassPhaseKey {
  switch (phase) {
    case 'active':
      return 'active';
    case 'calibrated':
      return 'calibrated';
    case 'awaiting_nutrition_option':
      return 'awaiting_nutrition_option';
    case 'calibrating':
      return 'calibrating';
    case 'ready_calibration':
      return 'ready_calibration';
    case 'archived':
      return 'archived';
    case 'awaiting_data':
      return 'awaiting_data';
    default:
      return 'default';
  }
}

function scenarioCompassClass(code: AiScenarioCode): string {
  if (code === 'H') {
    return 'border-emerald-400/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
  }
  if (code === 'A' || code === 'B') {
    return 'border-red-400/60 bg-red-500/10 text-red-900 dark:text-red-200';
  }
  if (code === 'C' || code === 'D' || code === 'E') {
    return 'border-amber-400/60 bg-amber-500/10 text-amber-950 dark:text-amber-100';
  }
  return 'border-yellow-400/50 bg-yellow-500/10 text-yellow-950 dark:text-yellow-100';
}

function trendIcon(trend: string) {
  if (trend === 'improving') {
    return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden />;
  }
  if (trend === 'declining') {
    return <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden />;
  }
  return <Minus className="w-4 h-4 text-slate-500" aria-hidden />;
}

function normalizeScore(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  return Math.round(raw <= 1 ? raw * 100 : raw);
}

// Derive a 0–100 "parcel health" score from the AI scenario code so a
// farmer sees one number instead of a letter. Falls back to confidence
// when no scenario is available (pre-activation).
function scenarioToStateScore(code: string | null | undefined): number | null {
  if (!code) return null;
  switch (code.toUpperCase()) {
    case 'H': return 85;
    case 'G': return 72;
    case 'F': return 64;
    case 'E': return 55;
    case 'D': return 45;
    case 'C': return 40;
    case 'B': return 28;
    case 'A': return 18;
    default: return null;
  }
}

function stateScoreLabel(score: number | null, t: (k: string, d?: string) => string): string {
  if (score == null) return t('compass.scores.stateUnknown', '—');
  if (score >= 75) return t('compass.scores.stateGood', 'Bon');
  if (score >= 55) return t('compass.scores.stateVigilance', 'Vigilance');
  return t('compass.scores.stateAlert', 'Alerte');
}

function ScoreTile({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: 'good' | 'warn' | 'bad' | 'info' | 'neutral';
}) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'bad'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'info'
      ? 'text-sky-600 dark:text-sky-400'
      : 'text-slate-900 dark:text-white';
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function WorkflowStepper({ parcelId, aiPhase, hasCalibrationData }: { parcelId: string; aiPhase: string | null; hasCalibrationData: boolean }) {
  const { t } = useTranslation('ai');

  const calibrationDone = aiPhase === 'calibrated' || aiPhase === 'awaiting_nutrition_option' || aiPhase === 'active' || aiPhase === 'archived' || hasCalibrationData;
  const nutritionDone = aiPhase === 'active' || aiPhase === 'archived';
  const isActive = aiPhase === 'active';

  const calibrationCurrent = !calibrationDone && aiPhase !== null && aiPhase !== 'archived';
  const nutritionCurrent = calibrationDone && !nutritionDone;

  const steps: WorkflowStep[] = [
    {
      key: 'calibration',
      label: t('compass.stepper.calibration'),
      description: t('compass.stepper.calibrationDesc'),
      done: calibrationDone,
      current: calibrationCurrent,
      icon: Settings,
      href: '/parcels/$parcelId/ai/calibration',
    },
    {
      key: 'nutrition',
      label: t('compass.stepper.nutrition'),
      description: t('compass.stepper.nutritionDesc'),
      done: nutritionDone,
      current: nutritionCurrent,
      icon: Leaf,
      href: '/parcels/$parcelId/ai/calibration',
    },
    {
      key: 'active',
      label: t('compass.stepper.active'),
      description: t('compass.stepper.activeDesc'),
      done: isActive,
      current: false,
      icon: Sparkles,
    },
  ];

  const circleClass = (step: WorkflowStep) =>
    `flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
      step.done
        ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-600'
        : step.current
          ? 'border-emerald-500 bg-white text-emerald-600 dark:border-emerald-400 dark:bg-slate-800 dark:text-emerald-400 ring-4 ring-emerald-500/20'
          : 'border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
    }`;

  const segmentClass = (completed: boolean) =>
    completed ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700';

  const stepTitleClass = (step: WorkflowStep) =>
    step.done
      ? 'text-emerald-700 dark:text-emerald-300'
      : step.current
        ? 'text-slate-900 dark:text-white'
        : 'text-slate-500 dark:text-slate-400';

  const renderStepTitle = (step: WorkflowStep) =>
    step.current && step.href ? (
      <Link
        to="/parcels/$parcelId/ai/calibration"
        params={{ parcelId }}
        className="hover:underline underline-offset-2"
      >
        {step.label}
      </Link>
    ) : (
      step.label
    );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-5 flex items-center gap-2">
        <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.stepper.title')}
        </h3>
      </div>

      {/* sm+: connectors between icons (avoids full-width bars stacked under each circle) */}
      <div className="hidden sm:block">
        <div className="flex items-center">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Fragment key={step.key}>
                {i > 0 && (
                  <div
                    className={`h-0.5 min-w-[1rem] flex-1 rounded-full ${segmentClass(steps[i - 1].done)}`}
                    aria-hidden
                  />
                )}
                <div className={circleClass(step)}>
                  {step.done ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                </div>
              </Fragment>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {steps.map((step) => (
            <div key={`${step.key}-copy`} className="min-w-0 text-center">
              <p className={`text-sm font-semibold ${stepTitleClass(step)}`}>{renderStepTitle(step)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical rail; line sits between steps only */}
      <div className="flex flex-col sm:hidden">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex w-10 shrink-0 flex-col items-center">
                <div className={circleClass(step)}>
                  {step.done ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                </div>
                {!isLast && (
                  <div
                    className={`mt-1 min-h-[1.75rem] w-0.5 flex-1 rounded-full ${segmentClass(step.done)}`}
                    aria-hidden
                  />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-4'}`}>
                <p className={`text-sm font-semibold ${stepTitleClass(step)}`}>{renderStepTitle(step)}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export interface AICompassDashboardProps {
  parcelId: string;
}

export function AICompassDashboard({ parcelId }: AICompassDashboardProps) {
  const { t } = useTranslation('ai');
  const { data: parcel, isLoading: parcelLoading } = useParcelById(parcelId);
  const { data: calibration, isLoading: calLoading } = useAICalibration(parcelId);

  const aiPhase = parcel?.ai_phase ?? null;
  const diagnosticsEnabled = aiPhase === 'active';
  const { data: diagnostics, isLoading: diagLoading } = useAIDiagnostics(
    parcelId,
    diagnosticsEnabled,
  );
  const { data: activeAlerts, isLoading: alertsLoading } = useActiveAIAlerts(parcelId);
  const { data: recommendations, isLoading: recLoading } = useAIRecommendations(parcelId);
  const { data: planSummary, isLoading: planLoading } = useAIPlanSummary(
    parcelId,
    diagnosticsEnabled,
  );

  const loadingEssential = parcelLoading || calLoading;
  const pendingRecs =
    recommendations?.filter((r) => r.status === 'pending').length ?? 0;
  const alertCount = activeAlerts?.length ?? 0;

  const calibrationIncomplete =
    !calibration ||
    calibration.status === 'pending' ||
    calibration.status === 'failed' ||
    calibration.status === 'in_progress';

  const phaseForBadge = ((): AIStatusBadgeStatus => {
    if (aiPhase && aiPhase !== 'unknown') {
      return aiPhase as AIStatusBadgeStatus;
    }
    if (calibration?.status === 'completed') {
      return 'completed';
    }
    if (calibration?.status === 'in_progress') {
      return 'in_progress';
    }
    if (calibration?.status === 'failed') {
      return 'failed';
    }
    return 'awaiting_data';
  })();

  const phaseKey = compassPhaseKey(aiPhase ?? undefined);
  const phaseText = t(`compass.phases.${phaseKey}`);

  // Hub cockpit scores — one farmer-facing number per dimension.
  // État (state): derived from scenario code when active; else falls back to confidence.
  // Confiance: calibration.confidence_score, 0–100.
  // Rendement cible: parcel.ai_production_target if set, else "—" w/ hint.
  // Stade: parcel.current_bbch humanized.
  const confidenceScore = normalizeScore(calibration?.confidence_score ?? null);
  const stateScore = diagnostics
    ? scenarioToStateScore(diagnostics.scenario_code) ?? confidenceScore
    : confidenceScore;
  const yieldTarget = parcel?.ai_production_target?.trim() || null;
  const bbch = parcel?.current_bbch?.trim() || null;
  const identity = {
    variety: parcel?.variety?.trim() || null,
    area: parcel?.area != null ? `${Number(parcel.area).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${parcel.area_unit || 'ha'}` : null,
    system: parcel?.planting_system?.trim() || parcel?.irrigation_type?.trim() || null,
    density: parcel?.density_per_hectare ? `${parcel.density_per_hectare} ${t('compass.identity.treesPerHa', 'trees/ha')}` : null,
    age: parcel?.planting_year ? `${new Date().getFullYear() - Number(parcel.planting_year)} ${t('compass.identity.years', 'years')}` : null,
  };
  const identitySummary = [identity.variety, identity.area, identity.system].filter(Boolean).join(' · ');

  if (loadingEssential) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30">
        <SectionLoader />
      </div>
    );
  }

  const planPct =
    planSummary && planSummary.total_interventions > 0
      ? Math.round((planSummary.executed / planSummary.total_interventions) * 100)
      : null;

  return (
    <div className="space-y-8">
      {/* Hero compass */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-2xl flex-1 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
              <Compass className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t('compass.heroLabel')}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {parcel?.name ?? t('compass.parcelFallback')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {phaseText}
              </p>
              {identitySummary && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {identitySummary}
                  {identity.density || identity.age ? (
                    <span className="ml-1 opacity-75">
                      · {[identity.density, identity.age].filter(Boolean).join(' · ')}
                    </span>
                  ) : null}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <AIStatusBadge status={phaseForBadge} className="text-sm px-3 py-1.5" />
            {parcel?.ai_observation_only && aiPhase === 'active' && (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {t('compass.observationLimited')}
              </span>
            )}
            {calibrationIncomplete && (
              <Link
                to="/parcels/$parcelId/ai/calibration"
                params={{ parcelId }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Settings className="h-4 w-4" aria-hidden />
                {t('compass.calibrateActivate')}
                <ChevronRight className="h-4 w-4 opacity-80" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* Scenario card — farmer-facing */}
        {diagnosticsEnabled && (
          <div className="relative mt-8">
            {diagLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-700/50" />
            ) : diagnostics ? (
              <div
                className={`rounded-xl border-2 p-5 md:p-6 ${scenarioCompassClass(diagnostics.scenario_code)}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-90">
                  <span>{t('compass.scenarioCode', { code: diagnostics.scenario_code })}</span>
                  <span className="opacity-60">·</span>
                  <span>
                    {t('compass.confidencePct', {
                      pct: Math.round(
                        diagnostics.confidence <= 1
                          ? diagnostics.confidence * 100
                          : diagnostics.confidence,
                      ),
                    })}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold">{diagnostics.scenario}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-95">
                  {diagnostics.description}
                </p>
                {diagnostics.observation_only && (
                  <p className="mt-3 text-xs font-medium opacity-90">
                    {t('compass.observationScenarioNote')}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                {t('compass.scenarioUnavailable')}
              </div>
            )}
          </div>
        )}

        {/* Technical strip — optional detail */}
        {diagnosticsEnabled && diagnostics && (
          <details className="group mt-6 rounded-xl border border-slate-200 bg-white/80 open:shadow-sm dark:border-slate-600 dark:bg-slate-800/50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-slate-500" aria-hidden />
                  {t('compass.technicalDetail')}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" />
              </span>
            </summary>
            <div className="grid gap-4 border-t border-slate-100 px-4 py-4 text-sm dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-medium uppercase text-slate-500">{t('compass.ndviCurrent')}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {diagnostics.indicators.current_ndvi.toFixed(3)}
                </p>
                <p className="text-xs text-slate-500">
                  {t('compass.refShort')} {diagnostics.indicators.p50_ndvi.toFixed(3)} ·{' '}
                  {t(`compass.bands.${diagnostics.indicators.ndvi_band}`, {
                    defaultValue: diagnostics.indicators.ndvi_band,
                  })}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  {trendIcon(diagnostics.indicators.ndvi_trend)}
                  <span>{t('compass.ndviTrend', { trend: diagnostics.indicators.ndvi_trend })}</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-medium uppercase text-slate-500">{t('compass.ndre')}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {diagnostics.indicators.current_ndre != null
                    ? diagnostics.indicators.current_ndre.toFixed(3)
                    : '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {t('compass.statusLabel')} {diagnostics.indicators.ndre_status}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-medium uppercase text-slate-500">{t('compass.weather')}</p>
                <p className="mt-1 text-sm font-medium">
                  {diagnostics.indicators.weather_anomaly
                    ? t('compass.weatherAnomalyYes')
                    : t('compass.weatherAnomalyNo')}
                </p>
                {diagnostics.indicators.water_balance != null && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t('compass.waterBalanceApprox', {
                      value: diagnostics.indicators.water_balance.toFixed(2),
                    })}
                  </p>
                )}
              </div>
            </div>
          </details>
        )}
      </section>

      {/* Hub scores — État, Confiance, Rendement cible, Stade.
          One farmer-facing number per dimension, farmer-first hierarchy. */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.scores.sectionTitle', 'Vue d\'ensemble')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ScoreTile
            label={t('compass.scores.state', 'État parcelle')}
            value={stateScore != null ? String(stateScore) : '—'}
            unit={stateScore != null ? '/100' : undefined}
            hint={stateScoreLabel(stateScore, t)}
            tone={stateScore == null ? 'neutral' : stateScore >= 75 ? 'good' : stateScore >= 55 ? 'warn' : 'bad'}
          />
          <ScoreTile
            label={t('compass.scores.confidence', 'Confiance')}
            value={confidenceScore != null ? String(confidenceScore) : '—'}
            unit={confidenceScore != null ? '/100' : undefined}
            hint={
              confidenceScore == null
                ? t('compass.scores.confidenceNone', 'Calibration à venir')
                : confidenceScore >= 70
                ? t('compass.scores.confidenceHigh', '⭐⭐⭐ élevée')
                : confidenceScore >= 40
                ? t('compass.scores.confidenceMed', '⭐⭐ moyenne')
                : t('compass.scores.confidenceLow', '⭐ faible')
            }
            tone={confidenceScore == null ? 'neutral' : confidenceScore >= 70 ? 'info' : confidenceScore >= 40 ? 'warn' : 'bad'}
          />
          <ScoreTile
            label={t('compass.scores.yieldTarget', 'Rendement cible')}
            value={yieldTarget ?? '—'}
            hint={
              yieldTarget
                ? t('compass.scores.yieldHint', 'Objectif campagne')
                : t('compass.scores.yieldNone', 'Défini post calibration')
            }
            tone={yieldTarget ? 'warn' : 'neutral'}
          />
          <ScoreTile
            label={t('compass.scores.stage', 'Stade')}
            value={bbch ? `BBCH ${bbch}` : '—'}
            hint={
              bbch
                ? parcel?.current_gdd_cumulative
                  ? t('compass.scores.stageGdd', '{{gdd}} °C·j', { gdd: Math.round(Number(parcel.current_gdd_cumulative)) })
                  : t('compass.scores.stageInProgress', 'En cours')
                : t('compass.scores.stageNone', 'Phénologie non disponible')
            }
            tone={bbch ? 'info' : 'neutral'}
          />
        </div>
      </section>

      {/* Workflow stepper */}
      <WorkflowStepper parcelId={parcelId} aiPhase={aiPhase} hasCalibrationData={!calibrationIncomplete && !!calibration} />

      {/* KPI row */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.opsSummary')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('compass.activeAlerts')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {alertsLoading ? '…' : alertCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('compass.recPending')}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {recLoading ? '…' : pendingRecs}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('compass.seasonCalendar')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {!diagnosticsEnabled
                ? '—'
                : planLoading
                  ? '…'
                  : planPct != null
                    ? `${planPct}%`
                    : '—'}
            </p>
            {planSummary && planSummary.total_interventions > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {t('compass.tasksDone', {
                  done: planSummary.executed,
                  total: planSummary.total_interventions,
                })}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('compass.reliability')}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {calibration && typeof calibration.confidence_score === 'number'
                ? `${Math.round(
                    calibration.confidence_score <= 1
                      ? calibration.confidence_score * 100
                      : calibration.confidence_score,
                  )}%`
                : '—'}
            </p>
            {calibration?.zone_classification && (
              <p className="mt-1 text-xs capitalize text-slate-500">
                {t('compass.zonesLabel')} {calibration.zone_classification}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Navigation cards — 5-card hub: Identification → Phénologie → Heatmap → Recommandations → Alertes.
          Also keeps Plan + Weather + Calibration retouch as a secondary row. */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.goFurther', 'Explorer la parcelle')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/parcels/$parcelId"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <ClipboardList className="mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.identificationTitle', 'Identification')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.identificationBody', "Carte d'identité agronomique : variété, surface, système, densité, historique.")}
            </span>
            {identity.variety && (
              <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <MapPin className="h-3 w-3" aria-hidden />
                {identity.variety}
              </span>
            )}
          </Link>

          <Link
            to="/parcels/$parcelId/ai/calibration"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-pink-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Flower className="mb-3 h-8 w-8 text-pink-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.phenologyTitle', 'Stade phénologique')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.phenologyBody', 'Phase en cours, prévision, consignes IA et produits star de la saison.')}
            </span>
            {bbch && (
              <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">
                BBCH {bbch}
              </span>
            )}
          </Link>

          <Link
            to="/parcels/$parcelId/satellite/heatmap"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Satellite className="mb-3 h-8 w-8 text-blue-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.heatmapTitle', 'Heatmap 4 indices')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.heatmapBody', 'Carte parcellaire EVI, GCI, NDMI, NIRv avec synthèse IA contextuelle.')}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <FlaskConical className="h-3 w-3" aria-hidden />
              {t('compass.heatmapTag', 'EVI · GCI · NDMI · NIRv')}
            </span>
          </Link>

          <Link
            to="/parcels/$parcelId/ai/recommendations"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-amber-500" />
              {pendingRecs > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {pendingRecs}
                </span>
              )}
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.tipsTitle', 'Recommandations')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.tipsBody', 'Actions proposées, cycle de vie 8 états, fiches 6 blocs détaillées.')}
            </span>
          </Link>

          <Link
            to="/parcels/$parcelId/ai/alerts"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-orange-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              {alertCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                  {alertCount}
                </span>
              )}
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.alertsTitle', 'Alertes OLI-XX')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.alertsBody', "Radar des codes d'alerte, classés par famille et priorité.")}
            </span>
          </Link>

          <Link
            to="/parcels/$parcelId/ai/plan"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Calendar className="mb-3 h-8 w-8 text-blue-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.calendarCardTitle', 'Plan cultural')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.calendarCardBody', 'Planification des interventions + suivi exécution.')}
            </span>
          </Link>

          <Link
            to="/parcels/$parcelId/ai/weather"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Cloud className="mb-3 h-8 w-8 text-sky-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {t('compass.weatherCardTitle', 'Météo agricole')}
            </span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.weatherCardBody', 'Prévisions 7 jours, GDD, risques climatiques.')}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
