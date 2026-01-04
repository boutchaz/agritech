import { createFileRoute } from '@tanstack/react-router';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CropCyclesPage() {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/crop-cycles')({
  component: withRouteProtection(CropCyclesPage, 'read', 'CropCycle'),
});
