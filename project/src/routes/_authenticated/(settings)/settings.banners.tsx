import { createFileRoute } from '@tanstack/react-router'
import BannerSettings from '@/components/BannerSettings'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'

function BannerSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <BannerSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/banners')({
  component: BannerSettingsPage,
})
