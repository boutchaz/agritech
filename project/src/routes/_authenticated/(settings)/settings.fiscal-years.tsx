import { createFileRoute } from '@tanstack/react-router';
import { FiscalYearManagement } from '@/components/settings/FiscalYearManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function FiscalYearsSettingsPage() {
  return <FiscalYearManagement />;
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/fiscal-years')({
  component: withRouteProtection(
    FiscalYearsSettingsPage,
    'manage',
    'FiscalYear'
  ),
});
