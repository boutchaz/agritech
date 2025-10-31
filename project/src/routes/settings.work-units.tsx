import { createFileRoute } from '@tanstack/react-router';
import { WorkUnitManagement } from '@/components/settings/WorkUnitManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

/**
 * Work Units Settings Page
 *
 * Allows organization admins to manage work units (Arbre, Caisse, Kg, Litre, etc.)
 * used for piece-work payment tracking.
 *
 * Access: Organization admins only
 * Route: /settings/work-units
 */
function WorkUnitsSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <WorkUnitManagement />
    </div>
  );
}

// Protect route - require admin permissions to manage WorkUnit
export const Route = createFileRoute('/settings/work-units')({
  component: withRouteProtection(
    WorkUnitsSettingsPage,
    'manage', // action
    'WorkUnit' // resource - only org admins can manage work units
  ),
});
