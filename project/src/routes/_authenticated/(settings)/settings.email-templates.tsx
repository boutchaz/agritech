import { createFileRoute } from '@tanstack/react-router'
import EmailTemplatesSettings from '@/components/EmailTemplatesSettings'
import RoleProtectedRoute from '@/components/RoleProtectedRoute'

function EmailTemplatesPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <EmailTemplatesSettings />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/email-templates')({
  component: EmailTemplatesPage,
})
