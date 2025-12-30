import { createFileRoute } from '@tanstack/react-router';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CampaignManagement } from '@/components/settings/CampaignManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CampaignsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        modules={[]}
        activeModule="campaigns"
        onModuleSelect={() => {}}
        isDarkMode={false}
        onToggleTheme={() => {}}
      />
      <main className="flex-1 lg:ml-72 transition-all duration-300">
        <ModernPageHeader
          title={t('campaigns.pageTitle', 'Agricultural Campaigns')}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: t('campaigns.pageTitle', 'Campaigns') },
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
