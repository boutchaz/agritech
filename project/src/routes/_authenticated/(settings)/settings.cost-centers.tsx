import { createFileRoute } from '@tanstack/react-router';
import { CostCenterManagement } from '@/components/settings/CostCenterManagement';
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
  return <CostCenterManagement />;
}

// Protect route - require admin permissions to manage cost centers
export const Route = createFileRoute('/_authenticated/(settings)/settings/cost-centers')({
  component: withRouteProtection(
    CostCentersSettingsPage,
    'manage', // action
    'CostCenter' // resource - only org admins can manage cost centers
  ),
});
