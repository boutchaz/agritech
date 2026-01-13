import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CropCyclesPage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      activeModule="crop-cycles"
      header={
        <ModernPageHeader
          title={t('production.cropCycles.pageTitle')}
          breadcrumbs={[
            { label: t('nav.dashboard'), path: '/dashboard' },
            { label: t('production.cropCycles.pageTitle'), isActive: true },
          ]}
        />
      }
    >
      <div className="p-6">
        <CropCyclesList />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/production/crop-cycles')({
  component: withRouteProtection(CropCyclesPage, 'read', 'CropCycle'),
});
