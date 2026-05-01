import { createFileRoute } from '@tanstack/react-router';
import { CostCenterManagement } from '@/components/settings/CostCenterManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function CostCentersPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
      <CostCenterManagement />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/cost-centers')({
  component: withRouteProtection(
    CostCentersPage,
    'manage',
    'CostCenter'
  ),
});
