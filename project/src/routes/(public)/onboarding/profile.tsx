import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi } from '@/lib/api/onboarding';
import { useCallback, useRef } from 'react';

export const Route = createFileRoute('/(public)/onboarding/profile')({
  component: ProfileStep,
});

function ProfileStep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileData = useOnboardingStore((state) => state.profileData);
  const organizationData = useOnboardingStore((state) => state.organizationData);
  const existingOrgId = useOnboardingStore((state) => state.existingOrgId);
  const updateProfileData = useOnboardingStore((state) => state.updateProfileData);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
  const persistState = useOnboardingStore((state) => state.persistState);
  const isSubmittingRef = useRef(false);

  const handleNext = useCallback(async () => {
    // Prevent double submission
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      await onboardingApi.saveProfile(profileData);

      // Determine next step and navigate
      const nextStep = (existingOrgId && organizationData.name) ? 3 : 2;
      const targetRoute = (existingOrgId && organizationData.name)
        ? '/onboarding/farm'
        : '/onboarding/organization';

      // Persist state with the new step
      await persistState({ currentStep: nextStep });
      setCurrentStep(nextStep);

      navigate({ to: targetRoute });
    } finally {
      isSubmittingRef.current = false;
    }
  }, [navigate, setCurrentStep, persistState, profileData, existingOrgId, organizationData.name]);

  return (
    <WelcomeStep
      profileData={profileData}
      onUpdate={updateProfileData}
      onNext={handleNext}
    />
  );
}
