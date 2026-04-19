import { createFileRoute } from '@tanstack/react-router'
import { useAIAlerts, useAcknowledgeAIAlert, useResolveAIAlert } from '@/hooks/useAIAlerts'
import { AlertCard } from '@/components/ai/AlertCard'
import { AlertTriangle } from 'lucide-react'
import { SectionLoader } from '@/components/ui/loader';
import { useTranslation } from 'react-i18next'


const AIAlertsPage = () => {
  const { t } = useTranslation('ai');
  const { parcelId } = Route.useParams();
  const { data: alerts, isLoading } = useAIAlerts(parcelId);
  const { mutate: acknowledgeAlert, isPending: isAcknowledging } = useAcknowledgeAIAlert();
  const { mutate: resolveAlert, isPending: isResolving } = useResolveAIAlert();

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('alerts.title')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('alerts.subtitle')}</p>
      </div>

      {!alerts || alerts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('alerts.noAlerts')}</h3>
          <p className="text-gray-500 dark:text-gray-400">{t('alerts.noAlertsMessage')}</p>
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
