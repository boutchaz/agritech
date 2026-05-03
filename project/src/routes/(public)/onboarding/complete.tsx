import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { CompleteScreen } from '@/components/onboarding-v2/CompleteScreen';
import { onboardingApi } from '@/lib/api/onboarding';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import { clearPersistedQueries } from '@/lib/offline/persister';

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

export const Route = createFileRoute('/(public)/onboarding/complete')({
  component: CompleteRoute,
});

function CompleteRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileData = useOnboardingStore((s) => s.profileData);
  const organizationData = useOnboardingStore((s) => s.organizationData);
  const farmData = useOnboardingStore((s) => s.farmData);
  const moduleSelection = useOnboardingStore((s) => s.moduleSelection);
  const preferences = useOnboardingStore((s) => s.preferences);
  const existingOrgId = useOnboardingStore((s) => s.existingOrgId);
  const storeOrgId = useOrganizationStore((s) => s.currentOrganization?.id ?? null);
  const clearState = useOnboardingStore((s) => s.clearState);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const orgId =
        (existingOrgId && existingOrgId.trim()) ||
        (storeOrgId && storeOrgId.trim()) ||
        readStoredOrganizationId();
      if (!orgId) {
        setError(t('onboarding.completeMissingOrg', 'We could not find your organization. Refresh and try again.'));
        setLoading(false);
        return;
      }
      await onboardingApi.savePreferencesAndComplete(preferences, orgId);
      await clearState();
      // Evict cached /auth/me. TanStack Query persists the 'auth'
      // namespace to IndexedDB; a hard reload would otherwise rehydrate
      // the stale `onboarding_completed: false` snapshot, re-trigger
      // MultiTenantAuthProvider's redirect to /onboarding, and only land
      // on the dashboard after a background refetch fired. removeQueries
      // alone won't help: the persister flushes via a debounced
      // subscription that hasn't fired yet when we navigate. Clear the
      // IDB key directly + drop the in-memory state, then reload.
      queryClient.removeQueries({ queryKey: ['auth'] });
      await clearPersistedQueries(orgId);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.errorGeneric', 'Une erreur est survenue'));
      setLoading(false);
    }
  }, [loading, existingOrgId, storeOrgId, preferences, clearState, queryClient, t]);

  const data = {
    firstName: profileData.first_name || 'Cher agriculteur',
    farmName: organizationData.name || farmData.name || 'Mon exploitation',
    accountType: organizationData.account_type || 'farm',
    city: organizationData.city || '',
    surface: farmData.size || 0,
    unit: (farmData.size_unit === 'acres'
      ? 'acre'
      : farmData.size_unit === 'm2'
      ? 'm2'
      : 'ha') as 'ha' | 'acre' | 'm2',
    modulesCount: Object.values(moduleSelection || {}).filter(Boolean).length,
  };

  const handleRestart = () => navigate({ to: '/onboarding' });

  return (
    <OnbShellLayout header={<OnbHeader step={5} total={5} />}>
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <CompleteScreen data={data} onComplete={handleComplete} onRestart={handleRestart} loading={loading} />
    </OnbShellLayout>
  );
}
