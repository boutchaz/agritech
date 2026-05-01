import { createFileRoute } from '@tanstack/react-router';
import { AccountMappingsManagement } from '@/components/settings/AccountMappingsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function AccountMappingsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
      <AccountMappingsManagement />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/account-mappings')({
  component: withRouteProtection(
    AccountMappingsPage,
    'manage',
    'AccountMapping'
  ),
});
