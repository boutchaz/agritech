import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { ModulesScreen, ONB_ERP_MODULES } from '@/components/onboarding-v2/ModulesScreen';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { onboardingApi } from '@/lib/api/onboarding';
import { isSubscriptionValid } from '@/lib/polar';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import {
  trackOnboardingStart,
  trackPageView,
  trackTrialStartAttempt,
  trackTrialStartFailure,
  trackTrialStartSuccess,
} from '@/lib/analytics';

export const Route = createFileRoute('/(public)/onboarding/select-trial')({
  component: SelectTrialRoute,
});

function SelectTrialRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganization, user, loading, organizations, profile } = useAuth();
  const orgForSub = currentOrganization || (organizations && organizations.length > 0 ? organizations[0] : null);
  const { data: subscription, isFetched: subscriptionFetched } = useSubscription(
    orgForSub ? { id: orgForSub.id, name: orgForSub.name } : null,
  );
  const setSelectedPlanType = useOnboardingStore((s) => s.setSelectedPlanType);
  const farmData = useOnboardingStore((s) => s.farmData);
  const organizationData = useOnboardingStore((s) => s.organizationData);
  const moduleSelection = useOnboardingStore((s) => s.moduleSelection);
  const setupAttempted = useRef(false);

  // Hydrate from previously persisted selection if any; otherwise default
  // to the 3 core + 1 popular addon.
  const initialSelected = useMemo(() => {
    const fromStore = Object.entries(moduleSelection || {})
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (fromStore.length > 0) return fromStore;
    return ['multi-fermes', 'dashboard', 'taches', 'recolte'];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedModules, setSelectedModules] = useState<string[]>(initialSelected);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    trackPageView({ title: 'Modules — Onboarding' });
    trackOnboardingStart();
  }, []);

  // Returning user with completed onboarding + valid sub → leave
  useEffect(() => {
    if (subscriptionFetched && isSubscriptionValid(subscription) && profile?.onboarding_completed === true) {
      navigate({ to: '/' });
    }
  }, [subscription, subscriptionFetched, profile?.onboarding_completed, navigate]);

  // Late-arriving users without an org (direct URL hit) — auto-create one via setup-organization
  useEffect(() => {
    if (loading || !user || orgForSub || setupAttempted.current) return;
    setupAttempted.current = true;
    (async () => {
      try {
        const accessToken = useAuthStore.getState().getAccessToken();
        if (!accessToken) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        await fetch(`${apiUrl}/api/v1/auth/setup-organization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            organizationName:
              organizationData.name ||
              (user.email?.split('@')[0] || 'User') + "'s Organization",
          }),
        });
        // Reload so MultiTenantAuthProvider picks up the new org
        window.location.reload();
      } catch {
        setError(t('onboarding.selectTrial.errorSetupFailed', 'Setup failed. Please refresh.'));
      }
    })();
  }, [loading, user, orgForSub, organizationData.name, t]);

  if (loading || !user || !orgForSub) {
    return (
      <div className="onb-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--onb-brand-600)' }} />
      </div>
    );
  }

  const handleStartTrial = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    setSelectedPlanType('standard');
    trackTrialStartAttempt('standard');

    try {
      const accessToken = useAuthStore.getState().getAccessToken();
      if (!accessToken) throw new Error('Not authenticated');

      // Always include core modules in payload
      const allSelectedSlugs = Array.from(
        new Set([
          ...ONB_ERP_MODULES.filter((m) => m.cat === 'core').map((m) => m.id),
          ...selectedModules,
        ]),
      );

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/subscriptions/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Organization-Id': orgForSub.id,
        },
        body: JSON.stringify({
          organization_id: orgForSub.id,
          plan_type: 'standard',
          selected_modules: allSelectedSlugs,
          contracted_hectares: Math.max(1, farmData.size || 50),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed (${response.status})`);
      }

      const data = await response.json();
      if (!data?.success) throw new Error(data?.error || 'Trial creation failed');

      trackTrialStartSuccess('standard');

      localStorage.setItem('currentOrganization', JSON.stringify(orgForSub));
      useOrganizationStore.getState().setCurrentOrganization({
        id: orgForSub.id,
        name: orgForSub.name,
        description: undefined,
        slug: orgForSub.slug || undefined,
        currency_code: orgForSub.currency || undefined,
        timezone: orgForSub.timezone || undefined,
        is_active: orgForSub.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['subscription', orgForSub.id] });
      await queryClient.refetchQueries({ queryKey: ['subscription', orgForSub.id], type: 'active' });

      const moduleMap: Record<string, boolean> = {};
      allSelectedSlugs.forEach((id) => {
        moduleMap[id] = true;
      });
      useOnboardingStore.getState().updateModuleSelection(moduleMap);
      useOnboardingStore.getState().setCurrentStep(6);
      useOnboardingStore.getState().persistState({ currentStep: 6 }).catch(() => {});

      // Mark onboarding_completed early so a user who closes the tab on the
      // CompleteScreen isn't re-funneled through /onboarding next visit.
      // CompleteScreen still shows the "under review" message via the same endpoint.
      try {
        await onboardingApi.savePreferencesAndComplete(
          useOnboardingStore.getState().preferences,
          orgForSub.id,
        );
      } catch {
        // Non-blocking: CompleteScreen will retry on its CTA.
      }

      navigate({ to: '/onboarding/complete' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('onboarding.selectTrial.errorTrialFailed', 'Failed');
      setError(msg);
      trackTrialStartFailure('standard', msg);
      setIsCreating(false);
    }
  };

  const handleBack = () => navigate({ to: '/onboarding/surface' });

  const unit: 'ha' | 'acre' | 'm2' =
    farmData.size_unit === 'acres' ? 'acre' : farmData.size_unit === 'm2' ? 'm2' : 'ha';

  return (
    <OnbShellLayout header={<OnbHeader step={5} total={5} />}>
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <ModulesScreen
        selected={selectedModules.filter((id) => ONB_ERP_MODULES.find((m) => m.id === id)?.cat === 'addon')}
        onToggle={(addonOnly) => {
          // Keep core IDs alongside addons in stored state
          const cores = ONB_ERP_MODULES.filter((m) => m.cat === 'core').map((m) => m.id);
          setSelectedModules([...cores, ...addonOnly]);
        }}
        surface={farmData.size || 0}
        unit={unit}
        farmName={organizationData.name || farmData.name || 'votre exploitation'}
        onNext={handleStartTrial}
        onBack={handleBack}
        loading={isCreating}
      />
    </OnbShellLayout>
  );
}
