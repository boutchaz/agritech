import { createFileRoute } from '@tanstack/react-router';
import { FileText, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIPlan, useAIPlanSummary, useValidateAIPlan } from '@/hooks/useAIPlan';

const AIPlanSummaryPage = () => {
  const { parcelId } = Route.useParams();
  const { data: plan, isLoading, error: planError } = useAIPlan(parcelId);
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useAIPlanSummary(parcelId, true);
  const validatePlan = useValidateAIPlan(parcelId);

  if (isLoading || isSummaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const effectiveStatus = plan?.status ?? summary?.status;
  const completionRate = summary && summary.total_interventions > 0
    ? Math.round((summary.executed / summary.total_interventions) * 100)
    : 0;

  const statusLabel =
    effectiveStatus === 'draft'
      ? 'Brouillon'
      : effectiveStatus === 'validated'
        ? 'Valide'
        : effectiveStatus === 'active'
          ? 'Actif'
          : effectiveStatus === 'archived'
            ? 'Archive'
            : 'Inconnu';

  if (!summary) {
    const message =
      summaryError instanceof Error
        ? summaryError.message
        : planError instanceof Error
          ? planError.message
          : 'Le plan annuel n’a pas encore ete genere pour cette parcelle.';

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{message}</p>
              <p className="mt-2">
                Le plan annuel est genere apres l’activation IA. Rechargez cette page dans quelques secondes si vous venez
                juste de confirmer l’option nutritionnelle.
              </p>
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
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Synthese du plan annuel</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Statut: {statusLabel}</p>
            </div>
          </div>

          {effectiveStatus === 'draft' && (
            <Button
              type="button"
              onClick={() => validatePlan.mutate()}
              disabled={validatePlan.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {validatePlan.isPending ? 'Validation...' : 'Valider le plan'}
            </Button>
          )}
        </div>

        {effectiveStatus === 'draft' && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
            <Clock3 className="mt-0.5 h-4 w-4" />
            <span>
              Ce plan est en brouillon. Validez-le pour le passer en mode operationnel et declencher les notifications.
            </span>
          </div>
        )}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Interventions totales</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_interventions}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Executees</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.executed}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Planifiees</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.planned}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Taux d'execution</h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{completionRate}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progression annuelle</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{completionRate}%</span>
            </div>
            <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                <h4 className="font-medium">Points forts</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {summary.executed > 0
                  ? `${summary.executed} interventions executees cette campagne.`
                  : 'Aucune intervention executee pour le moment.'}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="font-medium">Points d'attention</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {summary.planned > 0
                  ? `${summary.planned} interventions restent planifiees.`
                  : 'Aucune intervention restante planifiee.'}
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
