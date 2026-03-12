import { createFileRoute } from '@tanstack/react-router'
import { useAIAlerts, useAcknowledgeAIAlert, useResolveAIAlert } from '@/hooks/useAIAlerts'
import { AlertCard } from '@/components/ai/AlertCard'
import { AlertTriangle } from 'lucide-react'

const AIAlertsPage = () => {
  const { parcelId } = Route.useParams();
  const { data: alerts, isLoading } = useAIAlerts(parcelId);
  const { mutate: acknowledgeAlert, isPending: isAcknowledging } = useAcknowledgeAIAlert();
  const { mutate: resolveAlert, isPending: isResolving } = useResolveAIAlert();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Alerts</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Review and manage risks detected by the AI model.</p>
      </div>

      {!alerts || alerts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Alerts</h3>
          <p className="text-gray-500 dark:text-gray-400">The AI model has not detected any significant risks for this parcel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={(id) => acknowledgeAlert(id)}
              onResolve={(id) => resolveAlert(id)}
              isAcknowledging={isAcknowledging}
              isResolving={isResolving}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/alerts')({
  component: AIAlertsPage,
});
