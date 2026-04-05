import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle2, Clock3, AlertTriangle, Leaf, Droplets, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIPlan, useAIPlanSummary, useEnsureAIPlan, useValidateAIPlan } from '@/hooks/useAIPlan';
import { annualPlanStatusLabel } from '@/lib/farmerFriendlyLabels';
import { SectionLoader } from '@/components/ui/loader';


interface AnnualDoses {
  N_kg_ha?: number;
  P2O5_kg_ha?: number;
  K2O_kg_ha?: number;
  MgO_kg_ha?: number;
  calculationDetails?: Record<string, unknown>;
}

interface HarvestForecast {
  harvestWindow?: { start?: string; end?: string };
  yieldForecast?: { low?: number; central?: number; high?: number };
  productionTarget?: string;
}

interface EconomicEstimate {
  totalInputCostDhHa?: number;
  breakdown?: Record<string, number>;
}

interface AIPlanData {
  source?: string;
  planSummary?: string;
  annualDoses?: AnnualDoses;
  harvestForecast?: HarvestForecast;
  economicEstimate?: EconomicEstimate;
  irrigation?: Record<string, unknown>;
}

const AIPlanSummaryPage = () => {
  const { t } = useTranslation('ai');
  const { parcelId } = Route.useParams();
  const { data: plan, isLoading, error: planError } = useAIPlan(parcelId);
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useAIPlanSummary(parcelId, true);
  const validatePlan = useValidateAIPlan(parcelId);
  const ensurePlan = useEnsureAIPlan(parcelId);

  if (isLoading || isSummaryLoading) {
    return (
      <SectionLoader />
    );
  }

  const effectiveStatus = plan?.status ?? summary?.status;
  const completionRate = summary && summary.total_interventions > 0
    ? Math.round((summary.executed / summary.total_interventions) * 100)
    : 0;

  const statusLabel = annualPlanStatusLabel(effectiveStatus);

  if (!summary) {
    const message =
      summaryError instanceof Error
        ? summaryError.message
        : planError instanceof Error
          ? planError.message
          : t('plan.summary.emptyTitle');

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="font-medium text-amber-950 dark:text-amber-100">{message}</p>
              <p>{t('plan.summary.emptyLead')}</p>
              <details className="rounded-md border border-amber-200/80 bg-white/60 dark:border-amber-800/40 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900/90 dark:text-amber-200/90">
                <summary className="cursor-pointer font-medium">{t('plan.summary.technicalDetailsSummary')}</summary>
                <p className="mt-2">{t('plan.summary.technicalDetailsBody')}</p>
              </details>
              <div className="flex flex-wrap gap-2">
                <Button variant="green"
                  type="button"
                  onClick={() => ensurePlan.mutate()}
                  disabled={ensurePlan.isPending}
                >
                  {ensurePlan.isPending ? t('plan.summary.preparing') : t('plan.summary.prepareCalendar')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('plan.summary.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('plan.summary.stateLabel')}: {statusLabel}
              </p>
            </div>
          </div>

          {effectiveStatus === 'draft' && (
            <Button variant="green"
              type="button"
              onClick={() => validatePlan.mutate()}
              disabled={validatePlan.isPending}
            >
              {validatePlan.isPending ? t('plan.summary.confirming') : t('plan.summary.confirmCalendar')}
            </Button>
          )}
        </div>

        {effectiveStatus === 'draft' && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{t('plan.summary.draftBanner')}</span>
          </div>
        )}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('plan.summary.statsTotal')}</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_interventions}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('plan.summary.statsDone')}</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.executed}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('plan.summary.statsTodo')}</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.planned}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('plan.summary.statsProgress')}</h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{completionRate}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('plan.summary.progressLabel')}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{completionRate}%</span>
            </div>
            <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* AI Aggregate Data (when plan is AI-enriched) */}
          {(() => {
            const planData = plan?.plan_data as AIPlanData | null | undefined;
            if (!planData || planData.source !== 'ai') return null;

            const doses = planData.annualDoses;
            const harvest = planData.harvestForecast;
            const economic = planData.economicEstimate;

            return (
              <>
                {/* AI Plan Summary */}
                {planData.planSummary && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                      {planData.planSummary}
                    </p>
                  </div>
                )}

                {/* Annual Doses */}
                {doses && (doses.N_kg_ha || doses.P2O5_kg_ha || doses.K2O_kg_ha) && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-3 text-green-700 dark:text-green-300">
                      <Leaf className="h-4 w-4" aria-hidden />
                      <h4 className="font-medium">{t('plan.summary.annualDosesTitle')}</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {doses.N_kg_ha != null && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">N</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{doses.N_kg_ha}</p>
                          <p className="text-[10px] text-gray-400">kg/ha</p>
                        </div>
                      )}
                      {doses.P2O5_kg_ha != null && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">P2O5</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{doses.P2O5_kg_ha}</p>
                          <p className="text-[10px] text-gray-400">kg/ha</p>
                        </div>
                      )}
                      {doses.K2O_kg_ha != null && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">K2O</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{doses.K2O_kg_ha}</p>
                          <p className="text-[10px] text-gray-400">kg/ha</p>
                        </div>
                      )}
                      {doses.MgO_kg_ha != null && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">MgO</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{doses.MgO_kg_ha}</p>
                          <p className="text-[10px] text-gray-400">kg/ha</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Harvest & Economic row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {harvest?.yieldForecast && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300">
                        <Droplets className="h-4 w-4" aria-hidden />
                        <h4 className="font-medium">{t('plan.summary.harvestTitle')}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('plan.summary.yieldRange', {
                          low: harvest.yieldForecast.low ?? '—',
                          high: harvest.yieldForecast.high ?? '—',
                        })}
                      </p>
                      {harvest.harvestWindow?.start && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('plan.summary.harvestWindow', {
                            start: harvest.harvestWindow.start,
                            end: harvest.harvestWindow.end ?? '—',
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {economic?.totalInputCostDhHa != null && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300">
                        <DollarSign className="h-4 w-4" aria-hidden />
                        <h4 className="font-medium">{t('plan.summary.economicTitle')}</h4>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {economic.totalInputCostDhHa.toLocaleString()} DH/ha
                      </p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <h4 className="font-medium">{t('plan.summary.strengthsTitle')}</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {summary.executed > 0
                  ? t('plan.summary.strengthsDone', { count: summary.executed })
                  : t('plan.summary.strengthsNone')}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                <h4 className="font-medium">{t('plan.summary.attentionTitle')}</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {summary.planned > 0
                  ? t('plan.summary.attentionPlanned', { count: summary.planned })
                  : t('plan.summary.attentionNone')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/plan/summary')({
  component: AIPlanSummaryPage,
});
