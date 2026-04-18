import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Building2, BookOpen, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CostCenterManagement } from '@/components/settings/CostCenterManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { SectionLoader } from '@/components/ui/loader';

function CostCentersPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <SectionLoader />;
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: BookOpen, label: t('nav.accounting', 'Accounting'), path: '/accounting' },
            { icon: Target, label: t('accountingModule.costCenters.title', 'Cost Centers'), isActive: true },
          ]}
          title={t('accountingModule.costCenters.title', 'Cost Centers')}
          subtitle={t('accountingModule.costCenters.subtitle', 'Track and allocate costs across departments and projects')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <CostCenterManagement />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/cost-centers')({
  component: withRouteProtection(
    CostCentersPage,
    'manage',
    'CostCenter'
  ),
});
