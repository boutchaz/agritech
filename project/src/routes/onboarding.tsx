import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    // Redirect to dashboard if user doesn't need onboarding
    // This will be checked by the auth provider
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* This will be handled by child routes */}
    </div>
  );
}