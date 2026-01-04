import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useParcelById } from '@/hooks/useParcelsQuery'
import { useLatestSatelliteIndices, calculateHealthStatus, calculateIrrigationIndex } from '@/hooks/useLatestSatelliteIndices'
import { Droplets, TrendingUp, Satellite, RefreshCw, AlertCircle } from 'lucide-react'

const ParcelOverview = () => {
  const { t } = useTranslation();
  const { parcelId } = Route.useParams();
  const { data: parcel, isLoading: isLoadingParcel } = useParcelById(parcelId);
  const { data: indices, isLoading: isLoadingIndices, refetch: refetchIndices } = useLatestSatelliteIndices(parcelId);

  const isLoading = isLoadingParcel || isLoadingIndices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
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
                {t('farmHierarchy.parcel.detail.overview.noSatelliteData')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('farmHierarchy.parcel.detail.overview.noSatelliteDataDesc')}
              </p>
              <Link
                to={`/parcels/${parcelId}/satellite`}
                className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline"
              >
                <Satellite className="h-4 w-4" />
                {t('farmHierarchy.parcel.detail.overview.goToSatellite')}
              </Link>
            </div>
            <button
              onClick={() => refetchIndices()}
              className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Parcel Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('farmHierarchy.parcel.detail.overview.irrigationIndex')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.irrigation !== null ? `${data.irrigation}%` : '--'}
          </div>
          {data.irrigation === null && (
            <p className="text-xs text-gray-500 mt-1">{t('farmHierarchy.parcel.detail.overview.basedOnNdmi')}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('farmHierarchy.parcel.detail.overview.expectedYield')}
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
              {t('farmHierarchy.parcel.detail.overview.ndvi')}
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
              {t('farmHierarchy.parcel.detail.overview.updatedOn')} {data.lastUpdate}
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
              {t('farmHierarchy.parcel.detail.overview.vegetationHealth')}
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
        <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('farmHierarchy.parcel.detail.overview.summary')}</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.area')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {parcel.calculated_area || parcel.area ? `${parcel.calculated_area || parcel.area} ha` : t('farmHierarchy.parcel.detail.overview.notDefined')}
            </span>
          </div>
          {parcel.soil_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.soilType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.soil_type}</span>
            </div>
          )}
          {parcel.irrigation_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.irrigation')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.irrigation_type}</span>
            </div>
          )}
          {parcel.tree_type && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.treeType')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.tree_type}</span>
            </div>
          )}
          {parcel.variety && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.variety')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.variety}</span>
            </div>
          )}
          {parcel.planting_year && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.plantingYear')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{parcel.planting_year}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.parcel.detail.overview.lastUpdate')}:</span>
            <span className="font-medium text-gray-900 dark:text-white">{data.lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Parcel Description */}
      {parcel.description && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('farmHierarchy.parcel.detail.overview.description')}</h4>
          <p className="text-gray-600 dark:text-gray-400">{parcel.description}</p>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/')({
  component: ParcelOverview,
});
