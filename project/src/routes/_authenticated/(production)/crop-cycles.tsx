import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ModernPageHeader from '@/components/ModernPageHeader';
import { CropCyclesList } from '@/components/CropCycles/CropCyclesList';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useTranslation } from 'react-i18next';

const cropCyclesSearchSchema = z.object({
  campaign_id: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v)),
});

function CropCyclesPageInner() {
  const { t } = useTranslation();
  const { campaign_id } = Route.useSearch();

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
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <CropCyclesList initialCampaignId={campaign_id} />
      </div>
    </>
  );
}

const CropCyclesPage = withRouteProtection(CropCyclesPageInner, 'read', 'CropCycle');

export const Route = createFileRoute('/_authenticated/(production)/crop-cycles')({
  component: CropCyclesPage,
  validateSearch: (search) => {
    const parsed = cropCyclesSearchSchema.safeParse(search);
    return parsed.success ? parsed.data : {};
  },
});
