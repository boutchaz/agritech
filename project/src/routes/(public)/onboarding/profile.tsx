import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { ProfileScreen } from '@/components/onboarding-v2/ProfileScreen';
import { onboardingApi } from '@/lib/api/onboarding';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Route = createFileRoute('/(public)/onboarding/profile')({
  component: ProfileStepRoute,
});

function ProfileStepRoute() {
  const navigate = useNavigate();
  const profileData = useOnboardingStore((s) => s.profileData);
  const updateProfileData = useOnboardingStore((s) => s.updateProfileData);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const persistState = useOnboardingStore((s) => s.persistState);
  const [loading, setLoading] = useState(false);

  const handleNext = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onboardingApi.saveProfile(profileData);
      await persistState({ currentStep: 2 });
      setCurrentStep(2);
      navigate({ to: '/onboarding/account-type' });
    } finally {
      setLoading(false);
    }
  }, [loading, navigate, setCurrentStep, persistState, profileData]);

  return (
    <OnbShellLayout header={<OnbHeader step={1} total={5} />}>
      <ProfileScreen
        data={profileData}
        onChange={updateProfileData}
        onNext={handleNext}
        loading={loading}
      />
    </OnbShellLayout>
  );
}
