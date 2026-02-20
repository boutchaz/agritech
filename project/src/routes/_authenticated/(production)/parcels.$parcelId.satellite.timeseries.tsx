import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import { useParcelById } from '@/hooks/useParcelsQuery'

const TimeSeriesChart = lazy(() => import('../../../components/SatelliteAnalysisView/TimeSeriesChart'));

const TabSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const TimeSeriesPage = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel } = useParcelById(parcelId);

  if (!parcel) return null;

  return (
    <Suspense fallback={<TabSpinner />}>
      <TimeSeriesChart
        parcelId={parcel.id}
        parcelName={parcel.name}
        farmId={parcel.farm_id ?? undefined}
        boundary={parcel.boundary}
      />
    </Suspense>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite/timeseries')({
  component: TimeSeriesPage,
});
