import { createFileRoute } from '@tanstack/react-router';
import { CostCenterManagement } from '@/components/Settings/CostCenterManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

/**
 * Cost Centers Settings Page
 *
 * Allows organization admins to manage cost centers for expense tracking
 * and profitability analysis.
 *
 * Access: Organization admins only
 * Route: /settings/cost-centers
 */
function CostCentersSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <CostCenterManagement />
    </div>
  );
}

// Protect route - require admin permissions to manage cost centers
export const Route = createFileRoute('/settings/cost-centers')({
  component: withRouteProtection(
    CostCentersSettingsPage,
    'manage', // action
    'CostCenter' // resource - only org admins can manage cost centers
  ),
});
