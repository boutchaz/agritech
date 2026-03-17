import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionLoader } from '@/components/ui/loader'

const ParcelProfitability = lazy(() => import('../../../components/ParcelProfitability'));

const ParcelProfitabilityPage = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);

  if (isLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  if (!parcel) return null;

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">{t('profitability.loading')}</span>
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

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/profitability')({
  component: ParcelProfitabilityPage,
});
