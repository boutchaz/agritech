import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    // Redirect to dashboard - onboarding is temporarily disabled
    throw redirect({
      to: '/',
    });
  },
});