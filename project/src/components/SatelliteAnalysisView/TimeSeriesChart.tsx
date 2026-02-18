import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, Brush } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, Check, Database, Satellite, RefreshCw, Thermometer, AlertTriangle } from 'lucide-react';
import {
  satelliteApi,
  TimeSeriesIndexType,
  VegetationIndexType,
  TIME_SERIES_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  INDEX_METADATA,
  RELIABILITY_CONFIG,
  TimeSeriesRequest,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';
import { satelliteIndicesApi } from '../../lib/api/satellite-indices';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const WEATHER_API_URL = (import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');

interface TimeSeriesChartProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
  defaultIndex?: TimeSeriesIndexType;
}

interface MultiIndexData {
  date: string;
  temperature_mean?: number;
  temperature_min?: number;
  temperature_max?: number;
  temperature_range?: [number, number];
  [key: string]: string | number | [number, number] | undefined;
}

interface IndexStats {
  mean: number;
  min: number;
  max: number;
  std: number;
}

interface WeatherPoint {
  date: string;
  temperature_min: number;
  temperature_max: number;
  temperature_mean: number;
  precipitation_sum?: number;
  relative_humidity_mean?: number;
  wind_speed_max?: number;
  et0_fao_evapotranspiration?: number;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  parcelId,
  parcelName,
  farmId,
  boundary,
  defaultIndex = 'NIRv'
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<TimeSeriesIndexType[]>([defaultIndex]);
  const [liveSeriesData, setLiveSeriesData] = useState<Record<string, Array<{ date: string; value: number }>>>({});
  const [interval, setInterval] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showIndexSelector, setShowIndexSelector] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTemperature, setShowTemperature] = useState(false);

  // Initialize with last 2 years for calibration across crop cycles
  useEffect(() => {
    const defaultRange = getDateRangeLastNDays(730);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  const getIndexColor = (index: TimeSeriesIndexType): string => {
    const colors: Record<string, string> = {
      NIRv: '#ef4444',
      EVI: '#0ea5e9',
      NDRE: '#10b981',
      NDMI: '#3b82f6',
      NDVI: '#22c55e',
      NIRvP: '#9333ea',
      GCI: '#84cc16',
      SAVI: '#eab308',
      OSAVI: '#f59e0b',
      MSAVI2: '#f97316',
      TCARI_OSAVI: '#d946ef',
      MSI: '#8b5cf6',
      MNDWI: '#06b6d4',
      MCARI: '#ec4899',
      TCARI: '#f43f5e',
    };
    return colors[index] || '#6b7280';
  };

   const getIndexDescription = (index: TimeSeriesIndexType): string => {
     if (index === 'NIRvP') {
       return 'NIRvP — Productivité photosynthétique (NIRv × PAR)';
     }
     if (index === 'TCARI_OSAVI') {
       return 'TCARI/OSAVI — Ratio chlorophylle résistant au LAI';
     }
     return VEGETATION_INDEX_DESCRIPTIONS[index as VegetationIndexType];
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
        if (index === 'NIRvP') {
          result[index] = [];
          continue;
        }

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


  // Incremental sync: only fetch the gap between last cached date and today
  const forceSync = useCallback(async () => {
    if (!boundary || !organizationId || selectedIndices.length === 0 || !startDate || !endDate) return;

    setIsSyncing(true);

    try {
      for (const index of selectedIndices) {
        try {
          // Find the latest cached date for this index to avoid re-fetching everything
          const cachedForIndex = cachedData?.[index] || [];
          let syncStartDate = startDate;

          if (cachedForIndex.length > 0) {
            const dates = cachedForIndex
              .map((item: { date?: string }) => item.date?.split('T')[0])
              .filter(Boolean)
              .sort();
            const latestCached = dates[dates.length - 1];
            if (latestCached && latestCached > startDate) {
              const nextDay = new Date(latestCached);
              nextDay.setDate(nextDay.getDate() + 1);
              syncStartDate = nextDay.toISOString().split('T')[0];
            }
          }

          if (syncStartDate > endDate) continue;

          const request: TimeSeriesRequest = {
            aoi: {
              geometry: convertBoundaryToGeoJSON(boundary),
              name: parcelName || 'Parcel',
            },
            date_range: {
              start_date: syncStartDate,
              end_date: endDate,
            },
            index,
            interval,
            cloud_coverage: 20,
          };

          const response = await satelliteApi.getTimeSeries(request);
          setLiveSeriesData(prev => ({ ...prev, [index]: response.data ?? [] }));

          if (index !== 'NIRvP' && response.data && response.data.length > 0) {
            const batch = response.data
              .filter((point: { date: string; value: number }) => point.value != null)
              .map((point: { date: string; value: number }) => ({
                parcel_id: parcelId,
                farm_id: farmId,
                index_name: index,
                date: point.date,
                mean_value: point.value,
              }));
            if (batch.length > 0) {
              await satelliteIndicesApi.createBulk(batch, organizationId);
            }
          }
        } catch (apiErr) {
          console.error(`Failed to fetch ${index} from satellite API:`, apiErr);
        }
      }

      await refetchCache();
      queryClient.invalidateQueries({ queryKey: ['satellite-indices-cache', parcelId] });
    } finally {
      setIsSyncing(false);
    }
  }, [boundary, organizationId, selectedIndices, startDate, endDate, interval, parcelId, farmId, parcelName, cachedData, refetchCache, queryClient]);

  // Fetch weather data
  const { data: weatherData, isLoading: isLoadingWeather, error: weatherError } = useQuery({
    queryKey: ['weather-history', parcelId, startDate, endDate],
    queryFn: async () => {
      if (!parcelId || !startDate || !endDate) return [];
      
      const response = await fetch(
        `${WEATHER_API_URL}/api/weather/parcel/${parcelId}?start_date=${startDate}&end_date=${endDate}`
      );
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Weather API error ${response.status}: ${text || response.statusText}`);
      }
      
      const json: { data: WeatherPoint[] } = await response.json();
      return json.data || [];
    },
    enabled: showTemperature && !!parcelId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Transform data for chart
  const chartData = useCallback((): MultiIndexData[] => {
    const dateMap = new Map<string, MultiIndexData>();

    for (const index of selectedIndices) {
      const indexData = cachedData?.[index] || [];
      if (indexData.length > 0) {
        for (const item of indexData) {
          const date = item.date?.split('T')[0];
          if (date) {
            const existing: MultiIndexData = dateMap.get(date) || { date };
            existing[index] = item.mean_value ?? item.index_value ?? 0;
            dateMap.set(date, existing);
          }
        }
      } else {
        const liveIndexData = liveSeriesData[index] || [];
        for (const point of liveIndexData) {
          const date = point.date?.split('T')[0];
          if (date) {
            const existing: MultiIndexData = dateMap.get(date) || { date };
            existing[index] = point.value;
            dateMap.set(date, existing);
          }
        }
      }
    }

    // Merge weather data if enabled
    if (showTemperature && weatherData) {
      for (const point of weatherData) {
        const date = point.date?.split('T')[0];
        if (date) {
          const existing: MultiIndexData = dateMap.get(date) || { date };
          existing.temperature_mean = point.temperature_mean;
          existing.temperature_range = [point.temperature_min, point.temperature_max];
          existing.temperature_min = point.temperature_min;
          existing.temperature_max = point.temperature_max;
          dateMap.set(date, existing);
        }
      }
    }

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [cachedData, selectedIndices, liveSeriesData, weatherData, showTemperature]);

  const toggleIndex = (index: TimeSeriesIndexType) => {
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

  const calculateStatistics = (index: TimeSeriesIndexType): IndexStats | null => {
    const data = chartData();
    const values = data.map(d => d[index] as number).filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);

    return { mean, min, max, std };
  };

  const getTrendIcon = (index: TimeSeriesIndexType) => {
    const data = chartData();
    const values = data.map(d => d[index] as number).filter(v => typeof v === 'number');

    if (values.length < 2) return null;

    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    // Calculate percentage change to determine stability
    const percentChange = firstValue !== 0
      ? Math.abs((lastValue - firstValue) / firstValue) * 100
      : Math.abs(lastValue - firstValue) * 100;

    // Consider stable if change is less than 2%
    const STABILITY_THRESHOLD = 2;

    if (percentChange <= STABILITY_THRESHOLD) {
      return <span title="Stable"><Minus className="w-3 h-3 text-yellow-600" /></span>;
    } else if (lastValue > firstValue) {
      return <span title="En hausse"><TrendingUp className="w-3 h-3 text-green-600" /></span>;
    } else {
      return <span title="En baisse"><TrendingDown className="w-3 h-3 text-red-600" /></span>;
    }
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
          {payload.map((entry: any, idx: number) => {
            if (entry.name === 'Temp. Min/Max') return null;
            
            const isTemp = entry.dataKey === 'temperature_mean';
            const value = isTemp 
              ? `${entry.value.toFixed(1)} °C`
              : formatTooltipValue(entry.value);

            return (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    backgroundColor: entry.color,
                    border: isTemp ? '1px dashed #f97316' : undefined 
                  }} 
                />
                <span className="font-medium">{entry.name}:</span>
                <span>{value}</span>
              </div>
            );
          })}
          {payload[0]?.payload?.temperature_min !== undefined && showTemperature && (
            <div className="mt-1 pt-1 border-t border-gray-100 text-xs text-gray-500 flex gap-3">
              <span>Min: {payload[0].payload.temperature_min.toFixed(1)}°C</span>
              <span>Max: {payload[0].payload.temperature_max.toFixed(1)}°C</span>
            </div>
          )}
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

      <p className="text-gray-600 mb-4">
        Tendances historiques pour {parcelName || `Parcelle ${parcelId}`}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { label: '3 mois', days: 90 },
          { label: '6 mois', days: 180 },
          { label: '1 an', days: 365 },
          { label: '2 ans', days: 730 },
        ] as const).map(({ label, days }) => {
          const range = getDateRangeLastNDays(days);
          const isActive = startDate === range.start_date && endDate === range.end_date;
          return (
            <button
              key={days}
              type="button"
              onClick={() => { setStartDate(range.start_date); setEndDate(range.end_date); }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              {(() => {
                // Group indices by reliability
                const groupedIndices = {
                  fiable: [] as TimeSeriesIndexType[],
                  utile: [] as TimeSeriesIndexType[],
                  prudence: [] as TimeSeriesIndexType[],
                  inutile: [] as TimeSeriesIndexType[],
                };

                TIME_SERIES_INDICES.forEach(index => {
                  const meta = INDEX_METADATA[index];
                  if (meta && groupedIndices[meta.reliability]) {
                    groupedIndices[meta.reliability].push(index);
                  } else {
                    // Fallback for unknown reliability
                    groupedIndices.fiable.push(index);
                  }
                });

                const groups = [
                  { key: 'fiable', indices: groupedIndices.fiable },
                  { key: 'utile', indices: groupedIndices.utile },
                  { key: 'prudence', indices: groupedIndices.prudence },
                  { key: 'inutile', indices: groupedIndices.inutile },
                ];

                return groups.map((group, groupIndex) => (
                  <React.Fragment key={group.key}>
                    {groupIndex > 0 && group.indices.length > 0 && (
                      <div className="border-t border-gray-100 my-1 mx-2" />
                    )}
                    {group.indices.map(index => {
                      const meta = INDEX_METADATA[index];
                      const reliability = meta?.reliability ? RELIABILITY_CONFIG[meta.reliability] : null;
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleIndex(index)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        >
                          <div
                            className={`w-4 h-4 min-w-[1rem] rounded border flex items-center justify-center ${
                              selectedIndices.includes(index) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}
                          >
                            {selectedIndices.includes(index) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="w-3 h-3 min-w-[0.75rem] rounded-full" style={{ backgroundColor: getIndexColor(index) }} />
                          <span className="truncate flex-1">
                            {index === 'TCARI_OSAVI' ? 'TCARI/OSAVI' : index}
                          </span>
                          
                          {reliability && (
                            <span 
                              className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${reliability.bgColor} ${reliability.color}`}
                            >
                              {reliability.label}
                            </span>
                          )}
                          
                          {meta?.shortWarning && (
                            <div title={meta.shortWarning}>
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
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

        <div className="flex flex-col justify-end">
           <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 h-[42px]">
             <input
               type="checkbox"
               checked={showTemperature}
               onChange={(e) => setShowTemperature(e.target.checked)}
               className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
             />
             <div className="flex items-center gap-1.5 text-sm text-gray-700">
               {isLoadingWeather ? (
                 <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
               ) : (
                 <Thermometer className="w-4 h-4 text-orange-500" />
               )}
               <span>Afficher T°</span>
             </div>
           </label>
           {weatherError && showTemperature && (
             <p className="text-xs text-red-500 mt-1">
               {(weatherError as Error).message || 'Erreur chargement météo'}
             </p>
           )}
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
              {showTemperature && weatherData && weatherData.length > 0 && (
                <tr className="border-b hover:bg-gray-50 bg-orange-50/30">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="font-medium text-gray-800">Temp. moyenne</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-2">
                    {(weatherData.reduce((acc, curr) => acc + curr.temperature_mean, 0) / weatherData.length).toFixed(1)} °C
                  </td>
                  <td className="text-center py-2 px-2">
                    {Math.min(...weatherData.map(d => d.temperature_min)).toFixed(1)} °C
                  </td>
                  <td className="text-center py-2 px-2">
                    {Math.max(...weatherData.map(d => d.temperature_max)).toFixed(1)} °C
                  </td>
                  <td className="text-center py-2 px-2">-</td>
                  <td className="text-center py-2 px-2">-</td>
                </tr>
              )}
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
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              {showTemperature && (
                 <YAxis 
                   yAxisId="right" 
                   orientation="right" 
                   tick={{ fontSize: 12, fill: '#f97316' }} 
                   unit="°C" 
                   domain={['auto', 'auto']}
                   tickFormatter={(val) => val.toFixed(0)} 
                 />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Brush 
                dataKey="date" 
                height={40} 
                stroke={getIndexColor(selectedIndices[0])}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                }}
                fill="rgba(59, 130, 246, 0.05)"
              >
                <LineChart>
                  <Line
                    type="monotone"
                    dataKey={selectedIndices[0]}
                    stroke={getIndexColor(selectedIndices[0])}
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </Brush>

              {showTemperature && (
                <>
                   <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                   <Area
                     yAxisId="right"
                     type="monotone"
                     dataKey="temperature_range"
                     stroke="none"
                     fill="#f97316"
                     fillOpacity={0.15}
                     name="Temp. Min/Max"
                   />
                   <Line
                     yAxisId="right"
                     type="monotone"
                     dataKey="temperature_mean"
                     name="Temp. Moyenne"
                     stroke="#f97316"
                     strokeWidth={2}
                     strokeDasharray="5 5"
                     dot={false}
                     connectNulls
                   />
                </>
              )}

              {selectedIndices.map(index => (
                <Line
                  yAxisId="left"
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
              <p className="text-sm text-gray-600">{getIndexDescription(index)}</p>
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
