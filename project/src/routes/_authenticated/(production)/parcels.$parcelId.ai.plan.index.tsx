import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useAIPlan,
  useAIPlanInterventions,
  useExecuteAIPlanIntervention,
  useRegenerateAIPlan,
} from '@/hooks/useAIPlan';
import { PlanInterventionCard } from '@/components/ai/PlanInterventionCard';
import { annualPlanStatusLabel } from '@/lib/farmerFriendlyLabels';
import { Calendar, RefreshCw } from 'lucide-react';

const AIPlanCalendarPage = () => {
  const { t } = useTranslation('ai');
  const { parcelId } = Route.useParams();
  const { data: plan, isLoading: isPlanLoading } = useAIPlan(parcelId);
  const { data: interventions, isLoading: isInterventionsLoading } = useAIPlanInterventions(parcelId);
  const { mutate: executeIntervention, isPending: isExecuting } = useExecuteAIPlanIntervention();
  const { mutate: regeneratePlan, isPending: isRegenerating } = useRegenerateAIPlan();

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
        <button
          type="button"
          onClick={() => regeneratePlan(parcelId)}
          disabled={isRegenerating}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 text-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} aria-hidden />
          <span>{t('plan.calendar.recalculate')}</span>
        </button>
      </div>

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
