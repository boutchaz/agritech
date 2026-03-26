import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'

function SettingsIndexRedirect() {
  const { userRole: _userRole } = useAuth();

  // Redirect based on user role
  // All users can access account settings, so it's a safe default
  return <Navigate to="/settings/account" replace />;
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/')({
  component: SettingsIndexRedirect,
})

// This route redirects /settings to /settings/account by default
// Account settings is accessible to all roles, making it a universal landing page