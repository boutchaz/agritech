import { createFileRoute } from '@tanstack/react-router';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import { useSidebarMargin } from '../hooks/useSidebarLayout';

function CropCyclesPage() {
  const { t } = useTranslation();
  const { style: sidebarStyle } = useSidebarMargin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        modules={[]}
        activeModule="crop-cycles"
        onModuleChange={() => {}}
        isDarkMode={false}
        onThemeToggle={() => {}}
      />
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out" style={sidebarStyle}>
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
