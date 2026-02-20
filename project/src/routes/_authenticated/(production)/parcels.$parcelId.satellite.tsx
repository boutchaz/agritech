import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useCalibrationStatus } from '@/hooks/useAIReports'
import { apiRequest } from '@/lib/api-client'
import { Satellite, CheckCircle2, AlertTriangle, FileText, BarChart3, Map as MapIcon, Database, RefreshCw } from 'lucide-react'

type SatelliteTab = 'timeseries' | 'heatmap';

interface SyncStatus {
  status: 'no_data' | 'partial' | 'synced';
  total_records: number;
  indices: string[];
  date_range: { start: string | null; end: string | null } | null;
}

const ParcelSatelliteLayout = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading } = useParcelById(parcelId);
  const { data: calibrationStatus } = useCalibrationStatus(parcelId);
  const matchRoute = useMatchRoute();

  const { data: syncStatus } = useQuery({
    queryKey: ['satellite-sync-status', parcelId],
    queryFn: async () => {
      try {
        return await apiRequest<SyncStatus>(
          `/api/v1/satellite-proxy/sync/parcel/${parcelId}/status`,
        );
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
    enabled: !!parcelId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!parcel) return null;

  const hasBoundary = parcel.boundary && parcel.boundary.length > 0;

  const isTimeseriesActive = !!matchRoute({ to: '/parcels/$parcelId/satellite/timeseries', params: { parcelId } })
    || !!matchRoute({ to: '/parcels/$parcelId/satellite', params: { parcelId } });
  const isHeatmapActive = !!matchRoute({ to: '/parcels/$parcelId/satellite/heatmap', params: { parcelId } });

  const tabs: { id: SatelliteTab; to: string; label: string; icon: ReactNode; description: string; active: boolean }[] = [
    {
      id: 'timeseries',
      to: `/parcels/${parcelId}/satellite/timeseries`,
      label: t('satellite.tabs.timeseries', 'Time Series'),
      icon: <BarChart3 className="w-4 h-4" />,
      description: t('satellite.tabs.timeseriesDesc', 'Cached historical trends'),
      active: isTimeseriesActive,
    },
    {
      id: 'heatmap',
      to: `/parcels/${parcelId}/satellite/heatmap`,
      label: t('satellite.tabs.heatmap', 'Heatmap Analysis'),
      icon: <MapIcon className="w-4 h-4" />,
      description: t('satellite.tabs.heatmapDesc', 'Interactive spatial visualization'),
      active: isHeatmapActive,
    },
  ];

  return (
    <div className="space-y-6">
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
            search={{ farmId: undefined }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{t('satellite.goToReports', 'Go to Reports')}</span>
          </Link>
        </div>
      )}

      {syncStatus && syncStatus.status !== 'synced' && hasBoundary && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
          syncStatus.status === 'no_data'
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          {syncStatus.status === 'no_data' ? (
            <>
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-300">
                Aucune donnée satellite en cache. La synchronisation initiale est en cours ou peut être lancée via &ldquo;Récupérer depuis satellite&rdquo;.
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300">
                Synchronisation en cours — {syncStatus.total_records} points, {syncStatus.indices.length}/4 indices ({syncStatus.indices.join(', ')})
              </span>
            </>
          )}
        </div>
      )}

      {hasBoundary ? (
        <>
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-1" role="tablist">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  to={tab.to}
                  role="tab"
                  aria-selected={tab.active}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab.active
                      ? 'border-green-600 text-green-700 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 ml-1">
                    — {tab.description}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <Outlet />
        </>
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
  component: ParcelSatelliteLayout,
});
