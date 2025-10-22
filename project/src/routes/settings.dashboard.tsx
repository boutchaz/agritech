import { createFileRoute } from '@tanstack/react-router'
import DashboardSettings from '../components/DashboardSettings'
import RoleProtectedRoute from '../components/RoleProtectedRoute'

function DashboardSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin', 'farm_manager']}>
      <DashboardSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/settings/dashboard')({
  component: DashboardSettingsPage,
})