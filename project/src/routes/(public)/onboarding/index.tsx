import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { WelcomeScreen } from '@/components/onboarding-v2/WelcomeScreen';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Route = createFileRoute('/(public)/onboarding/')({
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const isRestored = useOnboardingStore((s) => s.isRestored);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const persistState = useOnboardingStore((s) => s.persistState);

  // If user is mid-flow, jump to the right step
  useEffect(() => {
    if (loading || !isRestored || !user) return;
    if (currentStep > 1) {
      navigate({ to: routeForStep(currentStep), replace: true });
    }
  }, [loading, isRestored, user, currentStep, navigate]);

  const handleStart = async () => {
    setCurrentStep(1);
    await persistState({ currentStep: 1 }).catch(() => {});
    navigate({ to: '/onboarding/profile' });
  };

  const handleSignIn = () => navigate({ to: '/login', search: { redirect: undefined } });

  if (loading || !isRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-25" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500" />
          </div>
          <p className="text-gray-600">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <OnbShellLayout>
      <WelcomeScreen onStart={handleStart} onSignIn={handleSignIn} />
    </OnbShellLayout>
  );
}

function routeForStep(step: number) {
  switch (step) {
    case 1:
      return '/onboarding/profile' as const;
    case 2:
      return '/onboarding/account-type' as const;
    case 3:
      return '/onboarding/farm' as const;
    case 4:
      return '/onboarding/surface' as const;
    case 5:
      return '/onboarding/select-trial' as const;
    default:
      return '/onboarding/complete' as const;
  }
}
