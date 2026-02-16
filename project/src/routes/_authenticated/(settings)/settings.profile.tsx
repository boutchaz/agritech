import { createFileRoute, Navigate } from '@tanstack/react-router';

/**
 * Redirects to the new consolidated Account Settings page.
 * This route is kept for backwards compatibility.
 */
export const Route = createFileRoute('/_authenticated/(settings)/settings/profile')({
  component: () => <Navigate to="/settings/account" />,
});