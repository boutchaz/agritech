import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { AccountTypeScreen, type AccountTypeId } from '@/components/onboarding-v2/AccountTypeScreen';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Route = createFileRoute('/(public)/onboarding/account-type')({
  component: AccountTypeRoute,
});

function AccountTypeRoute() {
  const navigate = useNavigate();
  const organizationData = useOnboardingStore((s) => s.organizationData);
  const updateOrganizationData = useOnboardingStore((s) => s.updateOrganizationData);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const persistState = useOnboardingStore((s) => s.persistState);
  const [loading, setLoading] = useState(false);

  const value = (organizationData.account_type as AccountTypeId | undefined) ?? 'farm';

  const handleNext = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await persistState({ currentStep: 3 });
      setCurrentStep(3);
      navigate({ to: '/onboarding/farm' });
    } finally {
      setLoading(false);
    }
  }, [loading, navigate, persistState, setCurrentStep]);

  const handleBack = useCallback(() => {
    navigate({ to: '/onboarding/profile' });
  }, [navigate]);

  return (
    <OnbShellLayout header={<OnbHeader step={2} total={5} />}>
      <AccountTypeScreen
        value={value}
        onChange={(v) => updateOrganizationData({ account_type: v })}
        onNext={handleNext}
        onBack={handleBack}
        loading={loading}
      />
    </OnbShellLayout>
  );
}
