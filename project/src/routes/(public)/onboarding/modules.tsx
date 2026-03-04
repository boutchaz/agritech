import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ModulesStep } from '@/components/onboarding/steps/ModulesStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState, useCallback, useRef } from 'react';

export const Route = createFileRoute('/(public)/onboarding/modules')({
  component: ModulesStepComponent,
});

function ModulesStepComponent() {
  const navigate = useNavigate();
  const moduleSelection = useOnboardingStore((state) => state.moduleSelection);
  const selectedPlanType = useOnboardingStore((state) => state.selectedPlanType);
  const updateModuleSelection = useOnboardingStore((state) => state.updateModuleSelection);
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
      await onboardingApi.saveModules(moduleSelection);

      // Persist state with the new step
      await persistState({ currentStep: 5 });
      setCurrentStep(5);

      navigate({ to: '/onboarding/complete' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [moduleSelection, navigate, persistState, setCurrentStep]);

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <ModulesStep
        moduleSelection={moduleSelection}
        selectedPlanType={selectedPlanType}
        onUpdate={updateModuleSelection}
        onNext={handleNext}
        isLoading={isSubmitting}
      />
    </>
  );
}
