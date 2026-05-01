import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/(production)/satellite-analysis')({
  beforeLoad: () => {
    throw redirect({ to: '/production/satellite-analysis' });
  },
});
