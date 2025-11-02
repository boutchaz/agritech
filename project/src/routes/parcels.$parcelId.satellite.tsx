import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '../hooks/useParcelsQuery'
import { Satellite, Loader2 } from 'lucide-react'

const IndexImageViewer = lazy(() => import('../components/SatelliteAnalysis/IndexImageViewer'));
const StatisticsCalculator = lazy(() => import('../components/SatelliteAnalysis/StatisticsCalculator'));
const IndicesCalculator = lazy(() => import('../components/SatelliteAnalysis/IndicesCalculator'));
const TimeSeriesChart = lazy(() => import('../components/SatelliteAnalysis/TimeSeriesChart'));

const ParcelSatellite = () => {
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!parcel) return null;

  return (
    <div className="space-y-6">
      {parcel.boundary && parcel.boundary.length > 0 ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de l'analyse satellite...</span>
            </div>
          }
        >
          <IndexImageViewer
            parcelId={parcel.id}
            parcelName={parcel.name}
            boundary={parcel.boundary}
          />
          <StatisticsCalculator
            parcelId={parcel.id}
            parcelName={parcel.name}
            boundary={parcel.boundary}
          />
          <IndicesCalculator
            parcelId={parcel.id}
            parcelName={parcel.name}
            boundary={parcel.boundary}
          />
          <TimeSeriesChart
            parcelId={parcel.id}
            parcelName={parcel.name}
            boundary={parcel.boundary}
          />
        </Suspense>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Satellite className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Les données de délimitation de la parcelle sont requises pour l'analyse satellite.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Veuillez définir les limites de la parcelle pour accéder aux fonctionnalités d'imagerie satellite.
          </p>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/parcels/$parcelId/satellite')({
  component: ParcelSatellite,
});
