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
          title={t('cropCycles.pageTitle', 'Crop Cycles')}
          breadcrumbs={[
            { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
            { label: t('cropCycles.pageTitle', 'Crop Cycles'), isActive: true },
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
