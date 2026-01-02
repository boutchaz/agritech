import React from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import { PageLayout } from '../components/PageLayout'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import SettingsLayout from '../components/SettingsLayout'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Home } from 'lucide-react'
import { useAutoStartTour } from '@/contexts/TourContext'

const SettingsLayoutComponent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useAutoStartTour('settings', 1500);

  const handleBackToDashboard = () => {
    navigate({ to: '/' });
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout activeModule="settings">
      {/* Mobile-optimized header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back button on mobile */}
            <button
              onClick={handleBackToDashboard}
              className="md:hidden flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg -ml-2"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
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
            <button
              onClick={handleBackToDashboard}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Go to home"
            >
              <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-shrink-0">
              <OrganizationSwitcher />
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

export const Route = createFileRoute('/settings')({
  component: SettingsLayoutComponent,
})
