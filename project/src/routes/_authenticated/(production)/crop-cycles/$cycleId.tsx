import { createFileRoute } from '@tanstack/react-router';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCycleDetail } from '@/components/CropCycles/CropCycleDetail';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

function CropCycleDetailPage() {
  const { cycleId } = Route.useParams();
  const { t } = useTranslation();

  return (
    <>
      <ModernPageHeader
        title={t('cropCycles.detail.title', 'Cycle Detail')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
          { label: t('cropCycles.pageTitle', 'Crop Cycles'), path: '/crop-cycles' },
          { label: t('cropCycles.detail.title', 'Detail'), isActive: true },
        ]}
      />
      <div className="p-6">
        <CropCycleDetail cycleId={cycleId} />
      </div>
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/crop-cycles/$cycleId')({
  component: withRouteProtection(CropCycleDetailPage, 'read', 'CropCycle'),
});
