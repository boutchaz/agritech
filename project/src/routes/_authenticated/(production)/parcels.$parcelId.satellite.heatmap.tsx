import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers } from 'lucide-react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { ContentSkeleton } from '@/components/ui/page-skeletons'
import { Button } from '@/components/ui/button'

const IndexImageViewer = lazy(() => import('../../../components/SatelliteAnalysisView/IndexImageViewer'));

const HeatmapPage = () => {
  const { t } = useTranslation('satellite');
  const { parcelId } = Route.useParams();
  const { data: parcel } = useParcelById(parcelId);

  if (!parcel) return null;

  return (
    <div className="space-y-4">
      {parcel.farm_id && (
        <div className="flex justify-end">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link
              to="/farms/$farmId/satellite/heatmap"
              params={{ farmId: parcel.farm_id }}
            >
              <Layers className="h-4 w-4" />
              {t('satellite:heatmap.viewWholeFarm', 'View whole farm heatmap')}
            </Link>
          </Button>
        </div>
      )}
      <Suspense fallback={<ContentSkeleton lines={8} className="p-6" />}>
        <IndexImageViewer
          parcelId={parcel.id}
          parcelName={parcel.name}
          farmId={parcel.farm_id ?? undefined}
          boundary={parcel.boundary}
        />
      </Suspense>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite/heatmap')({
  component: HeatmapPage,
});
