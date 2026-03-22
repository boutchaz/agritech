import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle2, Play } from 'lucide-react';
import type { AIPlanIntervention } from '@/lib/api/ai-plan';
import {
  planInterventionStatusLabel,
  planInterventionTitle,
  planMonthShort,
} from '@/lib/farmerFriendlyLabels';

interface PlanInterventionCardProps {
  intervention: AIPlanIntervention;
  onExecute?: (id: string) => void;
  isExecuting?: boolean;
}

export function PlanInterventionCard({
  intervention,
  onExecute,
  isExecuting,
}: PlanInterventionCardProps) {
  const { t } = useTranslation('ai');
  const monthShort = planMonthShort(intervention.month);
  const title = planInterventionTitle(intervention.intervention_type);
  const statusLabel = planInterventionStatusLabel(intervention.status);
  const canMarkDone =
    (intervention.status === 'planned' || intervention.status === 'pending') && onExecute;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
          <Calendar className="w-5 h-5 mb-0.5" aria-hidden />
          <span className="text-[10px] font-semibold leading-tight text-center px-0.5">{monthShort}</span>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                intervention.status === 'executed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : intervention.status === 'skipped'
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    : intervention.status === 'delayed'
                      ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/25 dark:text-orange-300'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/25 dark:text-amber-200'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{intervention.description}</p>
        </div>
      </div>

      {canMarkDone && (
        <button
          type="button"
          onClick={() => onExecute(intervention.id)}
          disabled={isExecuting}
          className="flex-shrink-0 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          <Play className="w-4 h-4 shrink-0" aria-hidden />
          <span>{t('planIntervention.markDone')}</span>
        </button>
      )}

      {intervention.status === 'executed' && (
        <div className="flex-shrink-0 flex items-center text-green-600 dark:text-green-400 px-4 py-2 text-sm">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" aria-hidden />
          <span className="font-medium">{t('planIntervention.doneLabel')}</span>
        </div>
      )}
    </div>
  );
}
