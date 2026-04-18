import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { ContentSkeleton } from '@/components/ui/page-skeletons'

const IndexImageViewer = lazy(() => import('../../../components/SatelliteAnalysisView/IndexImageViewer'));

const HeatmapPage = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel } = useParcelById(parcelId);

  if (!parcel) return null;

  return (
    <Suspense fallback={<ContentSkeleton lines={8} className="p-6" />}>
      <IndexImageViewer
        parcelId={parcel.id}
        parcelName={parcel.name}
        farmId={parcel.farm_id ?? undefined}
        boundary={parcel.boundary}
      />
    </Suspense>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite/heatmap')({
  component: HeatmapPage,
});
