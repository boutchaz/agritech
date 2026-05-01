import { createFileRoute } from '@tanstack/react-router';
import { FiscalYearManagement } from '@/components/settings/FiscalYearManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function FiscalYearsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
      <FiscalYearManagement />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/fiscal-years')({
  component: withRouteProtection(
    FiscalYearsPage,
    'manage',
    'FiscalYear'
  ),
});
