import { createFileRoute } from '@tanstack/react-router'
import UsersSettings from '../components/UsersSettings'
import RoleProtectedRoute from '../components/RoleProtectedRoute'

function UsersSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <UsersSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/settings/users')({
  component: UsersSettingsPage,
})