import { createFileRoute } from '@tanstack/react-router';
import { AccountMappingsManagement } from '@/components/settings/AccountMappingsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

/**
 * Account Mappings Settings Page
 *
 * Allows organization admins to manage account mappings for automatic
 * journal entry creation (cost types, revenue types, harvest sales, etc.)
 *
 * Access: Organization admins only
 * Route: /settings/account-mappings
 */
function AccountMappingsSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <AccountMappingsManagement />
    </div>
  );
}

// Protect route - require admin permissions to manage account mappings
export const Route = createFileRoute('/settings/account-mappings')({
  component: withRouteProtection(
    AccountMappingsSettingsPage,
    'manage', // action
    'AccountMapping' // resource - only org admins can manage account mappings
  ),
});
