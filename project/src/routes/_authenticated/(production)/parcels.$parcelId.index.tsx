import { calculateHealthStatus, calculateIrrigationIndex, useLatestSatelliteIndices } from '@/hooks/useLatestSatelliteIndices'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Circle, Clock, Droplets, RefreshCw, Satellite, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'

const ParcelOverview = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { organizationId } = useAuth();
  const { data: parcel, isLoading: isLoadingParcel } = useParcelById(parcelId);
  const { data: indices, isLoading: _isLoadingIndices, refetch: refetchIndices } = useLatestSatelliteIndices(parcelId);
  
  // Memoize filters to prevent unnecessary refetches
  const parcelFilters = useMemo(() => ({ parcel_id: parcelId }), [parcelId]);
  const { data: parcelTasks, isLoading: isLoadingTasks } = useTasks(organizationId || '', parcelFilters);

  // Only block on parcel data — satellite indices are supplementary and load asynchronously
  if (isLoadingParcel) {
    return <DetailPageSkeleton />;
  }

  if (!parcel) return null;

  // Calculate derived values from real satellite data
  const ndviValue = indices?.ndvi;
  const irrigationIndex = calculateIrrigationIndex(indices?.ndmi ?? null);
  const healthStatus = calculateHealthStatus(ndviValue ?? null);

  // Format NDVI for display
  const formatNdvi = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(2);
  };

  // Check if we have satellite data
  const hasSatelliteData = indices?.ndvi !== null || indices?.ndmi !== null;

  const data = {
    irrigation: irrigationIndex,
    yield: 12.5, // This would come from production intelligence module
    ndvi: ndviValue,
    health: healthStatus.status,
    healthColor: healthStatus.color,
    lastUpdate: indices?.lastUpdate
      ? new Date(indices.lastUpdate).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR')
  };

  return (
    <div className="space-y-6">
      {/* No Satellite Data Banner */}
      {!hasSatelliteData && parcel.boundary && parcel.boundary.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('parcels.index.noSatelliteData')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('parcels.index.noSatelliteDataDesc')}
              </p>
              <Link
                to={`/parcels/${parcelId}/satellite`}
                className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline"
              >
                <Satellite className="h-4 w-4" />
                {t('parcels.index.goToSatellite')}
              </Link>
            </div>
            <Button
              onClick={() => refetchIndices()}
              className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
              title={t('parcels.index.refreshData')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Parcel Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.irrigationIndex')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.irrigation !== null ? `${data.irrigation}%` : '--'}
          </div>
          {data.irrigation === null && (
            <p className="text-xs text-gray-500 mt-1">{t('parcels.index.basedOnNdmi')}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.expectedYield')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.yield} t/ha
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Satellite className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.ndvi')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNdvi(data.ndvi)}
          </div>
          {data.ndvi !== null && data.ndvi !== undefined && (
            <div className="mt-1">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, ((data.ndvi + 1) / 2) * 100))}%` }}
                />
              </div>
            </div>
          )}
          {indices?.lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              {t('parcels.index.updatedOn')} {data.lastUpdate}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${
              data.health === 'Excellente' ? 'bg-green-500' :
              data.health === 'Bonne' ? 'bg-green-400' :
              data.health === 'Moyenne' ? 'bg-yellow-500' :
              data.health === 'Faible' ? 'bg-orange-500' :
              data.health === 'Critique' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('parcels.index.vegetationHealth')}
            </span>
          </div>
          <div className={`text-lg font-medium ${data.healthColor}`}>
            {data.health}
          </div>
          <p className="text-xs text-gray-500 mt-1">{healthStatus.description}</p>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('parcels.index.summary')}</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.area')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {parcel.calculated_area || parcel.area ? `${parcel.calculated_area || parcel.area} ha` : t('parcels.index.notDefined')}
            </span>
          </div>
          {parcel.soil_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.soilType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.soil_type}</span>
            </div>
          )}
          {parcel.irrigation_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.irrigation')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.irrigation_type}</span>
            </div>
          )}
          {parcel.tree_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.treeType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.tree_type}</span>
            </div>
          )}
          {parcel.variety && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.variety')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.variety}</span>
            </div>
          )}
          {parcel.planting_year && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.plantingYear')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.planting_year}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">{t('parcels.index.lastUpdate')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">{data.lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Parcel Description */}
      {parcel.description && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('parcels.index.description')}</h4>
          <p className="text-gray-600 dark:text-gray-400">{parcel.description}</p>
        </div>
      )}

      {/* Tasks History */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Historique des tâches</h4>
          </div>
          {parcelTasks && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {parcelTasks.length} tâche{parcelTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoadingTasks ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : parcelTasks && parcelTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tâche</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priorité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                {parcelTasks.map((task) => {
                  const statusIcon =
                    task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                    task.status === 'in_progress' ? <Clock className="h-4 w-4 text-blue-500" /> :
                    <Circle className="h-4 w-4 text-gray-400" />;
                  const statusLabel =
                    task.status === 'completed' ? 'Terminée' :
                    task.status === 'in_progress' ? 'En cours' :
                    task.status === 'cancelled' ? 'Annulée' : 'Planifiée';
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.scheduled_start
                          ? new Date(task.scheduled_start).toLocaleDateString('fr-FR')
                          : task.due_date
                            ? new Date(task.due_date).toLocaleDateString('fr-FR')
                            : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium max-w-xs">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {task.task_type || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {task.priority === 'urgent' ? 'Urgent' : task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1.5">
                          {statusIcon}
                          <span className={
                            task.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            task.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                            task.status === 'cancelled' ? 'text-red-500 dark:text-red-400' :
                            'text-gray-500 dark:text-gray-400'
                          }>{statusLabel}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune tâche liée à cette parcelle</p>
          </div>
        )}
      </div>

    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/')({
  component: ParcelOverview,
});
