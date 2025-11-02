import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '../hooks/useParcelsQuery'
import { Cloud, Loader2 } from 'lucide-react'

const WeatherAnalyticsView = lazy(() => import('../components/WeatherAnalytics/WeatherAnalyticsView'));

const ParcelWeatherPage = () => {
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
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des analyses météo...</span>
            </div>
          }
        >
          <WeatherAnalyticsView
            parcelBoundary={parcel.boundary}
            parcelName={parcel.name}
          />
        </Suspense>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Les données de localisation de la parcelle sont requises pour l'analyse météorologique.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Veuillez définir les limites de la parcelle pour accéder aux analyses météo & climatiques.
          </p>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/parcels/$parcelId/weather')({
  component: ParcelWeatherPage,
});
