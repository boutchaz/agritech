import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { ContentSkeleton } from '@/components/ui/page-skeletons'
import { SectionLoader } from '@/components/ui/loader';


const ParcelReportGenerator = lazy(() => import('../../../components/ParcelReportGenerator'));

const ParcelReportsPage = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const search = Route.useSearch();
  const { data: parcel, isLoading } = useParcelById(parcelId);

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }

  if (!parcel) return null;

  return (
    <div className="space-y-6">
      <Suspense
        fallback={<ContentSkeleton lines={6} className="p-6" />}
      >
        <ParcelReportGenerator
          parcelId={parcel.id}
          parcelName={parcel.name}
          parcelData={parcel}
          searchParams={search}
        />
      </Suspense>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/reports')({
  component: ParcelReportsPage,
});
