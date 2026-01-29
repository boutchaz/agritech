import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FarmStep } from '@/components/onboarding/steps/FarmStep';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState } from 'react';

export const Route = createFileRoute('/(public)/onboarding/farm')({
  component: FarmStepComponent,
});

function FarmStepComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, updateFarmData, persistState } = useOnboardingContext();
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);
    try {
      await onboardingApi.saveFarm(state.farmData);
      await persistState();
      navigate({ to: '/onboarding/modules' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    }
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <FarmStep
        farmData={state.farmData}
        onUpdate={updateFarmData}
        onNext={handleNext}
      />
    </>
  );
}
