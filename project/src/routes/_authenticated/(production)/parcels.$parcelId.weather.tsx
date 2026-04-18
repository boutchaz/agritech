import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { Cloud } from 'lucide-react'
import { ContentSkeleton } from '@/components/ui/page-skeletons'
import { SectionLoader } from '@/components/ui/loader';


const WeatherAnalyticsView = lazy(() => import('../../../components/WeatherAnalytics/WeatherAnalyticsView'));

const ParcelWeatherPage = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }

  if (!parcel) return null;

  return (
    <div className="space-y-6">
      {parcel.boundary && parcel.boundary.length > 0 ? (
        <Suspense
          fallback={<ContentSkeleton lines={6} className="p-6" />}
        >
          <WeatherAnalyticsView
            parcelId={parcelId}
            parcelBoundary={parcel.boundary}
            parcelName={parcel.name}
            cropType={parcel.planting_type}
            treeType={parcel.tree_type}
            variety={parcel.variety}
          />
        </Suspense>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('weather.noBoundary.title')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('weather.noBoundary.description')}
          </p>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/weather')({
  component: ParcelWeatherPage,
});
