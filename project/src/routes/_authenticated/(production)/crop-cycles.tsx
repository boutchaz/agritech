import { createFileRoute, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

const cropCyclesSearchSchema = z.object({
  campaign_id: z.string().optional(),
});

function CropCyclesPage() {
  const { t } = useTranslation();
  const { campaign_id } = useSearch({ from: '/_authenticated/(production)/crop-cycles' });

  return (
    <>
      <ModernPageHeader
        title={t('cropCycles.pageTitle', 'Crop Cycles')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
          ...(campaign_id ? [{ label: t('nav.campaigns', 'Campaigns'), path: '/campaigns' }] : []),
          { label: t('cropCycles.pageTitle', 'Crop Cycles'), isActive: true },
        ]}
      />
      <div className="p-6">
        <CropCyclesList initialCampaignId={campaign_id} />
      </div>
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/crop-cycles')({
  component: withRouteProtection(CropCyclesPage, 'read', 'CropCycle'),
  validateSearch: cropCyclesSearchSchema,
});
