import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'

function SettingsIndexRedirect() {
  const { userRole } = useAuth();

  // Redirect based on user role
  // All users can access profile, so it's a safe default
  return <Navigate to="/settings/profile" replace />;
}

export const Route = createFileRoute('/settings/')({
  component: SettingsIndexRedirect,
})

// This route redirects /settings to /settings/profile by default
// Profile is accessible to all roles, making it a universal landing page