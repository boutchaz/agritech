import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage } from '@/i18n/config';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrganizations, useOrganizationFarms } from '@/hooks/useAuthQueries';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { StepJumper } from '@/components/onboarding-v2/StepJumper';

export const Route = createFileRoute('/(public)/onboarding')({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const initialize = useOnboardingStore((s) => s.initialize);
  const isRestored = useOnboardingStore((s) => s.isRestored);
  const profileLanguage = useOnboardingStore((s) => s.profileData.language);
  const updateOrganizationData = useOnboardingStore((s) => s.updateOrganizationData);
  const updateFarmData = useOnboardingStore((s) => s.updateFarmData);
  const setExistingOrgId = useOnboardingStore((s) => s.setExistingOrgId);
  const setExistingFarmId = useOnboardingStore((s) => s.setExistingFarmId);
  const existingOrgId = useOnboardingStore((s) => s.existingOrgId);
  const existingFarmId = useOnboardingStore((s) => s.existingFarmId);

  const { data: orgs } = useUserOrganizations(user?.id);
  const { data: farms } = useOrganizationFarms(existingOrgId || orgs?.[0]?.id);

  useEffect(() => {
    if (user?.id) {
      initialize(user.id, user.email || '', profile
        ? {
            first_name: profile.first_name ?? undefined,
            last_name: profile.last_name ?? undefined,
            phone: profile.phone ?? undefined,
            timezone: profile.timezone ?? undefined,
            language: profile.language ?? undefined,
          }
        : undefined);
    }
  }, [user?.id, user?.email, profile, initialize]);

  // Re-entry hydration: pull authoritative org/farm data from API into the store
  // so previously-saved info shows pre-filled instead of empty defaults.
  useEffect(() => {
    if (!isRestored || !orgs || orgs.length === 0) return;
    const org = orgs[0];
    if (!existingOrgId) setExistingOrgId(org.id);
    updateOrganizationData({
      name: org.name || '',
      slug: org.slug || '',
      email: (org as { email?: string }).email || '',
      phone: (org as { phone?: string }).phone || '',
      city: (org as { city?: string }).city || '',
      country: (org as { country?: string }).country || 'MA',
      account_type:
        ((org as { account_type?: string }).account_type as 'individual' | 'business' | 'farm') ||
        'farm',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestored, orgs?.[0]?.id]);

  useEffect(() => {
    if (!isRestored || !farms || farms.length === 0) return;
    const farm = farms[0];
    if (!existingFarmId) setExistingFarmId(farm.id);
    updateFarmData({
      name: farm.name || '',
      location: farm.location || '',
      size: Number(farm.size) || 0,
      size_unit: farm.size_unit || 'hectares',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestored, farms?.[0]?.id]);

  useEffect(() => {
    if (!isRestored) return;
    void loadLanguage(profileLanguage);
  }, [isRestored, profileLanguage]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--onb-bg-canvas,#f5f7f3)]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-lg bg-emerald-500 opacity-20" />
            <div className="absolute inset-0 animate-pulse rounded-lg bg-emerald-500" />
          </div>
          <p className="text-sm text-slate-500">{t('onboarding.loading', 'Chargement…')}</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: bounce to /login before the isRestored gate (which only
  // flips inside `initialize`, called when user?.id exists).
  if (!user) {
    navigate({ to: '/login', search: { redirect: undefined } });
    return null;
  }

  if (!isRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--onb-bg-canvas,#f5f7f3)]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-lg bg-emerald-500 opacity-20" />
            <div className="absolute inset-0 animate-pulse rounded-lg bg-emerald-500" />
          </div>
          <p className="text-sm text-slate-500">{t('onboarding.loading', 'Chargement…')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <StepJumper />
    </>
  );
}
