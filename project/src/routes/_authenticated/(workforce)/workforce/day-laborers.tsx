
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth'
import { PageLayout } from '@/components/PageLayout'
import DayLaborerManagement from '@/components/DayLaborerManagement'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { ListPageSkeleton } from '@/components/ui/page-skeletons';

const AppContent = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return <ListPageSkeleton className="p-6" />;
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
        <div className="flex flex-wrap items-center gap-2">
          <OrganizationSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
      <DayLaborerManagement />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/day-laborers')({
  component: AppContent,
})
