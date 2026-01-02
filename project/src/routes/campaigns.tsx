import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CampaignManagement } from '@/components/settings/CampaignManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CampaignsPage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      activeModule="campaigns"
      header={
        <ModernPageHeader
          title={t('campaigns.pageTitle', 'Agricultural Campaigns')}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            { label: t('campaigns.pageTitle', 'Campaigns'), isActive: true },
          ]}
        />
      }
    >
      <div className="p-6">
        <CampaignManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/campaigns')({
  component: withRouteProtection(CampaignsPage, 'read', 'Campaign'),
});
