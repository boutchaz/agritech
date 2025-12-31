import { createFileRoute } from '@tanstack/react-router';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CropCyclesPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        modules={[]}
        activeModule="crop-cycles"
        onModuleChange={() => {}}
        isDarkMode={false}
        onThemeToggle={() => {}}
      />
      <main className="flex-1 w-full lg:w-auto">
        <ModernPageHeader
          title={t('cropCycles.pageTitle', 'Crop Cycles')}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            { label: t('cropCycles.pageTitle', 'Crop Cycles'), isActive: true },
          ]}
        />
        <div className="p-6">
          <CropCyclesList />
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/crop-cycles')({
  component: withRouteProtection(CropCyclesPage, 'read', 'CropCycle'),
});
