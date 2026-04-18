import { createFileRoute } from '@tanstack/react-router';
import ExpiryAlerts from '@/components/Stock/ExpiryAlerts';

function ExpiryAlertsPage() {
  return <ExpiryAlerts />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/expiry-alerts')({
  component: ExpiryAlertsPage,
});
