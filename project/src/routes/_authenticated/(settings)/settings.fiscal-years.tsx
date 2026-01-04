import { createFileRoute } from '@tanstack/react-router';
import { FiscalYearManagement } from '@/components/settings/FiscalYearManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function FiscalYearsSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <FiscalYearManagement />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/fiscal-years')({
  component: withRouteProtection(
    FiscalYearsSettingsPage,
    'manage',
    'FiscalYear'
  ),
});
