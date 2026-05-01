import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage } from '@/i18n/config';

export const Route = createFileRoute('/(public)/onboarding')({
  component: OnboardingLayout,
});

const TOTAL_STEPS = 4;

function OnboardingLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const initialize = useOnboardingStore((state) => state.initialize);
  const isRestored = useOnboardingStore((state) => state.isRestored);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const profileLanguage = useOnboardingStore((state) => state.profileData.language);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCompleteRoute = pathname.endsWith('/onboarding/complete');

  useEffect(() => {
    if (user?.id) {
      initialize(user.id, user.email || '', profile);
    }
  }, [user?.id, user?.email, profile, initialize]);

  useEffect(() => {
    if (!isRestored) return;
    void loadLanguage(profileLanguage);
  }, [isRestored, profileLanguage]);

  if (loading || !isRestored) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-500 rounded-lg animate-ping opacity-20" />
            <div className="absolute inset-0 bg-emerald-500 rounded-lg animate-pulse" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('onboarding.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: '/login' });
    return null;
  }

  const displayStep = Math.min(Math.max(currentStep, 1), TOTAL_STEPS);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Sticky glass header */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[3.75rem] w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex min-w-0 shrink-0 items-center">
            <picture>
              <source srcSet="/assets/logo.webp" type="image/webp" />
              <img src="/assets/logo.png" alt="AgroGina" className="h-10 w-auto sm:h-11" decoding="async" />
            </picture>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('onboarding.header.step', { current: displayStep, total: TOTAL_STEPS })}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i < displayStep
                      ? 'w-5 bg-emerald-500'
                      : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 items-start justify-center px-4 pb-3 pt-4">
        <div className={`w-full ${isCompleteRoute ? 'max-w-2xl' : 'max-w-lg'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
