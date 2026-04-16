import { createFileRoute } from '@tanstack/react-router';
import { CostCenterManagement } from '@/components/settings/CostCenterManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function CostCentersPage() {
  return <CostCenterManagement />;
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/cost-centers')({
  component: withRouteProtection(
    CostCentersPage,
    'manage',
    'CostCenter'
  ),
});
