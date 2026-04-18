import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { onboardingApi } from '@/lib/api/onboarding';
import { useCallback, useRef } from 'react';

export const Route = createFileRoute('/(public)/onboarding/profile')({
  component: ProfileStep,
});

function ProfileStep() {
  const navigate = useNavigate();
  const profileData = useOnboardingStore((state) => state.profileData);
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

      // Always advance to step 2 (organization). Signup auto-creates an
      // org + stashes its id in localStorage, which populates
      // existingOrgId on the store — but the user has never actually
      // reviewed/confirmed org info. Skipping straight to farm made new
      // users land on modules + subscription without ever seeing
      // profile / org / farm steps. The organization step is
      // responsible for prefilling from the existing org and letting
      // the user edit before continuing.
      await persistState({ currentStep: 2 });
      setCurrentStep(2);

      navigate({ to: '/onboarding/organization' });
    } finally {
      isSubmittingRef.current = false;
    }
  }, [navigate, setCurrentStep, persistState, profileData]);

  return (
    <WelcomeStep
      profileData={profileData}
      onUpdate={updateProfileData}
      onNext={handleNext}
    />
  );
}
