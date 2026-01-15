import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useCalibrationStatus } from '@/hooks/useAIReports'
import { Satellite, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

const IndexImageViewer = lazy(() => import('../../../components/SatelliteAnalysisView/IndexImageViewer'));
const StatisticsCalculator = lazy(() => import('../../../components/SatelliteAnalysisView/StatisticsCalculator'));
const IndicesCalculator = lazy(() => import('../../../components/SatelliteAnalysisView/IndicesCalculator'));
const TimeSeriesChart = lazy(() => import('../../../components/SatelliteAnalysisView/TimeSeriesChart'));

const ParcelSatellite = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const { data: calibrationStatus } = useCalibrationStatus(parcelId);

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
      {/* Calibration Summary Banner */}
      {calibrationStatus && (
        <div className={`flex items-center justify-between p-4 rounded-lg border ${
          calibrationStatus.status === 'ready'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center gap-3">
            {calibrationStatus.status === 'ready' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('satellite.calibrationStatus', 'AI Report Calibration')}: {calibrationStatus.accuracy}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {calibrationStatus.status === 'ready'
                  ? t('satellite.readyForReport', 'Ready to generate AI report')
                  : t('satellite.needMoreData', 'More data needed for accurate analysis')
                }
              </p>
            </div>
          </div>
          <Link
            to="/parcels/$parcelId/reports"
            params={{ parcelId }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{t('satellite.goToReports', 'Go to Reports')}</span>
          </Link>
        </div>
      )}

      {parcel.boundary && parcel.boundary.length > 0 ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">{t('satellite.loading')}</span>
            </div>
          }
        >
          <IndexImageViewer
            parcelId={parcel.id}
            parcelName={parcel.name}
            farmId={parcel.farm_id || undefined}
            boundary={parcel.boundary}
          />
          <StatisticsCalculator
            parcelId={parcel.id}
            parcelName={parcel.name}
            farmId={parcel.farm_id || undefined}
            boundary={parcel.boundary}
          />
          <IndicesCalculator
            parcelId={parcel.id}
            parcelName={parcel.name}
            farmId={parcel.farm_id || undefined}
            boundary={parcel.boundary}
          />
          <TimeSeriesChart
            parcelId={parcel.id}
            parcelName={parcel.name}
            farmId={parcel.farm_id}
            boundary={parcel.boundary}
          />
        </Suspense>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Satellite className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('satellite.noBoundary.title')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            {t('satellite.noBoundary.description')}
          </p>
          <a
            href={`/parcels?farmId=${parcel.farm_id}`}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {t('satellite.noBoundary.defineButton')}
          </a>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite')({
  component: ParcelSatellite,
});
