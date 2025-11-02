import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '../hooks/useParcelsQuery'
import { Loader2 } from 'lucide-react'

const ParcelProfitability = lazy(() => import('../components/ParcelProfitability'));

const ParcelProfitabilityPage = () => {
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
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de la rentabilité...</span>
          </div>
        }
      >
        <ParcelProfitability
          parcelId={parcel.id}
          parcelName={parcel.name}
        />
      </Suspense>
    </div>
  );
};

export const Route = createFileRoute('/parcels/$parcelId/profitability')({
  component: ParcelProfitabilityPage,
});
