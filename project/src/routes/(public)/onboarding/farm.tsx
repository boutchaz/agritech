import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FarmStep } from '@/components/onboarding/steps/FarmStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState, useCallback, useRef } from 'react';

export const Route = createFileRoute('/(public)/onboarding/farm')({
  component: FarmStepComponent,
});

function FarmStepComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const farmData = useOnboardingStore((state) => state.farmData);
  const existingFarmId = useOnboardingStore((state) => state.existingFarmId);
  const updateFarmData = useOnboardingStore((state) => state.updateFarmData);
  const setExistingFarmId = useOnboardingStore((state) => state.setExistingFarmId);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
  const persistState = useOnboardingStore((state) => state.persistState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleNext = useCallback(async () => {
    // Prevent double submission
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onboardingApi.saveFarm(farmData, existingFarmId || undefined);
      console.log('[FarmStep] saveFarm result:', result);

      // Calculate the farm ID (either new or existing)
      const farmId = result.id || existingFarmId;

      // Persist state with the farm ID directly to avoid timing issues
      await persistState({ existingFarmId: farmId, currentStep: 4 });

      // Also update local state
      if (farmId !== existingFarmId) {
        setExistingFarmId(farmId);
      }

      navigate({ to: '/onboarding/modules' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [navigate, persistState, setExistingFarmId, existingFarmId, farmData]);

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <FarmStep
        farmData={farmData}
        onUpdate={updateFarmData}
        onNext={handleNext}
        isLoading={isSubmitting}
      />
    </>
  );
}
