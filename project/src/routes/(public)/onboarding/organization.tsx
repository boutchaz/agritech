import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { OrganizationStep } from '@/components/onboarding/steps/OrganizationStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi, CheckSlugAvailabilityResponse } from '@/lib/api/onboarding';
import { useState, useCallback, useRef } from 'react';

export const Route = createFileRoute('/(public)/onboarding/organization')({
  component: OrganizationStepComponent,
});

function OrganizationStepComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const organizationData = useOnboardingStore((state) => state.organizationData);
  const existingOrgId = useOnboardingStore((state) => state.existingOrgId);
  const updateOrganizationData = useOnboardingStore((state) => state.updateOrganizationData);
  const setExistingOrgId = useOnboardingStore((state) => state.setExistingOrgId);
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
      const result = await onboardingApi.saveOrganization(organizationData, existingOrgId || undefined);

      // Calculate the org ID (either new or existing)
      const orgId = result.id || existingOrgId;

      // Persist state with the org ID directly to avoid timing issues
      await persistState({ existingOrgId: orgId, currentStep: 3 });

      // Also update local state
      if (orgId !== existingOrgId) {
        setExistingOrgId(orgId);
      }

      navigate({ to: '/onboarding/farm' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
    // Note: Don't reset isSubmitting on success since we navigate away
  }, [navigate, persistState, setExistingOrgId, organizationData, existingOrgId]);

  const checkSlugAvailability = useCallback(async (slug: string): Promise<CheckSlugAvailabilityResponse> => {
    return onboardingApi.checkSlugAvailability(slug);
  }, []);

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <OrganizationStep
        organizationData={organizationData}
        existingOrgId={existingOrgId}
        onUpdate={updateOrganizationData}
        onCheckSlug={checkSlugAvailability}
        onNext={handleNext}
        isLoading={isSubmitting}
      />
    </>
  );
}
