import { createFileRoute, Navigate } from '@tanstack/react-router';

/**
 * Redirects to the new consolidated Account Settings page.
 * This route is kept for backwards compatibility.
 */
export const Route = createFileRoute('/_authenticated/(settings)/settings/preferences')({
  component: () => <Navigate to="/settings/account" />,
});