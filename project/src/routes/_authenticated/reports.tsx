import { createFileRoute, Navigate } from '@tanstack/react-router';

function ReportsRedirect() {
  return <Navigate to="/accounting/reports" replace />;
}

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsRedirect,
});
