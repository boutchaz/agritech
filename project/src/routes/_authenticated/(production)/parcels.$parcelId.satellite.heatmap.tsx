import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { useParcelById } from '@/hooks/useParcelsQuery'

const IndexImageViewer = lazy(() => import('../../../components/SatelliteAnalysisView/IndexImageViewer'));

const TabSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const HeatmapPage = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel } = useParcelById(parcelId);

  if (!parcel) return null;

  return (
    <Suspense fallback={<TabSpinner />}>
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
