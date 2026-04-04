import React from 'react'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SettingsLayout from '@/components/SettingsLayout'
import { ArrowLeft } from 'lucide-react'
import { useAutoStartTour } from '@/contexts/TourContext'
import { PageLoader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button';

const SettingsLayoutComponent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const navigate = useNavigate();

  useAutoStartTour('settings', 1500);

  const handleBackToDashboard = () => {
    navigate({ to: '/' });
  };

  if (!currentOrganization) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <PageLayout
      activeModule="settings"
      className="min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-30 md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 py-3 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
              className="flex-shrink-0 h-9 w-9 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl -ml-2"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-black text-slate-900 dark:text-white truncate uppercase tracking-tight leading-none">
                {currentOrganization.name}
              </h1>
              {currentFarm && (
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate uppercase tracking-widest mt-1">
                  {currentFarm.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <OrganizationSwitcher compact />
            <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1" />
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>
      
      <SettingsLayout>
        <Outlet />
      </SettingsLayout>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(settings)/settings')({
  beforeLoad: ({ location }) => {
    // Index lives at `/settings/`; `/settings` alone can leave the outlet empty or confuse the matcher.
    const normalized =
      location.pathname.replace(/\/$/, '') || '/'
    if (normalized === '/settings') {
      throw redirect({ to: '/settings/account', replace: true })
    }
  },
  component: SettingsLayoutComponent,
})
