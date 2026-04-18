import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useTranslation } from 'react-i18next'
import { SectionLoader } from '@/components/ui/loader'
import { ContentSkeleton } from '@/components/ui/page-skeletons'

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
        fallback={<ContentSkeleton lines={8} className="p-6" />}
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
