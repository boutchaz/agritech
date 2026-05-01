import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Satellite } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarms, useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { ContentSkeleton } from '@/components/ui/page-skeletons';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loader';
import { SatelliteAccessGate } from '@/components/authorization/SatelliteAccessGate';

const MultiParcelHeatmapViewer = lazy(
  () => import('@/components/SatelliteAnalysisView/MultiParcelHeatmapViewer'),
);

const FarmHeatmapPage = () => {
  const { t } = useTranslation('satellite');
  const navigate = useNavigate();
  const { farmId } = Route.useParams();
  const { currentOrganization } = useAuth();

  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const { data: parcels = [], isLoading } = useParcelsByFarm(farmId, currentOrganization?.id);

  const farm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);

  const inputs = useMemo(
    () =>
      parcels
        .filter((p) => p.boundary && p.boundary.length >= 3)
        .map((p) => ({
          id: p.id,
          name: p.name,
          boundary: p.boundary as number[][],
        })),
    [parcels],
  );

  if (!currentOrganization) return <PageLoader />;

  return (
    <PageLayout
      activeModule="farm-hierarchy"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Building2, label: t('satellite:farmHeatmap.crumb', 'Farms'), path: '/farm-hierarchy' },
            { icon: Satellite, label: farm?.name || farmId, isActive: true },
          ]}
          title={t('satellite:farmHeatmap.title', 'Farm satellite heatmap')}
          subtitle={
            farm?.name
              ? t('satellite:farmHeatmap.subtitle', 'All parcels in {{farmName}}', { farmName: farm.name })
              : t('satellite:farmHeatmap.subtitleFallback', 'All parcels in this farm')
          }
        />
      }
    >
      <div className="space-y-4 px-3 pb-20 pt-4 sm:px-4 md:px-6 md:pb-6">
        <Button
          variant="default"
          onClick={() => navigate({ to: '/farm-hierarchy' })}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('satellite:farmHeatmap.backToFarms', 'Back to farms')}
        </Button>

        <SatelliteAccessGate>
          {isLoading ? (
            <ContentSkeleton lines={8} className="p-6" />
          ) : (
            <Suspense fallback={<ContentSkeleton lines={8} className="p-6" />}>
              <MultiParcelHeatmapViewer parcels={inputs} farmName={farm?.name} />
            </Suspense>
          )}
        </SatelliteAccessGate>
      </div>
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/farms/$farmId/satellite/heatmap')({
  component: FarmHeatmapPage,
});
