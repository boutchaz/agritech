import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import EmployeeManagement from '@/components/EmployeeManagement'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { PageLoader } from '@/components/ui/loader'

const AppContent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <PageLayout activeModule="employees">
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
        <div className="flex flex-wrap items-center gap-2">
          <OrganizationSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
      <EmployeeManagement />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/employees')({
  component: AppContent,
})
