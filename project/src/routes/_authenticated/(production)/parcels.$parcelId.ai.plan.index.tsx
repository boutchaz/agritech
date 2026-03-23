import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useAIPlan,
  useAIPlanInterventions,
  useExecuteAIPlanIntervention,
  useRegenerateAIPlan,
  useGenerateAIPlanReport,
} from '@/hooks/useAIPlan';
import { PlanInterventionCard } from '@/components/ai/PlanInterventionCard';
import { annualPlanStatusLabel } from '@/lib/farmerFriendlyLabels';
import { Calendar, RefreshCw, Sparkles } from 'lucide-react';

const AIPlanCalendarPage = () => {
  const { t } = useTranslation('ai');
  const { parcelId } = Route.useParams();
  const { data: plan, isLoading: isPlanLoading } = useAIPlan(parcelId);
  const { data: interventions, isLoading: isInterventionsLoading } = useAIPlanInterventions(parcelId);
  const { mutate: executeIntervention, isPending: isExecuting } = useExecuteAIPlanIntervention();
  const { mutate: regeneratePlan, isPending: isRegenerating } = useRegenerateAIPlan();
  const { mutate: generateAIPlan, isPending: isGenerating, progress, progressStatus } = useGenerateAIPlanReport(parcelId);

  if (isPlanLoading || isInterventionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const statusLabel = plan?.status ? annualPlanStatusLabel(plan.status) : t('plan.calendar.statusNone');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('plan.calendar.statusHeading')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{statusLabel}</p>
            {plan?.status === 'draft' && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('plan.calendar.draftHint')}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => generateAIPlan()}
            disabled={isGenerating || isRegenerating}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} aria-hidden />
            <span>{isGenerating ? t('plan.calendar.aiGenerating') : t('plan.calendar.aiGenerate')}</span>
          </button>
          <button
            type="button"
            onClick={() => regeneratePlan(parcelId)}
            disabled={isRegenerating || isGenerating}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} aria-hidden />
            <span>{t('plan.calendar.recalculate')}</span>
          </button>
        </div>
      </div>

      {(isGenerating || (progressStatus !== 'idle' && progress > 0)) && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {progressStatus === 'pending' && t('plan.calendar.progress.pending')}
              {progressStatus === 'processing' && progress < 50 && t('plan.calendar.progress.collecting')}
              {progressStatus === 'processing' && progress >= 50 && progress < 70 && t('plan.calendar.progress.analyzing')}
              {progressStatus === 'processing' && progress >= 70 && progress < 90 && t('plan.calendar.progress.generating')}
              {progressStatus === 'processing' && progress >= 90 && t('plan.calendar.progress.saving')}
              {progressStatus === 'enriching' && t('plan.calendar.progress.enriching')}
              {progressStatus === 'completed' && t('plan.calendar.progress.done')}
              {progressStatus === 'failed' && t('plan.calendar.progress.failed')}
            </span>
            <span className="text-gray-500 dark:text-gray-400 tabular-nums">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${progressStatus === 'failed' ? 'bg-red-500' : 'bg-green-600'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!interventions || interventions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('plan.calendar.emptyTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">{t('plan.calendar.emptyBody')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((intervention) => (
            <PlanInterventionCard
              key={intervention.id}
              intervention={intervention}
              onExecute={(id) => executeIntervention(id)}
              isExecuting={isExecuting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/plan/')({
  component: AIPlanCalendarPage,
});
