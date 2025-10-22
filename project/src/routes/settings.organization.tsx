import { createFileRoute } from '@tanstack/react-router'
import OrganizationSettings from '../components/OrganizationSettings'
import RoleProtectedRoute from '../components/RoleProtectedRoute'

function OrganizationSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <OrganizationSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/settings/organization')({
  component: OrganizationSettingsPage,
})