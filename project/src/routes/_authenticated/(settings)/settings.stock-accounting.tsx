import { createFileRoute } from '@tanstack/react-router';
import { StockAccountingManagement } from '@/components/settings/StockAccountingManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function StockAccountingSettingsPage() {
  return <StockAccountingManagement />;
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/stock-accounting')({
  component: withRouteProtection(StockAccountingSettingsPage, 'manage', 'AccountMapping'),
});
