import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Leaf,
  Droplets,
  DollarSign,
  Lightbulb,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAIPlan,
  useAIPlanSummary,
  useEnsureAIPlan,
  useGenerateAIPlanReport,
  useValidateAIPlan,
} from '@/hooks/useAIPlan';
import {
  useAIRecommendations,
  useValidateAIRecommendation,
  useRejectAIRecommendation,
  useExecuteAIRecommendation,
} from '@/hooks/useAIRecommendations';
import { RecommendationCard } from '@/components/ai/RecommendationCard';
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

const AISaisonPage = () => {
  const { t } = useTranslation('ai');
  const { parcelId } = Route.useParams();

  const { data: plan, isLoading: planLoading, error: planError } = useAIPlan(parcelId, {
    // Poll while plan_data hasn't been populated yet — the backend
    // generates it asynchronously after nutrition-option confirmation,
    // so the page often arrives seconds before the data does.
    refetchIntervalMs: 10_000,
  });
  const planData = plan?.plan_data as AIPlanData | null | undefined;
  const planReady = !!planData && planData.source === 'ai';

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useAIPlanSummary(parcelId, true, {
    refetchIntervalMs: planReady ? false : 10_000,
  });

  const {
    data: recommendations,
    isLoading: recsLoading,
  } = useAIRecommendations(parcelId, {
    // Recommendations also run asynchronously post-activation.
    refetchIntervalMs: recommendationsShouldPoll(planReady) ? 15_000 : false,
  });

  const validatePlan = useValidateAIPlan(parcelId);
  const ensurePlan = useEnsureAIPlan(parcelId);
  const generateAIPlan = useGenerateAIPlanReport(parcelId);
  const { mutate: validateRecommendation, isPending: isValidating } = useValidateAIRecommendation();
  const { mutate: rejectRecommendation, isPending: isRejecting } = useRejectAIRecommendation();
  const { mutate: executeRecommendation, isPending: isExecuting } = useExecuteAIRecommendation();

  if (planLoading || summaryLoading) {
    return <SectionLoader />;
  }

  const effectiveStatus = plan?.status ?? summary?.status;
  const completionRate =
    summary && summary.total_interventions > 0
      ? Math.round((summary.executed / summary.total_interventions) * 100)
      : 0;
  const statusLabel = annualPlanStatusLabel(effectiveStatus);

  // Only block the whole page when we don't even have a plan record
  // or a summary yet. Once summary arrives, show the calendar even if
  // plan_data hasn't been enriched — AI details (doses / harvest /
  // costs) become a smaller inline banner with its own retry, so a
  // failed background job doesn't lock the user out of the calendar.
  const hasSummary = !!summary;
  const aiEnrichmentMissing = hasSummary && !planReady;

  if (!hasSummary) {
    const showEnsureFallback = summaryError || planError;
    return (
      <div className="space-y-6">
        <SaisonHeader />
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800/40 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-semibold text-blue-950 dark:text-blue-100">
                {t('saison.generating.title', 'Préparation de votre saison…')}
              </h3>
              <p className="text-sm text-blue-900/90 dark:text-blue-200/90">
                {t(
                  'saison.generating.body',
                  'Nous calculons votre calendrier, vos doses annuelles et vos premiers conseils à partir du calibrage. Patientez 1 à 2 minutes — la page se met à jour automatiquement.',
                )}
              </p>
              {showEnsureFallback && (
                <div className="pt-2">
                  <Button
                    variant="green"
                    type="button"
                    onClick={() => ensurePlan.mutate()}
                    disabled={ensurePlan.isPending}
                  >
                    {ensurePlan.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('plan.summary.preparing', 'Préparation…')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('saison.generating.retry', 'Relancer la préparation')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <SkeletonSections />
      </div>
    );
  }

  const doses = planData?.annualDoses;
  const harvest = planData?.harvestForecast;
  const economic = planData?.economicEstimate;
  const recsList = recommendations ?? [];

  return (
    <div className="space-y-6">
      <SaisonHeader />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('saison.calendar.title', 'Calendrier de saison')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('plan.summary.stateLabel', 'État')}: {statusLabel}
              </p>
            </div>
          </div>
          {effectiveStatus === 'draft' && (
            <Button
              variant="green"
              type="button"
              onClick={() => validatePlan.mutate()}
              disabled={validatePlan.isPending}
            >
              {validatePlan.isPending
                ? t('plan.summary.confirming', 'Confirmation…')
                : t('plan.summary.confirmCalendar', 'Confirmer le calendrier')}
            </Button>
          )}
        </div>

        {effectiveStatus === 'draft' && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{t('plan.summary.draftBanner')}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={t('plan.summary.statsTotal')} value={summary.total_interventions} />
          <StatTile
            label={t('plan.summary.statsDone')}
            value={summary.executed}
            tone="green"
          />
          <StatTile
            label={t('plan.summary.statsTodo')}
            value={summary.planned}
            tone="blue"
          />
          <StatTile
            label={t('plan.summary.statsProgress')}
            value={`${completionRate}%`}
            tone="purple"
          />
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('plan.summary.progressLabel')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{completionRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {aiEnrichmentMissing && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                  {t(
                    'saison.aiMissing.title',
                    'Détails IA non générés (doses, récolte, coûts)',
                  )}
                </p>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                  {generateAIPlan.progressStatus === 'idle'
                    ? t(
                        'saison.aiMissing.body',
                        "La génération n'a pas abouti la première fois. Relancez pour obtenir les doses annuelles, la fenêtre de récolte et l'estimation économique.",
                      )
                    : t('saison.aiMissing.inProgress', 'Génération en cours — {{percent}}%', {
                        percent: generateAIPlan.progress,
                      })}
                </p>
                <div>
                  <Button
                    variant="green"
                    type="button"
                    onClick={() => generateAIPlan.mutate()}
                    disabled={generateAIPlan.isPending}
                  >
                    {generateAIPlan.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('saison.aiMissing.generating', 'Génération…')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('saison.aiMissing.generate', 'Générer les détails IA')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {planData?.planSummary && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
            <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-200">
              {planData.planSummary}
            </p>
          </div>
        )}

        {doses && (doses.N_kg_ha || doses.P2O5_kg_ha || doses.K2O_kg_ha) && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center gap-2 text-green-700 dark:text-green-300">
              <Leaf className="h-4 w-4" aria-hidden />
              <h4 className="font-medium">{t('plan.summary.annualDosesTitle')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DoseTile label="N" value={doses.N_kg_ha} />
              <DoseTile label="P2O5" value={doses.P2O5_kg_ha} />
              <DoseTile label="K2O" value={doses.K2O_kg_ha} />
              <DoseTile label="MgO" value={doses.MgO_kg_ha} />
            </div>
          </div>
        )}

        {(harvest?.yieldForecast || economic?.totalInputCostDhHa != null) && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {harvest?.yieldForecast && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
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
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('plan.summary.harvestWindow', {
                      start: harvest.harvestWindow.start,
                      end: harvest.harvestWindow.end ?? '—',
                    })}
                  </p>
                )}
              </div>
            )}
            {economic?.totalInputCostDhHa != null && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <DollarSign className="h-4 w-4" aria-hidden />
                  <h4 className="font-medium">{t('plan.summary.economicTitle')}</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {economic.totalInputCostDhHa.toLocaleString()} DH/ha
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <h4 className="font-medium">{t('plan.summary.strengthsTitle')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {summary.executed > 0
                ? t('plan.summary.strengthsDone', { count: summary.executed })
                : t('plan.summary.strengthsNone')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
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

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <Lightbulb className="h-6 w-6 text-yellow-500" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('saison.recommendations.title', 'Conseils du moment')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(
                  'saison.recommendations.subtitle',
                  "Actions suggérées par l'IA à partir des données récentes.",
                )}
              </p>
            </div>
          </div>
          {recsList.length > 0 && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
              {recsList.length}
            </span>
          )}
        </div>

        {recsLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('saison.recommendations.loading', 'Chargement des conseils…')}
          </div>
        ) : recsList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'saison.recommendations.empty',
                "Pas de conseil pour l'instant. L'IA ajoutera des suggestions quand un écart ou une opportunité apparaît.",
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recsList.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onValidate={(id) => validateRecommendation(id)}
                onReject={(id) => rejectRecommendation(id)}
                onExecute={(id) => executeRecommendation({ id })}
                isValidating={isValidating}
                isRejecting={isRejecting}
                isExecuting={isExecuting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function SaisonHeader() {
  const { t } = useTranslation('ai');
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {t('saison.title', 'Saison')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t(
          'saison.subtitle',
          "Votre calendrier annuel, vos doses cibles, vos prévisions de récolte et les conseils du moment — tout en un.",
        )}
      </p>
    </div>
  );
}

function SkeletonSections() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: 'green' | 'blue' | 'purple';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'blue'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'purple'
          ? 'text-purple-600 dark:text-purple-400'
          : 'text-gray-900 dark:text-white';
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
      <h4 className="mb-2 font-medium text-gray-900 dark:text-white">{label}</h4>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function DoseTile({ label, value }: { label: string; value: number | undefined }) {
  if (value == null) return null;
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-900/50">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-gray-400">kg/ha</p>
    </div>
  );
}

// Keep polling recommendations until the plan is ready; after that they
// refresh via invalidation or manual triggers. Separate function so the
// policy is easy to tweak without digging into the component body.
function recommendationsShouldPoll(planReady: boolean): boolean {
  return !planReady;
}

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/plan/summary')({
  component: AISaisonPage,
});
