import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { BiologicalAssetsManagement } from '@/components/settings/BiologicalAssetsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Building2, TreeDeciduous } from 'lucide-react';

function BiologicalAssetsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  return (
    <PageLayout
      header={
        <ModernPageHeader
          title={t('biologicalAssets.pageTitle', 'Biological Assets')}
          breadcrumbs={[
            { icon: Building2, label: currentOrganization?.name || t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            { icon: TreeDeciduous, label: t('biologicalAssets.pageTitle', 'Biological Assets'), isActive: true },
          ]}
        />
      }
    >
      <div className="p-6">
        <BiologicalAssetsManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/biological-assets')({
  component: withRouteProtection(BiologicalAssetsPage, 'read', 'BiologicalAsset'),
});
