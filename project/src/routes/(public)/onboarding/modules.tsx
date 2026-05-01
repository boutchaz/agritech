import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ModulesStep } from '@/components/onboarding/steps/ModulesStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/(public)/onboarding/modules')({
  component: ModulesStepComponent,
});

function ModulesStepComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentOrganization, organizations } = useAuth();
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

      const orgToUse = currentOrganization || (organizations && organizations.length > 0 ? organizations[0] : null);
      if (orgToUse?.id) {
        const accessToken = useAuthStore.getState().getAccessToken();
        if (accessToken) {
          const selectedSlugs = Object.entries(moduleSelection)
            .filter(([, selected]) => selected)
            .map(([slug]) => slug);
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          await fetch(`${apiUrl}/api/v1/subscriptions/trial`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Organization-Id': orgToUse.id,
            },
            body: JSON.stringify({
              organization_id: orgToUse.id,
              plan_type: 'standard',
              selected_modules: selectedSlugs,
              contracted_hectares: 50,
            }),
          }).catch((err) => {
            console.warn('Trial subscription creation skipped:', err);
          });
        }
      }

      // Persist state with the new step
      await persistState({ currentStep: 5 });
      setCurrentStep(5);

      navigate({ to: '/onboarding/complete' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('onboarding.errorGeneric', 'Une erreur est survenue');
      setError(errorMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [moduleSelection, currentOrganization, organizations, navigate, persistState, setCurrentStep, t]);

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
