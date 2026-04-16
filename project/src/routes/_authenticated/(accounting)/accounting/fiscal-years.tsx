import { createFileRoute } from '@tanstack/react-router';
import { FiscalYearManagement } from '@/components/settings/FiscalYearManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function FiscalYearsPage() {
  return <FiscalYearManagement />;
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/fiscal-years')({
  component: withRouteProtection(
    FiscalYearsPage,
    'manage',
    'FiscalYear'
  ),
});
