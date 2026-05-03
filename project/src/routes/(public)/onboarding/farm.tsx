import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { FarmScreen } from '@/components/onboarding-v2/FarmScreen';
import { onboardingApi } from '@/lib/api/onboarding';
import { usersApi } from '@/lib/api/users';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Route = createFileRoute('/(public)/onboarding/farm')({
  component: FarmStepRoute,
});

function FarmStepRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const organizationData = useOnboardingStore((s) => s.organizationData);
  const farmData = useOnboardingStore((s) => s.farmData);
  const existingOrgId = useOnboardingStore((s) => s.existingOrgId);
  const existingFarmId = useOnboardingStore((s) => s.existingFarmId);
  const updateOrganizationData = useOnboardingStore((s) => s.updateOrganizationData);
  const updateFarmData = useOnboardingStore((s) => s.updateFarmData);
  const setExistingOrgId = useOnboardingStore((s) => s.setExistingOrgId);
  const setExistingFarmId = useOnboardingStore((s) => s.setExistingFarmId);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const persistState = useOnboardingStore((s) => s.persistState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [region, setRegion] = useState(farmData.description || '');
  const formData = {
    org_name: organizationData.name || '',
    email: organizationData.email || '',
    city: organizationData.city || '',
    region,
  };

  const handleChange = (patch: Partial<typeof formData>) => {
    if (patch.org_name !== undefined) {
      updateOrganizationData({ name: patch.org_name });
      updateFarmData({ name: patch.org_name });
    }
    if (patch.email !== undefined) updateOrganizationData({ email: patch.email });
    if (patch.city !== undefined) {
      updateOrganizationData({ city: patch.city });
      updateFarmData({ location: patch.city });
    }
    if (patch.region !== undefined) {
      setRegion(patch.region);
      updateFarmData({ description: patch.region });
    }
  };

  const handleNext = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      let orgId = existingOrgId;

      // Re-entry safety: user may have an org from signup or prior onboarding
      // attempt that's not in the store. Look up before creating.
      if (!orgId) {
        try {
          const orgs = await usersApi.getMyOrganizations();
          if (orgs && orgs.length > 0) {
            orgId = orgs[0].id;
            setExistingOrgId(orgId);
          }
        } catch {
          // ignore — fall through to create
        }
      }

      if (!orgId) {
        const baseSlug =
          (organizationData.name || 'mon-exploitation')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 40) || 'mon-exploitation';
        const orgResult = await onboardingApi.saveOrganization({
          name: organizationData.name,
          slug: `${baseSlug}-${Date.now().toString(36)}`,
          phone: organizationData.phone || '',
          email: organizationData.email,
          account_type: organizationData.account_type as 'individual' | 'business' | 'farm',
          city: organizationData.city,
          country: organizationData.country || 'MA',
        });
        orgId = orgResult.id;
        setExistingOrgId(orgId);
      }

      // Farm is saved in the next step (Surface) once size is known —
      // farms table enforces size > 0.
      await persistState({ existingOrgId: orgId, currentStep: 4 });
      setCurrentStep(4);
      navigate({ to: '/onboarding/surface' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('onboarding.errorGeneric', 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    existingOrgId,
    existingFarmId,
    organizationData,
    farmData,
    setExistingOrgId,
    setExistingFarmId,
    persistState,
    setCurrentStep,
    navigate,
    t,
  ]);

  const handleBack = useCallback(() => {
    navigate({ to: '/onboarding/account-type' });
  }, [navigate]);

  return (
    <OnbShellLayout header={<OnbHeader step={3} total={5} />}>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <FarmScreen data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} loading={loading} />
    </OnbShellLayout>
  );
}
