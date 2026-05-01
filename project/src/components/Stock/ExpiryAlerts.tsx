import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { useExpiryAlerts } from '@/hooks/useExpiryAlerts';
import type { ExpiryAlertData } from '@/lib/api/stock';
import { AlertTriangle, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type UrgencyGroup = 'expired' | 'critical' | 'warning' | 'attention';

const URGENCY_CONFIG: Record<UrgencyGroup, { bg: string; text: string; badgeBg: string }> = {
  expired: { bg: 'border-l-red-500', text: 'text-red-800 dark:text-red-300', badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  critical: { bg: 'border-l-orange-500', text: 'text-orange-800 dark:text-orange-300', badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  warning: { bg: 'border-l-yellow-500', text: 'text-yellow-800 dark:text-yellow-300', badgeBg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  attention: { bg: 'border-l-blue-500', text: 'text-blue-800 dark:text-blue-300', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
};

function groupByUrgency(alerts: ExpiryAlertData[]): Record<UrgencyGroup, ExpiryAlertData[]> {
  return alerts.reduce(
    (acc, alert) => {
      const urgency = alert.urgency as UrgencyGroup;
      if (!acc[urgency]) acc[urgency] = [];
      acc[urgency].push(alert);
      return acc;
    },
    {} as Record<UrgencyGroup, ExpiryAlertData[]>,
  );
}

export default function ExpiryAlerts() {
  const { t } = useTranslation('stock');
  const { data: alerts = [], isLoading, error } = useExpiryAlerts(90);

  const grouped = useMemo(() => groupByUrgency(alerts), [alerts]);

  const groupOrder: UrgencyGroup[] = ['expired', 'critical', 'warning', 'attention'];
  const groupLabels: Record<UrgencyGroup, string> = {
    expired: t('expiryAlerts.groupExpired', 'Expired'),
    critical: t('expiryAlerts.groupCritical', 'Critical (< 30 days)'),
    warning: t('expiryAlerts.groupWarning', 'Warning (< 60 days)'),
    attention: t('expiryAlerts.groupAttention', 'Attention (< 90 days)'),
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed dark:border-gray-700">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          {t('expiryAlerts.noAlerts', 'Failed to load expiry alerts')}
        </p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('expiryAlerts.title', 'Expiry Alerts')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('expiryAlerts.subtitle', 'Items approaching or past expiration')}
          </p>
        </div>
        <EmptyState
          variant="card"
          icon={Package}
          title={t('expiryAlerts.noAlerts', 'No expiry alerts')}
          description={t('expiryAlerts.noAlertsHint', 'All stock items are within their acceptable shelf life')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('expiryAlerts.title', 'Expiry Alerts')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('expiryAlerts.subtitle', 'Items approaching or past expiration')}
        </p>
      </div>

      {groupOrder.map((urgency) => {
        const groupAlerts = grouped[urgency];
        if (!groupAlerts || groupAlerts.length === 0) return null;
        const config = URGENCY_CONFIG[urgency];

        return (
          <Card key={urgency} className={cn('border-l-4', config.bg)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={cn('text-lg', config.text)}>
                  {groupLabels[urgency]}
                </CardTitle>
                <Badge className={config.badgeBg}>
                  {groupAlerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {alert.itemName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          {t('expiryAlerts.batch', 'Batch')}: {alert.batchNumber}
                        </span>
                        <span>
                          {t('expiryAlerts.warehouse', 'Warehouse')}: {alert.warehouseName}
                        </span>
                        <span>
                          {t('expiryAlerts.quantity', 'Quantity')}: {alert.quantity} {alert.unit}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={cn('text-sm font-medium', config.text)}>
                        {alert.daysUntilExpiry < 0
                          ? t('expiryAlerts.daysAgo', '{{days}} days ago', { days: Math.abs(alert.daysUntilExpiry) })
                          : t('expiryAlerts.inDays', 'In {{days}} days', { days: alert.daysUntilExpiry })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
