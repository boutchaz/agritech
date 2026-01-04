import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/components/MultiTenantAuthProvider'
import { PageLayout } from '@/components/PageLayout'
import DayLaborerManagement from '@/components/DayLaborerManagement'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'

const AppContent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout activeModule="day-laborers">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {currentOrganization.name}
          </h1>
          {currentFarm && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              • {currentFarm.name}
            </span>
          )}
        </div>
        <OrganizationSwitcher />
      </div>
      <DayLaborerManagement />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/day-laborers')({
  component: AppContent,
})
