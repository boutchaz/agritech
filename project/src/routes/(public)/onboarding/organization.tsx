import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { OrganizationStep } from '@/components/onboarding/steps/OrganizationStep';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi, CheckSlugAvailabilityResponse } from '@/lib/api/onboarding';
import { useState } from 'react';

export const Route = createFileRoute('/(public)/onboarding/organization')({
  component: OrganizationStepComponent,
});

function OrganizationStepComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, updateOrganizationData, persistState } = useOnboardingContext();
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);
    try {
      const result = await onboardingApi.saveOrganization(state.organizationData, state.existingOrgId || undefined);
      if (result.id && !state.existingOrgId) {
        updateOrganizationData({ existingOrgId: result.id });
      }
      await persistState();
      navigate({ to: '/onboarding/farm' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    }
  };

  const checkSlugAvailability = async (slug: string): Promise<CheckSlugAvailabilityResponse> => {
    return onboardingApi.checkSlugAvailability(slug);
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <OrganizationStep
        organizationData={state.organizationData}
        existingOrgId={state.existingOrgId}
        onUpdate={updateOrganizationData}
        onCheckSlug={checkSlugAvailability}
        onNext={handleNext}
      />
    </>
  );
}
