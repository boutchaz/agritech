import { createFileRoute } from '@tanstack/react-router';
import { AccountMappingsManagement } from '@/components/settings/AccountMappingsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function AccountMappingsPage() {
  return <AccountMappingsManagement />;
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/account-mappings')({
  component: withRouteProtection(
    AccountMappingsPage,
    'manage',
    'AccountMapping'
  ),
});
