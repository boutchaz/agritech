import { createFileRoute } from '@tanstack/react-router'
import ChangelogSettings from '@/components/ChangelogSettings'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'

function ChangelogSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <ChangelogSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/changelog')({
  component: ChangelogSettingsPage,
})
