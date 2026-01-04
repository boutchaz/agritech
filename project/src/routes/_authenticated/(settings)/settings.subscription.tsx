import { createFileRoute } from '@tanstack/react-router';
import SubscriptionSettings from '@/components/SubscriptionSettings';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';

function SubscriptionSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <SubscriptionSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/subscription')({
  component: SubscriptionSettingsPage,
});
