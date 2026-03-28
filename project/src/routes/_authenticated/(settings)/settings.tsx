import React from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SettingsLayout from '@/components/SettingsLayout'
import { ArrowLeft, Home } from 'lucide-react'
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
    <PageLayout activeModule="settings">
      {/* Mobile-optimized header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back button on mobile */}
            <Button
              onClick={handleBackToDashboard}
              className="md:hidden flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg -ml-2"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
              {currentOrganization.name}
            </h1>
            {currentFarm && (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:inline">
                • {currentFarm.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Home button on mobile */}
            <Button
              onClick={handleBackToDashboard}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Go to home"
            >
              <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Button>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <OrganizationSwitcher />
              <LanguageSwitcher />
            </div>
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
  component: SettingsLayoutComponent,
})
