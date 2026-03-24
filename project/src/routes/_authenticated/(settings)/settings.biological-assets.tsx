import { createFileRoute, Navigate } from '@tanstack/react-router';

function BiologicalAssetsRedirect() {
  return <Navigate to="/biological-assets" replace />;
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/biological-assets')({
  component: BiologicalAssetsRedirect,
});
