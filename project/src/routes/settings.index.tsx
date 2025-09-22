import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/')({
  component: () => <Navigate to="/settings/profile" replace />,
})

// This route redirects /settings to /settings/profile by default