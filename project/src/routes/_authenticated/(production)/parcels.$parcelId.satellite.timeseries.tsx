import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { ContentSkeleton } from '@/components/ui/page-skeletons'

const TimeSeriesChart = lazy(() => import('../../../components/SatelliteAnalysisView/TimeSeriesChart'));

const TimeSeriesPage = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel } = useParcelById(parcelId);

  if (!parcel) return null;

  return (
    <Suspense fallback={<ContentSkeleton lines={8} className="p-6" />}>
      <TimeSeriesChart
        parcelId={parcel.id}
        parcelName={parcel.name}
        farmId={parcel.farm_id ?? undefined}
        boundary={parcel.boundary}
        aiPhase={parcel.ai_phase ?? undefined}
      />
    </Suspense>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite/timeseries')({
  component: TimeSeriesPage,
});
