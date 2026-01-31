import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useEffect } from 'react';

export const Route = createFileRoute('/(public)/onboarding/')({
  component: OnboardingRedirect,
});

/**
 * Redirects /onboarding to the appropriate step based on Zustand store state.
 * This ensures users resume from where they left off.
 *
 * Step mapping:
 * - Step 1 → /onboarding/profile
 * - Step 2 → /onboarding/organization
 * - Step 3 → /onboarding/farm
 * - Step 4 → /onboarding/modules
 * - Step 5+ → /onboarding/complete
 */
function OnboardingRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const isRestored = useOnboardingStore((state) => state.isRestored);

  useEffect(() => {
    // Only redirect once store is restored and user is available
    if (!loading && isRestored && user) {
      const routeForStep = (step: number) => {
        switch (step) {
          case 1:
            return '/onboarding/profile';
          case 2:
            return '/onboarding/organization';
          case 3:
            return '/onboarding/farm';
          case 4:
            return '/onboarding/modules';
          default:
            return '/onboarding/complete';
        }
      };

      navigate({ to: routeForStep(currentStep), replace: true });
    }
  }, [loading, isRestored, user, currentStep, navigate]);

  // Show loading while checking auth and loading state
  if (loading || !isRestored) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25" />
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Layout will redirect to login
  }

  return null; // Redirecting
}
