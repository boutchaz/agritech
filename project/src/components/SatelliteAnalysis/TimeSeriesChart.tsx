import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Check, Database, Satellite, RefreshCw } from 'lucide-react';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  TimeSeriesRequest,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';
import { satelliteIndicesApi } from '../../lib/api/satellite-indices';
import { useAuth } from '../MultiTenantAuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TimeSeriesChartProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
  defaultIndex?: VegetationIndexType;
}

interface MultiIndexData {
  date: string;
  [key: string]: number | string;
}

interface IndexStats {
  mean: number;
  min: number;
  max: number;
  std: number;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  parcelId,
  parcelName,
  farmId,
  boundary,
  defaultIndex = 'NDVI'
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>([defaultIndex]);
  const [interval, setInterval] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showIndexSelector, setShowIndexSelector] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedRef = useRef<Set<string>>(new Set());

  // Initialize with last 6 months
  useEffect(() => {
    const defaultRange = getDateRangeLastNDays(180);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  const getIndexColor = (index: VegetationIndexType): string => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e',
      NDRE: '#10b981',
      NDMI: '#3b82f6',
      MNDWI: '#06b6d4',
      GCI: '#84cc16',
      SAVI: '#eab308',
      OSAVI: '#f59e0b',
      MSAVI2: '#f97316',
      PRI: '#ef4444',
      MSI: '#8b5cf6',
      MCARI: '#ec4899',
      TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  // Query cached data from database
  const {
    data: cachedData,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-indices-cache', parcelId, selectedIndices, startDate, endDate],
    queryFn: async () => {
      if (!organizationId || !parcelId || !startDate || !endDate) return {};

      const result: Record<string, any[]> = {};

      for (const index of selectedIndices) {
        try {
          const response = await satelliteIndicesApi.getAll(
            {
              parcel_id: parcelId,
              index_name: index,
              date_from: startDate,
              date_to: endDate,
            },
            organizationId
          );
          result[index] = response;
        } catch (err) {
          console.warn(`Failed to fetch cached data for ${index}:`, err);
          result[index] = [];
        }
      }

      return result;
    },
    enabled: !!organizationId && !!parcelId && selectedIndices.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-sync: fetch from API and cache if no data exists
  const autoSync = useCallback(async () => {
    if (!boundary || !organizationId || selectedIndices.length === 0 || !startDate || !endDate) return;

    // Check which indices need syncing
    const indicesToSync: VegetationIndexType[] = [];

    for (const index of selectedIndices) {
      const cacheKey = `${parcelId}-${index}-${startDate}-${endDate}`;
      const cachedCount = cachedData?.[index]?.length || 0;

      // Sync if no cached data and not already synced in this session
      if (cachedCount === 0 && !syncedRef.current.has(cacheKey)) {
        indicesToSync.push(index);
        syncedRef.current.add(cacheKey);
      }
    }

    if (indicesToSync.length === 0) return;

    setIsSyncing(true);

    try {
      for (const index of indicesToSync) {
        try {
          const request: TimeSeriesRequest = {
            aoi: {
              geometry: convertBoundaryToGeoJSON(boundary),
              name: parcelName || 'Parcel',
            },
            date_range: {
              start_date: startDate,
              end_date: endDate,
            },
            index,
            interval,
            cloud_coverage: 20,
          };

          const response = await satelliteApi.getTimeSeries(request);

          // Save data points to database
          if (response.data && response.data.length > 0) {
            for (const point of response.data) {
              try {
                await satelliteIndicesApi.create(
                  {
                    parcel_id: parcelId,
                    farm_id: farmId,
                    index_name: index,
                    date: point.date,
                    mean_value: point.value,
                  },
                  organizationId
                );
              } catch {
                // Ignore duplicates (unique constraint will reject them)
              }
            }
          }
        } catch (apiErr) {
          console.error(`Failed to fetch ${index} from satellite API:`, apiErr);
        }
      }

      // Refetch cache to display new data
      await refetchCache();
      queryClient.invalidateQueries({ queryKey: ['satellite-indices-cache', parcelId] });
    } finally {
      setIsSyncing(false);
    }
  }, [boundary, organizationId, selectedIndices, startDate, endDate, interval, parcelId, farmId, parcelName, cachedData, refetchCache, queryClient]);

  // Trigger auto-sync when cache is loaded but empty
  useEffect(() => {
    if (!isLoadingCache && cachedData && boundary) {
      autoSync();
    }
  }, [isLoadingCache, cachedData, boundary, autoSync]);

  // Force sync: always fetch from satellite API (for manual refresh)
  const forceSync = useCallback(async () => {
    if (!boundary || !organizationId || selectedIndices.length === 0 || !startDate || !endDate) return;

    setIsSyncing(true);

    try {
      for (const index of selectedIndices) {
        try {
          const request: TimeSeriesRequest = {
            aoi: {
              geometry: convertBoundaryToGeoJSON(boundary),
              name: parcelName || 'Parcel',
            },
            date_range: {
              start_date: startDate,
              end_date: endDate,
            },
            index,
            interval,
            cloud_coverage: 20,
          };

          const response = await satelliteApi.getTimeSeries(request);

          // Save data points to database (duplicates ignored by unique constraint)
          if (response.data && response.data.length > 0) {
            for (const point of response.data) {
              try {
                await satelliteIndicesApi.create(
                  {
                    parcel_id: parcelId,
                    farm_id: farmId,
                    index_name: index,
                    date: point.date,
                    mean_value: point.value,
                  },
                  organizationId
                );
              } catch {
                // Ignore duplicates
              }
            }
          }
        } catch (apiErr) {
          console.error(`Failed to fetch ${index} from satellite API:`, apiErr);
        }
      }

      // Refetch cache to display new data
      await refetchCache();
      queryClient.invalidateQueries({ queryKey: ['satellite-indices-cache', parcelId] });
    } finally {
      setIsSyncing(false);
    }
  }, [boundary, organizationId, selectedIndices, startDate, endDate, interval, parcelId, farmId, parcelName, refetchCache, queryClient]);

  // Transform data for chart
  const chartData = useCallback((): MultiIndexData[] => {
    const dateMap = new Map<string, MultiIndexData>();

    if (cachedData) {
      for (const index of selectedIndices) {
        const indexData = cachedData[index] || [];
        for (const item of indexData) {
          const date = item.date?.split('T')[0];
          if (date) {
            const existing: MultiIndexData = dateMap.get(date) || { date };
            existing[index] = item.mean_value ?? item.index_value ?? 0;
            dateMap.set(date, existing);
          }
        }
      }
    }

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [cachedData, selectedIndices]);

  const toggleIndex = (index: VegetationIndexType) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        if (prev.length === 1) return prev;
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const formatTooltipValue = (value: number) => {
    return value?.toFixed(3) ?? 'N/A';
  };

  const calculateStatistics = (index: VegetationIndexType): IndexStats | null => {
    const data = chartData();
    const values = data.map(d => d[index] as number).filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);

    return { mean, min, max, std };
  };

  const getTrendIcon = (index: VegetationIndexType) => {
    const data = chartData();
    const values = data.map(d => d[index] as number).filter(v => typeof v === 'number');

    if (values.length < 2) return null;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    if (lastValue > firstValue) {
      return <TrendingUp className="w-3 h-3 text-green-600" />;
    } else if (lastValue < firstValue) {
      return <TrendingDown className="w-3 h-3 text-red-600" />;
    }
    return null;
  };

  const getCacheStats = () => {
    if (!cachedData) return { total: 0, indices: 0 };
    let total = 0;
    let indices = 0;
    for (const index of selectedIndices) {
      const count = cachedData[index]?.length || 0;
      if (count > 0) {
        total += count;
        indices++;
      }
    }
    return { total, indices };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.dataKey}:</span>
              <span>{formatTooltipValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const isLoading = isLoadingCache || isSyncing;
  const data = chartData();
  const cacheStats = getCacheStats();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Vegetation Index Time Series</h2>
        </div>

        {/* Cache indicator (subtle) */}
        {cacheStats.total > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Database className="w-3 h-3" />
            <span>{cacheStats.total} points</span>
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-6">
        Tendances historiques pour {parcelName || `Parcelle ${parcelId}`}
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Multi-select Index Dropdown */}
        <div className="relative">
          <label className="text-sm font-medium mb-2 block">Indices de végétation</label>
          <button
            type="button"
            onClick={() => setShowIndexSelector(!showIndexSelector)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <span className="truncate">
              {selectedIndices.length === 1
                ? selectedIndices[0]
                : `${selectedIndices.length} indices sélectionnés`}
            </span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showIndexSelector && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {VEGETATION_INDICES.map(index => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleIndex(index)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedIndices.includes(index) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}
                  >
                    {selectedIndices.includes(index) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getIndexColor(index) }} />
                  <span>{index}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Intervalle</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as any)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Journalier</option>
            <option value="week">Hebdomadaire</option>
            <option value="month">Mensuel</option>
            <option value="year">Annuel</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Date de début</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Date de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {showIndexSelector && (
        <div className="fixed inset-0 z-10" onClick={() => setShowIndexSelector(false)} />
      )}

      {/* Selected Indices Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedIndices.map(index => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: getIndexColor(index) }}
          >
            {index}
            {getTrendIcon(index)}
            {selectedIndices.length > 1 && (
              <button onClick={() => toggleIndex(index)} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Statistics Table */}
      {data.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Index</th>
                <th className="text-center py-2 px-2">Moyenne</th>
                <th className="text-center py-2 px-2">Min</th>
                <th className="text-center py-2 px-2">Max</th>
                <th className="text-center py-2 px-2">Écart-type</th>
                <th className="text-center py-2 px-2">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {selectedIndices.map(index => {
                const stats = calculateStatistics(index);
                if (!stats) return null;
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getIndexColor(index) }} />
                        <span className="font-medium">{index}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-2">{stats.mean.toFixed(3)}</td>
                    <td className="text-center py-2 px-2">{stats.min.toFixed(3)}</td>
                    <td className="text-center py-2 px-2">{stats.max.toFixed(3)}</td>
                    <td className="text-center py-2 px-2">{stats.std.toFixed(3)}</td>
                    <td className="text-center py-2 px-2">{getTrendIcon(index)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart */}
      <div className="h-96 mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-500">
                {isSyncing ? 'Récupération des données satellite...' : 'Chargement...'}
              </span>
            </div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedIndices.map(index => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={index}
                  name={index}
                  stroke={getIndexColor(index)}
                  strokeWidth={2}
                  dot={{ fill: getIndexColor(index), r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <BarChart3 className="w-12 h-12 mb-2 text-gray-300" />
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        )}
      </div>

      {/* Index Descriptions */}
      {selectedIndices.length > 0 && (
        <div className="space-y-2 mb-6">
          {selectedIndices.map(index => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getIndexColor(index) }}
                >
                  {index}
                </div>
              </div>
              <p className="text-sm text-gray-600">{VEGETATION_INDEX_DESCRIPTIONS[index]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => refetchCache()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingCache ? 'animate-spin' : ''}`} />
          Actualiser le cache
        </button>
        <button
          onClick={forceSync}
          disabled={isLoading || !boundary}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Satellite className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
          {isSyncing ? 'Récupération...' : 'Récupérer depuis satellite'}
        </button>
      </div>
    </div>
  );
};

export default TimeSeriesChart;
