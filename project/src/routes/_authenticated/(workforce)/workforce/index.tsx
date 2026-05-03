import { createFileRoute, Navigate } from '@tanstack/react-router';

const WorkforceIndex = () => {
  return <Navigate to="/workforce/leave-applications" replace />;
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/')({
  component: WorkforceIndex,
});
