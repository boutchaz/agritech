import { createFileRoute } from '@tanstack/react-router';
import { Leaf } from 'lucide-react';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CampaignManagement } from '@/components/settings/CampaignManagement';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
import { useTranslation } from 'react-i18next';

function CampaignsPage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      activeModule="campaigns"
      header={
        <ModernPageHeader
          title={t('campaigns.pageTitle', 'Agricultural Campaigns')}
          subtitle={t(
            'campaigns.description',
            'Manage agricultural campaigns (Campagne Agricole) for production planning.',
          )}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            {
              icon: Leaf,
              label: t('campaigns.pageTitle', 'Campaigns'),
              isActive: true,
            },
          ]}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <CampaignManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/campaigns')({
  component: withLicensedRouteProtection(CampaignsPage, 'read', 'Campaign'),
});
