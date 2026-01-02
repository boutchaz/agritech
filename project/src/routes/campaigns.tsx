import { createFileRoute } from '@tanstack/react-router';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CampaignManagement } from '@/components/settings/CampaignManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import { useSidebarMargin } from '../hooks/useSidebarLayout';

function CampaignsPage() {
  const { t } = useTranslation();
  const { style: sidebarStyle } = useSidebarMargin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        modules={[]}
        activeModule="campaigns"
        onModuleChange={() => {}}
        isDarkMode={false}
        onThemeToggle={() => {}}
      />
      <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out" style={sidebarStyle}>
        <ModernPageHeader
          title={t('campaigns.pageTitle', 'Agricultural Campaigns')}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            { label: t('campaigns.pageTitle', 'Campaigns'), isActive: true },
          ]}
        />
        <div className="p-6">
          <CampaignManagement />
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/campaigns')({
  component: withRouteProtection(CampaignsPage, 'read', 'Campaign'),
});
