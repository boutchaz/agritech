import type { ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BrainCircuit,
  Calendar,
  ChevronRight,
  Cloud,
  Compass,
  Lightbulb,
  Settings,
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

type AIStatusBadgeStatus = ComponentProps<typeof AIStatusBadge>['status'];

type CompassPhaseKey = 'active' | 'awaiting_validation' | 'awaiting_nutrition_option' | 'in_progress' | 'paused' | 'default';

function compassPhaseKey(phase: string | null | undefined): CompassPhaseKey {
  switch (phase) {
    case 'active':
      return 'active';
    case 'awaiting_validation':
      return 'awaiting_validation';
    case 'awaiting_nutrition_option':
      return 'awaiting_nutrition_option';
    case 'calibrating':
    case 'downloading':
    case 'pret_calibrage':
      return 'in_progress';
    case 'paused':
      return 'paused';
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
    return 'disabled';
  })();

  const phaseKey = compassPhaseKey(aiPhase ?? undefined);
  const phaseText = t(`compass.phases.${phaseKey}`);

  if (loadingEssential) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('compass.loading')}</p>
        </div>
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
              {(parcel?.crop_type || parcel?.variety) && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {[parcel.crop_type, parcel.variety].filter(Boolean).join(' · ')}
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
                  {t('compass.refShort')} {diagnostics.indicators.baseline_ndvi.toFixed(3)} ·{' '}
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

      {/* KPI row */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.opsSummary')}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

      {/* Navigation cards */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('compass.goFurther')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/parcels/$parcelId/ai/calibration"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-emerald-500/50"
          >
            <Settings className="mb-3 h-8 w-8 text-slate-500 transition group-hover:text-emerald-600 dark:text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-white">{t('compass.calibrationCardTitle')}</span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.calibrationCardBody')}
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
            <span className="font-semibold text-slate-900 dark:text-white">{t('compass.alertsTitle')}</span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.alertsBody')}
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
            <span className="font-semibold text-slate-900 dark:text-white">{t('compass.tipsTitle')}</span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.tipsBody')}
            </span>
          </Link>
          <Link
            to="/parcels/$parcelId/ai/plan"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Calendar className="mb-3 h-8 w-8 text-blue-500" />
            <span className="font-semibold text-slate-900 dark:text-white">{t('compass.calendarCardTitle')}</span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.calendarCardBody')}
            </span>
          </Link>
          <Link
            to="/parcels/$parcelId/ai/weather"
            params={{ parcelId }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-500/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
          >
            <Cloud className="mb-3 h-8 w-8 text-sky-500" />
            <span className="font-semibold text-slate-900 dark:text-white">{t('compass.weatherCardTitle')}</span>
            <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('compass.weatherCardBody')}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
