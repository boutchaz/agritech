import { createFileRoute } from '@tanstack/react-router';
import { CompletionStep } from '@/components/onboarding/steps/CompletionStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/hooks/useAuth';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState, useCallback } from 'react';

export const Route = createFileRoute('/(public)/onboarding/complete')({
  component: CompleteStepComponent,
});

function CompleteStepComponent() {
  const { user } = useAuth();
  const preferences = useOnboardingStore((state) => state.preferences);
  const profileData = useOnboardingStore((state) => state.profileData);
  const organizationData = useOnboardingStore((state) => state.organizationData);
  const farmData = useOnboardingStore((state) => state.farmData);
  const moduleSelection = useOnboardingStore((state) => state.moduleSelection);
  const updatePreferences = useOnboardingStore((state) => state.updatePreferences);
  const clearState = useOnboardingStore((state) => state.clearState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await onboardingApi.savePreferencesAndComplete(preferences);

      // Clear onboarding state after completion
      await clearState();

      window.location.href = '/';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [preferences, user?.id, clearState]);

  const selectedModulesCount = Object.values(moduleSelection || {}).filter(Boolean).length;

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <CompletionStep
        preferences={preferences}
        profileName={`${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim()}
        organizationName={organizationData?.name || ''}
        farmName={farmData?.name || ''}
        selectedModulesCount={selectedModulesCount}
        onUpdate={updatePreferences}
        onComplete={handleComplete}
        isLoading={isLoading}
      />
    </>
  );
}
