import React from 'react';
import { Calendar, CheckCircle2, Play } from 'lucide-react';
import type { AIPlanIntervention } from '@/lib/api/ai-plan';

interface PlanInterventionCardProps {
  intervention: AIPlanIntervention;
  onExecute?: (id: string) => void;
  isExecuting?: boolean;
}

export const PlanInterventionCard: React.FC<PlanInterventionCardProps> = ({
  intervention,
  onExecute,
  isExecuting,
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-bold">{monthNames[intervention.month - 1].substring(0, 3)}</span>
        </div>
        
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
              {intervention.intervention_type.replace(/_/g, ' ')}
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
              intervention.status === 'executed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : intervention.status === 'skipped'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {intervention.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{intervention.description}</p>
        </div>
      </div>

      {intervention.status === 'pending' && onExecute && (
        <button
          type="button"
          onClick={() => onExecute(intervention.id)}
          disabled={isExecuting}
          className="flex-shrink-0 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          <span>Execute</span>
        </button>
      )}

      {intervention.status === 'executed' && (
        <div className="flex-shrink-0 flex items-center text-green-600 dark:text-green-400 px-4 py-2">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          <span className="font-medium">Done</span>
        </div>
      )}
    </div>
  );
};
