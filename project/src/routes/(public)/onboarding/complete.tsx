import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CompletionStep } from '@/components/onboarding/steps/CompletionStep';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import { onboardingApi } from '@/lib/api/onboarding';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function readStoredOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const id = window.localStorage.getItem('currentOrganizationId');
    if (!id || id === 'undefined' || id === 'null') return null;
    return id.trim();
  } catch {
    return null;
  }
}

async function resolveOrgId(
  existingOrgId: string | null,
  storeOrgId: string | null,
): Promise<string | null> {
  const candidates = [
    existingOrgId?.trim(),
    storeOrgId?.trim(),
    readStoredOrganizationId(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/organizations/${candidate}`,
        {
          headers: {
            Authorization: `Bearer ${await import('@/stores/authStore').then(m => m.useAuthStore.getState().getAccessToken())}`,
            'X-Organization-Id': candidate,
          },
        },
      );
      if (res.ok) return candidate;
    } catch {}
  }
  return null;
}

export const Route = createFileRoute('/(public)/onboarding/complete')({
  component: CompleteStepComponent,
});

function CompleteStepComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const preferences = useOnboardingStore((state) => state.preferences);
  const profileData = useOnboardingStore((state) => state.profileData);
  const organizationData = useOnboardingStore((state) => state.organizationData);
  const farmData = useOnboardingStore((state) => state.farmData);
  const moduleSelection = useOnboardingStore((state) => state.moduleSelection);
  const existingOrgId = useOnboardingStore((state) => state.existingOrgId);
  const storeOrgId = useOrganizationStore((state) => state.currentOrganization?.id ?? null);
  const updatePreferences = useOnboardingStore((state) => state.updatePreferences);
  const clearState = useOnboardingStore((state) => state.clearState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      let orgIdForApi =
        (existingOrgId && existingOrgId.trim()) ||
        (storeOrgId && storeOrgId.trim()) ||
        readStoredOrganizationId();

      if (!orgIdForApi) {
        orgIdForApi = await resolveOrgId(existingOrgId, storeOrgId);
      }

      if (!orgIdForApi) {
        setError(
          t(
            'onboarding.completeMissingOrg',
            'We could not find your organization. Return to the organization step to save it again, or refresh the page.',
          ),
        );
        setIsLoading(false);
        return;
      }

      await onboardingApi.savePreferencesAndComplete(preferences, orgIdForApi);

      await clearState();

      window.location.href = '/';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('onboarding.errorGeneric', 'Une erreur est survenue');
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [preferences, existingOrgId, storeOrgId, clearState, t]);

  const handleGoBackToOrg = useCallback(() => {
    navigate({ to: '/onboarding/organization' });
  }, [navigate]);

  const selectedModulesCount = Object.values(moduleSelection || {}).filter(Boolean).length;

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex flex-col gap-2">
          <span>{error}</span>
          {error.includes('organization') && (
            <button
              onClick={handleGoBackToOrg}
              className="text-xs font-medium underline hover:no-underline"
            >
              {t('onboarding.backToOrgStep', 'Go back to organization step')}
            </button>
          )}
        </div>
      )}
      <CompletionStep
        preferences={preferences}
        profileName={`${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim()}
        organizationName={organizationData?.name || ''}
        farmName={farmData?.name || ''}
        selectedModulesCount={selectedModulesCount}
        defaultAccountingCountry={organizationData?.country || 'MA'}
        onUpdate={updatePreferences}
        onComplete={handleComplete}
        isLoading={isLoading}
      />
    </>
  );
}
