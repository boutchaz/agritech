import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi } from '@/lib/api/onboarding';

export const Route = createFileRoute('/(public)/onboarding/profile')({
  component: ProfileStep,
});

function ProfileStep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, updateProfileData, persistState } = useOnboardingContext();

  const handleNext = async () => {
    await onboardingApi.saveProfile(state.profileData);
    await persistState();
    navigate({ to: '/onboarding/organization' });
  };

  return (
    <WelcomeStep
      profileData={state.profileData}
      onUpdate={updateProfileData}
      onNext={handleNext}
    />
  );
}
