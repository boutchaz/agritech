import { createFileRoute } from '@tanstack/react-router'
import ModulesSettings from '@/components/ModulesSettings'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'

const ModulesSettingsPage = () => {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <ModulesSettings />
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute('/_authenticated/(settings)/settings/modules')({
  component: ModulesSettingsPage,
})
