import { createFileRoute } from '@tanstack/react-router';
import { CompletionStep } from '@/components/onboarding/steps/CompletionStep';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { authSupabase } from '@/lib/auth-supabase';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState } from 'react';

export const Route = createFileRoute('/(public)/onboarding/complete')({
  component: CompleteStepComponent,
});

function CompleteStepComponent() {
  const { user } = useAuth();
  const { state, updatePreferences } = useOnboardingContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await onboardingApi.savePreferencesAndComplete(state.preferences);

      if (user?.id) {
        await authSupabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }

      window.location.href = '/';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const selectedModulesCount = Object.values(state.moduleSelection || {}).filter(Boolean).length;

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <CompletionStep
        preferences={state.preferences}
        profileName={`${state.profileData?.first_name || ''} ${state.profileData?.last_name || ''}`.trim()}
        organizationName={state.organizationData?.name || ''}
        farmName={state.farmData?.name || ''}
        selectedModulesCount={selectedModulesCount}
        onUpdate={updatePreferences}
        onComplete={handleComplete}
        isLoading={isLoading}
      />
    </>
  );
}
