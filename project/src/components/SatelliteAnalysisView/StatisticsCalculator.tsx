import React, { useState, useCallback } from 'react';
import { Download, Cloud, AlertTriangle, CheckCircle, Database, Info, Satellite, RefreshCw, BarChart3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  ParcelStatisticsResponse,
  CloudCoverageCheckResponse,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';
import { satelliteIndicesApi, type SatelliteIndex } from '../../lib/api/satellite-indices';
import { useAuth } from '../../hooks/useAuth';

interface StatisticsCalculatorProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
}

const StatisticsCalculator: React.FC<StatisticsCalculatorProps> = ({
  parcelId,
  parcelName,
  farmId,
  boundary
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NDVI', 'NDRE', 'NDMI']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cloudCoverage, setCloudCoverage] = useState(10);
  const [scale, setScale] = useState(10);
  const [saveTiff, setSaveTiff] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [statisticsResult, setStatisticsResult] = useState<ParcelStatisticsResponse | null>(null);
  const [cloudCoverageInfo, setCloudCoverageInfo] = useState<CloudCoverageCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with last 30 days
  React.useEffect(() => {
    const defaultRange = getDateRangeLastNDays(30);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  // Query cached statistics from database
  const {
    data: cachedStats,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-stats-cache', parcelId, selectedIndices, startDate, endDate],
    queryFn: async (): Promise<SatelliteIndex[]> => {
      if (!organizationId || !parcelId || !startDate || !endDate) return [];

      const allStats: SatelliteIndex[] = [];
      for (const index of selectedIndices) {
        const response = await satelliteIndicesApi.getAll(
          {
            parcel_id: parcelId,
            index_name: index,
            date_from: startDate,
            date_to: endDate,
          },
          organizationId
        );
        // Filter to only include entries with full statistics (mean_value exists)
        const statsWithData = response.filter(item => item.mean_value !== undefined && item.mean_value !== null);
        allStats.push(...statsWithData);
      }
      return allStats;
    },
    enabled: !!organizationId && !!parcelId && selectedIndices.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Build statistics result from cache
  const buildStatsFromCache = useCallback((): ParcelStatisticsResponse | null => {
    if (!cachedStats || cachedStats.length === 0) return null;

    const statistics: Record<string, any> = {};
    for (const item of cachedStats) {
      if (!statistics[item.index_name]) {
        statistics[item.index_name] = {
          mean: item.mean_value || 0,
          min: item.min_value || 0,
          max: item.max_value || 0,
          std: item.std_value || 0,
          median: item.median_value || 0,
          percentile_25: item.percentile_25 || 0,
          percentile_75: item.percentile_75 || 0,
          percentile_90: item.percentile_90 || 0,
          pixel_count: item.pixel_count || 0,
        };
      }
    }

    // Get the most recent date from cached stats
    const mostRecentDate = cachedStats.reduce((latest, item) => {
      const itemDate = new Date(item.date);
      return itemDate > new Date(latest) ? item.date : latest;
    }, cachedStats[0].date);

    return {
      parcel_id: parcelId,
      statistics,
      cloud_coverage_info: {
        threshold_used: cloudCoverage,
        images_found: cachedStats.length,
        avg_cloud_coverage: cachedStats[0]?.cloud_coverage_percentage || 0,
        best_date: mostRecentDate?.split('T')[0] || startDate,
      },
      metadata: {
        date_range: { start_date: startDate, end_date: endDate },
        processing_date: cachedStats[0]?.created_at || new Date().toISOString(),
        scale,
      },
    };
  }, [cachedStats, parcelId, cloudCoverage, startDate, endDate, scale]);

  // Get display statistics: prefer cached, fall back to API result
  const getDisplayStats = useCallback((): ParcelStatisticsResponse | null => {
    const fromCache = buildStatsFromCache();
    if (fromCache && Object.keys(fromCache.statistics).length > 0) {
      return fromCache;
    }
    return statisticsResult;
  }, [buildStatsFromCache, statisticsResult]);

  const getCacheStats = () => {
    const cached = cachedStats || [];
    const uniqueIndices = new Set(cached.map(s => s.index_name));
    return { total: cached.length, indices: uniqueIndices.size, fromCache: cached.length > 0 };
  };

  const handleIndexToggle = (index: VegetationIndexType) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const checkCloudCoverage = useCallback(async () => {
    if (!boundary || !startDate || !endDate) return;

    setIsCheckingCloud(true);
    setError(null);

    try {
      const result = await satelliteApi.checkCloudCoverage({
        geometry: convertBoundaryToGeoJSON(boundary),
        date_range: { start_date: startDate, end_date: endDate },
        max_cloud_coverage: cloudCoverage,
      });

      setCloudCoverageInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check cloud coverage');
    } finally {
      setIsCheckingCloud(false);
    }
  }, [boundary, startDate, endDate, cloudCoverage]);

  const calculateStatistics = useCallback(async () => {
    if (!boundary || !startDate || !endDate || selectedIndices.length === 0 || !organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the existing statistics endpoint instead of the non-existent parcel-statistics endpoint
      const statisticsRequest = {
        aoi: {
          geometry: convertBoundaryToGeoJSON(boundary),
          name: parcelName || 'Selected Parcel'
        },
        date_range: { start_date: startDate, end_date: endDate },
        indices: selectedIndices,
        cloud_coverage: cloudCoverage,
        scale
      };

      const result = await satelliteApi.request('/analysis/statistics', {
        method: 'POST',
        body: JSON.stringify(statisticsRequest),
      });

      // Transform the result to match our expected format
      const formattedResult: ParcelStatisticsResponse = {
        parcel_id: parcelId,
        statistics: {},
        cloud_coverage_info: {
          threshold_used: cloudCoverage,
          images_found: 1,
          avg_cloud_coverage: cloudCoverage,
          best_date: startDate
        },
        metadata: {
          date_range: { start_date: startDate, end_date: endDate },
          processing_date: new Date().toISOString(),
          scale
        }
      };

      // Transform statistics to our expected format and save to cache
      for (const [index, stats] of Object.entries(result.statistics || {})) {
        const typedStats = stats as any;
        formattedResult.statistics[index as VegetationIndexType] = {
          mean: typedStats.mean || 0,
          min: typedStats.min || 0,
          max: typedStats.max || 0,
          std: typedStats.std || 0,
          median: typedStats.median || 0,
          percentile_25: typedStats.p25 || 0,
          percentile_75: typedStats.p75 || 0,
          percentile_90: typedStats.p98 || 0,
          pixel_count: typedStats.pixel_count || 1000
        };

        // Save to database cache
        try {
          await satelliteIndicesApi.create(
            {
              parcel_id: parcelId,
              farm_id: farmId,
              index_name: index,
              date: startDate,
              mean_value: typedStats.mean || 0,
              min_value: typedStats.min || 0,
              max_value: typedStats.max || 0,
              std_value: typedStats.std || 0,
              median_value: typedStats.median || 0,
              percentile_25: typedStats.p25 || 0,
              percentile_75: typedStats.p75 || 0,
              percentile_90: typedStats.p98 || 0,
              pixel_count: typedStats.pixel_count || 1000,
              cloud_coverage_percentage: cloudCoverage,
              metadata: { scale, source: 'statistics_calculator' },
            },
            organizationId
          );
        } catch {
          // Ignore duplicates
        }
      }

      // Refetch cache
      await refetchCache();
      queryClient.invalidateQueries({ queryKey: ['satellite-stats-cache', parcelId] });

      setStatisticsResult(formattedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate statistics');
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelId, parcelName, farmId, startDate, endDate, selectedIndices, cloudCoverage, scale, organizationId, refetchCache, queryClient]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      NIRv: '#ef4444', EVI: '#0ea5e9', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  const downloadTiff = (index: VegetationIndexType, url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${parcelName || parcelId}_${index}_${startDate}_${endDate}.tif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Statistics Calculator & TIFF Export</h2>
      </div>

      <p className="text-gray-600">
        Calculate comprehensive vegetation statistics for {parcelName || `Parcel ${parcelId}`}
        with cloud coverage optimization and optional TIFF file export.
      </p>

      {/* Configuration Panel */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Max Cloud Coverage (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={cloudCoverage}
              onChange={(e) => setCloudCoverage(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Scale (meters/pixel)</label>
            <select
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value={10}>10m (High detail)</option>
              <option value={20}>20m (Standard)</option>
              <option value={30}>30m (Fast processing)</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={saveTiff}
                onChange={(e) => setSaveTiff(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Export TIFF files</span>
            </label>
          </div>
        </div>

        {/* Index Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Vegetation Indices</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VEGETATION_INDICES.map(index => (
              <label key={index} className="flex items-center p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(index)}
                  onChange={() => handleIndexToggle(index)}
                  className="mr-2"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: getIndexColor(index) }}
                >
                  {index}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-center">
          {/* Cache indicator */}
          {getCacheStats().fromCache && (
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <Database className="w-3 h-3" />
              <span>{getCacheStats().indices} indices en cache</span>
            </div>
          )}

          <button
            onClick={checkCloudCoverage}
            disabled={isCheckingCloud || !boundary}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            <Cloud className="w-4 h-4" />
            {isCheckingCloud ? 'Vérification...' : 'Vérifier couverture nuageuse'}
          </button>

          <button
            onClick={() => refetchCache()}
            disabled={isLoadingCache}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCache ? 'animate-spin' : ''}`} />
            Actualiser le cache
          </button>

          <button
            onClick={calculateStatistics}
            disabled={isLoading || !boundary || selectedIndices.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Satellite className="w-4 h-4" />
            {isLoading ? 'Calcul en cours...' : 'Récupérer depuis satellite'}
          </button>
        </div>
      </div>

      {/* Cloud Coverage Results */}
      {cloudCoverageInfo && (
        <div className={`p-4 rounded-lg ${
          cloudCoverageInfo.has_suitable_images ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {cloudCoverageInfo.has_suitable_images ?
              <CheckCircle className="w-5 h-5 text-green-600" /> :
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            }
            <h3 className="font-medium">Cloud Coverage Analysis</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Available Images:</span>
              <div className="font-medium">{cloudCoverageInfo.available_images_count}</div>
            </div>
            <div>
              <span className="text-gray-600">Suitable Images:</span>
              <div className="font-medium">{cloudCoverageInfo.suitable_images_count || 0}</div>
            </div>
            <div>
              <span className="text-gray-600">Avg Cloud Coverage:</span>
              <div className="font-medium">
                {cloudCoverageInfo.avg_cloud_coverage ? `${cloudCoverageInfo.avg_cloud_coverage.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Best Date:</span>
              <div className="font-medium">{cloudCoverageInfo.recommended_date || 'None'}</div>
            </div>
          </div>

          {!cloudCoverageInfo.has_suitable_images && (
            <div className="mt-3 p-3 bg-yellow-100 rounded text-sm">
              <strong>Recommendation:</strong> Try increasing the cloud coverage threshold or expanding the date range.
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Statistics Results */}
      {getDisplayStats() && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            {getCacheStats().fromCache ? 'Statistiques (depuis cache)' : 'Résultats des statistiques'}
          </h3>

          {/* Cloud Coverage Info */}
          {(() => {
            const displayStats = getDisplayStats();
            if (!displayStats) return null;
            return (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Images utilisées:</span>
                      <div className="font-medium">{displayStats.cloud_coverage_info.images_found}</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Couverture nuageuse moy.:</span>
                      <div className="font-medium">{displayStats.cloud_coverage_info.avg_cloud_coverage.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Meilleure date:</span>
                      <div className="font-medium">{displayStats.cloud_coverage_info.best_date}</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Échelle utilisée:</span>
                      <div className="font-medium">{displayStats.metadata.scale}m</div>
                    </div>
                  </div>
                </div>

                {/* Statistics for each index */}
                <div className="grid gap-4">
                  {Object.entries(displayStats.statistics).map(([index, stats]) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium" style={{ color: getIndexColor(index as VegetationIndexType) }}>
                            {index}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {VEGETATION_INDEX_DESCRIPTIONS[index as VegetationIndexType]}
                          </p>
                        </div>
                        {displayStats.tiff_files?.[index as VegetationIndexType] && (
                          <button
                            onClick={() => downloadTiff(
                              index as VegetationIndexType,
                              displayStats.tiff_files![index as VegetationIndexType].url
                            )}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                          >
                            <Download className="w-3 h-3" />
                            Télécharger TIFF
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Moyenne</div>
                          <div className="font-medium">{stats.mean.toFixed(3)}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Min</div>
                          <div className="font-medium">{stats.min.toFixed(3)}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Max</div>
                          <div className="font-medium">{stats.max.toFixed(3)}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Écart-type</div>
                          <div className="font-medium">{stats.std.toFixed(3)}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Médiane</div>
                          <div className="font-medium">{stats.median.toFixed(3)}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">Pixels</div>
                          <div className="font-medium">{stats.pixel_count.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TIFF Files Summary */}
                {displayStats.tiff_files && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Fichiers TIFF générés</h4>
                    <div className="text-sm text-green-700">
                      {Object.keys(displayStats.tiff_files).length} fichiers TIFF créés et stockés dans la base de données.
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-800">Processing Information</span>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Lower cloud coverage thresholds improve data quality but may reduce available images</p>
          <p>• Higher scale values process faster but with less spatial detail</p>
          <p>• TIFF files are stored securely and can be downloaded for GIS analysis</p>
          <p>• Statistics are calculated using only cloud-free pixels for accuracy</p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCalculator;
