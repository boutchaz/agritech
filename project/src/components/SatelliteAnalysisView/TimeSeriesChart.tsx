import {  useState, useEffect, useCallback, useMemo, useRef  } from "react";
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Brush,
  Area,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Check, 
  Satellite, 
  RefreshCw, 
  Thermometer, 
  AlertTriangle,
  Calendar as CalendarIcon,
  Layers,
  Info,
  Zap
} from 'lucide-react';
import {
  satelliteApi,
  TimeSeriesIndexType,
  VegetationIndexType,
  TIME_SERIES_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays,
  DEFAULT_CLOUD_COVERAGE
} from '../../lib/satellite-api';
import { satelliteIndicesApi, type SatelliteIndex } from '../../lib/api/satellite-indices';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/ui/loader';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
const formatTooltipValue = (value: number) => {
  return value?.toFixed(3) ?? 'N/A';
};

/** YYYY-MM-DD in the user's local calendar (avoids UTC-only "today" cutting off local acquisitions). */
function localCalendarISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

 
const CustomTooltip = ({ active, payload, label, showTemperature }: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value: number; color?: string }>;
  label?: string;
  showTemperature?: boolean;
}) => {
  if (active && payload && payload.length) {
    return (
      <Card className="shadow-xl border-slate-200 min-w-[200px] overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
          <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            {label}
          </span>
        </div>
        <CardContent className="p-3 space-y-2">
          {payload.map((entry) => {
            const isTemp = typeof entry.dataKey === 'string' && entry.dataKey.startsWith('temperature_');
            if (isTemp && !showTemperature) return null;
            
            const value = isTemp 
              ? `${entry.value.toFixed(1)} °C`
              : formatTooltipValue(entry.value);

            return (
              <div key={entry.dataKey ?? entry.name} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full shadow-sm" 
                    style={{ 
                      backgroundColor: entry.color,
                      border: isTemp ? '1px dashed #f97316' : 'none' 
                    }} 
                  />
                  <span className="text-slate-500 font-medium truncate max-w-[120px]">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800 tabular-nums">{value}</span>
              </div>
            );
          })}
          
          {payload[0]?.payload?.temperature_min !== undefined && showTemperature && (
            <>
              <Separator className="my-1.5 opacity-50" />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  Min <span className="text-slate-600">{payload[0].payload.temperature_min.toFixed(1)}°C</span>
                </span>
                <span className="flex items-center gap-1">
                  Max <span className="text-slate-600">{payload[0].payload.temperature_max.toFixed(1)}°C</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
  return null;
};

interface TimeSeriesChartProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
  defaultIndex?: TimeSeriesIndexType;
  aiPhase?: string;
}

interface MultiIndexData {
  date: string;
  temperature_mean?: number;
  temperature_min?: number;
  temperature_max?: number;
  [key: string]: string | number | undefined;
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

const TimeSeriesChart = ({
  parcelId,
  parcelName,
  farmId,
  boundary,
  defaultIndex = 'NIRv',
  aiPhase,
}: TimeSeriesChartProps) => {
  const { currentOrganization } = useAuth();
  const { t } = useTranslation('satellite');
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<TimeSeriesIndexType[]>([defaultIndex]);
  const cloudCoverage = DEFAULT_CLOUD_COVERAGE;
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const DATE_RANGE_STORAGE_KEY = `timeseries-date-range-${parcelId}`;

  const [startDate, setStartDate] = useState(() => {
    try {
      const persisted = localStorage.getItem(DATE_RANGE_STORAGE_KEY);
      if (persisted) {
        const { start } = JSON.parse(persisted);
        const parsedStart = new Date(start);
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        if (parsedStart >= fiveYearsAgo) return start;
      }
    } catch {
      void 0;
    }
    return getDateRangeLastNDays(90).start_date;
  });
  const [endDate, setEndDate] = useState(() => localCalendarISODate());

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    totalIndices: number;
    completedIndices: number;
    currentIndex: string | null;
  } | null>(null);
  const [showTemperature, setShowTemperature] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const triggerFullSync = useCallback(async () => {
    if (!organizationId || isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      const result = await apiRequest<{ status: string; message: string }>(`/api/v1/parcels/${parcelId}/sync-and-calibrate`, {
        method: 'POST',
      }, organizationId);
      if (result.status === 'started') {
        toast.success(t('timeSeries.calibration.syncStarted', 'Satellite sync started. Calibration will follow automatically.'));
      } else {
        toast.warning(result.message || t('timeSeries.calibration.syncSkipped', 'Sync was skipped.'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to trigger full sync:', message);
      toast.error(message);
    }
    setIsSyncingAll(false);
  }, [organizationId, parcelId, isSyncingAll, t]);

  useEffect(() => {
    if (startDate) {
      try {
        localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({ start: startDate }));
      } catch {
        void 0;
      }
    }
  }, [startDate, DATE_RANGE_STORAGE_KEY]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Heatmap uses live available-dates + engine; timeseries reads cached rows. Extend end date to the
  // latest stored acquisition so newer synced dates are not excluded when "today" lags the catalog.
  useEffect(() => {
    if (!organizationId || !parcelId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await satelliteIndicesApi.getAll(
          { parcel_id: parcelId, page: 1, limit: 1 },
          organizationId,
        );
        const latest = rows[0]?.date?.split('T')[0];
        if (cancelled || !latest) return;
        setEndDate((prev) => (latest > prev ? latest : prev));
      } catch {
        /* ignore — chart still works with current end date */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, parcelId]);

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
    return colors[index] || '#64748b';
  };

  const getIndexDescription = (index: TimeSeriesIndexType): string => {
    if (index === 'NIRvP') return t('timeSeries.indexDescriptions.NIRvP');
    if (index === 'TCARI_OSAVI') return t('timeSeries.indexDescriptions.TCARI_OSAVI');
    return VEGETATION_INDEX_DESCRIPTIONS[index as VegetationIndexType];
  };

  const {
    data: cachedData,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-indices-cache', parcelId, selectedIndices, startDate, endDate],
    queryFn: async () => {
      if (!organizationId || !parcelId || !startDate || !endDate) return {};
      const result: Record<string, (SatelliteIndex | { date: string; index_value: number; mean_value: number })[]> = {};
      const derivedIndices = ['NIRvP', 'TCARI_OSAVI'];
      const cachedIndices = selectedIndices.filter(i => !derivedIndices.includes(i));
      const onDemandIndices = selectedIndices.filter(i => derivedIndices.includes(i));

      for (const index of cachedIndices) {
        try {
          const response = await satelliteIndicesApi.getAll({
            parcel_id: parcelId,
            index_name: index,
            date_from: startDate,
            date_to: endDate,
          }, organizationId);
          result[index] = response;
        } catch (_err) { result[index] = []; }
      }

      if (onDemandIndices.length > 0 && boundary) {
        const aoi = { geometry: convertBoundaryToGeoJSON(boundary), name: parcelName || 'Parcel' };
        for (const index of onDemandIndices) {
          try {
            const response = await satelliteApi.getTimeSeries({
              aoi,
              date_range: { start_date: startDate, end_date: endDate },
              index: index as TimeSeriesIndexType,
              interval: 'month',
              parcel_id: parcelId,
              farm_id: farmId,
            });
            result[index] = (response.data || []).map((point) => ({
              date: point.date,
              index_value: point.value,
              mean_value: point.value,
            }));
          } catch (_err) { result[index] = []; }
        }
      }
      return result;
    },
    enabled: !!organizationId && !!parcelId && selectedIndices.length > 0 && !!startDate && !!endDate,
    staleTime: 30 * 60 * 1000, // 30 min — satellite data updates at most daily
  });

  const forceSync = useCallback(async () => {
    if (!boundary || !organizationId || selectedIndices.length === 0 || !startDate || !endDate) return;
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      const indicesToSync = new Set<string>();
      for (const index of selectedIndices) {
        if (index === 'NIRvP') indicesToSync.add('NIRv');
        else if (index === 'TCARI_OSAVI') { indicesToSync.add('TCARI'); indicesToSync.add('OSAVI'); }
        else indicesToSync.add(index);
      }

      const syncEndDate = localCalendarISODate();
      const syncResponse = await satelliteApi.startTimeSeriesSync({
        parcel_id: parcelId,
        farm_id: farmId,
        aoi: { geometry: convertBoundaryToGeoJSON(boundary), name: parcelName || 'Parcel' },
        date_range: { start_date: startDate, end_date: syncEndDate },
        cloud_coverage: cloudCoverage,
        indices: Array.from(indicesToSync),
      });

      if (syncResponse.status === 'failed') {
        setIsSyncing(false);
        return;
      }

      setSyncProgress({
        totalIndices: syncResponse.totalIndices,
        completedIndices: syncResponse.completedIndices,
        currentIndex: syncResponse.currentIndex,
      });

      let lastCompleted = 0;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await satelliteApi.getTimeSeriesSyncStatus(parcelId);
          const isDone = status.status === 'completed' || status.status === 'failed' || status.status === 'idle';

          if (!isDone) {
            setSyncProgress({
              totalIndices: status.totalIndices,
              completedIndices: status.completedIndices,
              currentIndex: status.currentIndex,
            });
          }

          if (status.completedIndices > lastCompleted) {
            lastCompleted = status.completedIndices;
            refetchCache().catch(() => {});
          }

          if (isDone) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            await refetchCache().catch(() => undefined);
            queryClient.invalidateQueries({ queryKey: ['satellite-indices-cache', parcelId] });
            setIsSyncing(false);
            setSyncProgress(null);
          }
        } catch (_pollErr) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsSyncing(false);
          setSyncProgress(null);
        }
      }, 5000);
    } catch (_err) {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [boundary, organizationId, selectedIndices, startDate, endDate, cloudCoverage, parcelId, farmId, parcelName, refetchCache, queryClient]);

  const { data: weatherData } = useQuery({
    queryKey: ['weather-history', organizationId, parcelId, startDate, endDate],
    queryFn: async () => {
      if (!parcelId || !startDate || !endDate) return [];
      const json = await apiRequest<{ data: WeatherPoint[] }>(
        `/api/v1/satellite-proxy/weather/parcel/${parcelId}?start_date=${startDate}&end_date=${endDate}`,
        {},
        organizationId,
      );
      return json.data || [];
    },
    enabled: showTemperature && !!organizationId && !!parcelId && !!startDate && !!endDate,
    staleTime: Infinity, // historical weather data never changes
  });

  const isValidIndexValue = useCallback((index: TimeSeriesIndexType, value: number): boolean => {
    if (value == null || isNaN(value)) return false;
    const ranges: Record<string, [number, number]> = {
      NDVI: [-0.2, 1], NIRv: [-0.1, 0.8], EVI: [-0.2, 1],
      NDRE: [-0.2, 1], NDMI: [-0.5, 0.8], SAVI: [-0.2, 1],
      OSAVI: [-0.2, 1], MSAVI2: [-0.2, 1], GCI: [-1, 15],
      MCARI: [-0.5, 1], TCARI: [-0.5, 1], TCARI_OSAVI: [-2, 5],
      MSI: [0, 4], MNDWI: [-1, 1], NIRvP: [-50, 500],
    };
    const range = ranges[index];
    return !range || (value >= range[0] && value <= range[1]);
  }, []);

  const chartData = useMemo((): MultiIndexData[] => {
    const dateMap = new Map<string, MultiIndexData>();
    for (const index of selectedIndices) {
      const indexData = cachedData?.[index] || [];
      const validPoints = indexData
        .map(item => {
          const date = item.date?.split('T')[0];
          const value = item.mean_value ?? item.index_value;
          if (!date || date < startDate || date > endDate || !isValidIndexValue(index, value)) return null;
          return { date, value: Number(value) };
        })
        .filter((point): point is { date: string; value: number } => point !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Show all valid cache points. A previous 3σ neighbor filter dropped real acquisitions (e.g. new
      // scene after a gap), which made the chart disagree with the heatmap date picker.

      for (const point of validPoints) {
        const existing: MultiIndexData = dateMap.get(point.date) || { date: point.date };
        existing[index] = point.value;
        dateMap.set(point.date, existing);
      }
    }

    if (showTemperature && weatherData) {
      for (const point of weatherData) {
        const date = point.date?.split('T')[0];
        if (date && date >= startDate && date <= endDate) {
          const existing: MultiIndexData = dateMap.get(date) || { date };
          existing.temperature_mean = point.temperature_mean;
          existing.temperature_min = point.temperature_min;
          existing.temperature_max = point.temperature_max;
          dateMap.set(date, existing);
        }
      }
    }
    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [cachedData, selectedIndices, weatherData, showTemperature, isValidIndexValue, startDate, endDate]);

  const toggleIndex = (index: TimeSeriesIndexType) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  };

  const selectAllVegetationIndices = useCallback(() => {
    setSelectedIndices([...TIME_SERIES_INDICES]);
  }, []);

  const clearAllVegetationIndices = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  const brushPreviewIndex = (selectedIndices[0] ??
    TIME_SERIES_INDICES[0]) as TimeSeriesIndexType;

  const calculateStatistics = (index: TimeSeriesIndexType): IndexStats | null => {
    const values = chartData.map(d => d[index] as number).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);
    return { mean, min, max, std };
  };

  const getTrendIcon = (index: TimeSeriesIndexType) => {
    const values = chartData.map(d => d[index] as number).filter(v => typeof v === 'number');
    if (values.length < 2) return null;
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const percentChange = firstValue !== 0 ? Math.abs((lastValue - firstValue) / firstValue) * 100 : Math.abs(lastValue - firstValue) * 100;
    const STABILITY_THRESHOLD = 2;

    if (percentChange <= STABILITY_THRESHOLD) return <Minus className="w-3.5 h-3.5 text-yellow-500" />;
    if (lastValue > firstValue) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  };

  const stats = useMemo(() => {
    const perIndexCount: Record<string, number> = {};
    let totalPoints = 0;
    for (const index of selectedIndices) {
      const count = chartData.filter(d => typeof d[index] === 'number' && !isNaN(d[index] as number)).length;
      perIndexCount[index] = count;
      totalPoints += count;
    }
    return { total: totalPoints, perIndexCount };
  }, [selectedIndices, chartData]);

  const dataIsSparse = stats.total > 0 && stats.total < 10;
  const isLoading = isLoadingCache || isSyncing;
  const emptyIndices = selectedIndices.filter(index => (stats.perIndexCount[index] || 0) === 0);
  const showNoDataWarning =
    selectedIndices.length > 0 &&
    !isLoading &&
    cachedData !== undefined &&
    emptyIndices.length === selectedIndices.length;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto p-4 md:p-6 bg-slate-50/50 rounded-xl">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('timeSeries.title')}</h1>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-2 pl-1">
              {parcelName ? t('timeSeries.subtitle', { name: parcelName }) : t('timeSeries.subtitleFallback', { id: parcelId })}
              {stats.total > 0 && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium">
                  {t('timeSeries.dataPoints', { count: stats.total })}
                </Badge>
              )}
            </p>
            <p className="text-xs text-slate-400 pl-1 max-w-3xl leading-relaxed">
              {t('timeSeries.cacheVsHeatmapHint')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCache()}
              disabled={isLoading}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition-all"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoadingCache && "animate-spin")} />
              {t('timeSeries.actions.refreshCache')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={forceSync}
              disabled={isLoading || !boundary}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-100 transition-all"
            >
              {isSyncing ? <Zap className="w-3.5 h-3.5 mr-2 animate-pulse" /> : <Satellite className="w-3.5 h-3.5 mr-2" />}
              {isSyncing && syncProgress
                ? `${syncProgress.currentIndex || '...'} (${syncProgress.completedIndices}/${syncProgress.totalIndices})`
                : isSyncing ? t('timeSeries.actions.launching') : t('timeSeries.actions.fetchFromSatellite')}
            </Button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && syncProgress && (
          <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <div className="flex justify-between text-xs font-semibold text-blue-700 uppercase tracking-wider">
              <span>Syncing indices...</span>
              <span>{Math.round((syncProgress.completedIndices / syncProgress.totalIndices) * 100)}%</span>
            </div>
            <Progress value={(syncProgress.completedIndices / syncProgress.totalIndices) * 100} className="h-2 bg-blue-100" />
          </div>
        )}

        {/* Calibration banner — shown for pre-calibration and in-progress phases */}
        {aiPhase && (aiPhase === 'awaiting_data' || aiPhase === 'ready_calibration') && (
          <Alert className="bg-indigo-50 border-indigo-200 text-indigo-800">
            <Zap className="h-4 w-4 text-indigo-600" />
            <AlertTitle className="text-sm font-bold">
              {aiPhase === 'awaiting_data'
                ? t('timeSeries.calibration.awaitingDataTitle', 'Satellite data is being collected')
                : t('timeSeries.calibration.readyTitle', 'AI calibration is ready to run')}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 flex items-center gap-3">
              <span>
                {aiPhase === 'awaiting_data'
                  ? t('timeSeries.calibration.awaitingDataDescription', 'Once enough satellite imagery is available, calibration will start automatically.')
                  : t('timeSeries.calibration.readyDescription', 'Satellite data is available. Calibration will start automatically, or you can start it manually.')}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                onClick={triggerFullSync}
                disabled={isSyncingAll}
              >
                {isSyncingAll ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('timeSeries.calibration.syncing', 'Syncing...')}</>
                ) : (
                  <><Satellite className="w-3.5 h-3.5 mr-1.5" />{t('timeSeries.calibration.syncAll', 'Sync & Calibrate')}</>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {aiPhase && aiPhase === 'calibrating' && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertTitle className="text-sm font-bold">
              {t('timeSeries.calibration.calibratingTitle', 'Calibration in progress')}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1">
              {t('timeSeries.calibration.calibratingDescription', 'AgromindIA is analyzing satellite data for this parcel. This may take a few minutes.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="bg-white border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{t('timeSeries.labels.startDate')} - {t('timeSeries.labels.endDate')}</span>
                  </div>
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                        {([
                          { label: '3m', days: 90 },
                          { label: '6m', days: 180 },
                          { label: '1y', days: 365 },
                          { label: '2y', days: 730 },
                        ] as const).map(({ label, days }) => {
                      const range = getDateRangeLastNDays(days);
                      const active = startDate === range.start_date && endDate === range.end_date;
                      return (
                        <button
                          key={days}
                          onClick={() => { setStartDate(range.start_date); setEndDate(range.end_date); }}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-tight",
                            active ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                    <Thermometer className={cn("w-3.5 h-3.5", showTemperature ? "text-orange-500" : "text-slate-300")} />
                    <Label htmlFor="temp-mode" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer">Temp.</Label>
                    <Switch
                      id="temp-mode"
                      checked={showTemperature}
                      onCheckedChange={setShowTemperature}
                      className="data-[state=checked]:bg-orange-500 scale-75"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Warnings */}
                {dataIsSparse && !isLoading && (
                  <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-sm font-bold">{t('timeSeries.warnings.sparseData')}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {t('timeSeries.warnings.sparseDataDescription', { count: stats.total })}
                    </AlertDescription>
                  </Alert>
                )}

                {showNoDataWarning && (
                  <Alert variant="destructive" className="mb-6 bg-rose-50 border-rose-200 text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <AlertTitle className="text-sm font-bold">{t('timeSeries.warnings.noDataTitle')}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {t('timeSeries.warnings.noDataHint')}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="h-[450px] w-full mt-2">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <SectionLoader />
                      <span className="text-xs font-medium animate-pulse uppercase tracking-widest">Processing Satellite Data...</span>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis 
                          yAxisId="left" 
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                          axisLine={false}
                          tickLine={false}
                          domain={['auto', 'auto']}
                        />
                        {showTemperature && (
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            tick={{ fontSize: 10, fill: '#f97316', fontWeight: 600 }} 
                            axisLine={false}
                            tickLine={false}
                            unit="°C" 
                            domain={['auto', 'auto']}
                          />
                        )}
                        <Tooltip content={<CustomTooltip showTemperature={showTemperature} />} />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: 20, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}
                        />
                        
                        <Brush 
                          dataKey="date" 
                          height={40} 
                          stroke="#e2e8f0"
                          fill="#f8fafc"
                          gap={10}
                          travellerWidth={10}
                        >
                          <LineChart>
                            <Line
                              type="monotone"
                              dataKey={brushPreviewIndex}
                              stroke={getIndexColor(brushPreviewIndex)}
                              strokeWidth={1}
                              dot={false}
                            />
                          </LineChart>
                        </Brush>

                        {showTemperature && (
                          <>
                            <Area
                              yAxisId="right"
                              type="monotone"
                              dataKey="temperature_mean"
                              fill="url(#colorTemp)"
                              stroke="none"
                              connectNulls
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="temperature_mean"
                              name={t('timeSeries.chart.tempMean')}
                              stroke="#f97316"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              connectNulls
                            />
                          </>
                        )}

                        {selectedIndices.map(vegIndex => (
                          <Line
                            yAxisId="left"
                            key={vegIndex}
                            type="monotone"
                            dataKey={vegIndex}
                            name={vegIndex}
                            stroke={getIndexColor(vegIndex)}
                            strokeWidth={3}
                            dot={{ r: 0, fill: getIndexColor(vegIndex), strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100">
                      <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100">
                        <BarChart3 className="w-10 h-10 text-slate-200" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-1">{t('timeSeries.chart.emptyState')}</p>
                        <p className="text-[10px] text-slate-400">Select a wider range or fetch new data</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Index Descriptions Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedIndices.map(vegIndex => (
                <Card key={vegIndex} className="border-slate-100 shadow-none bg-white">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getIndexColor(vegIndex) }} />
                        <span className="text-sm font-bold text-slate-800">{vegIndex}</span>
                      </div>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] text-xs leading-relaxed">
                          {getIndexDescription(vegIndex)}
                        </TooltipContent>
                      </UITooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                      {getIndexDescription(vegIndex)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar: Controls & Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Index Selection Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 p-4 py-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    {t('timeSeries.labels.vegetationIndices')}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wide"
                      onClick={selectAllVegetationIndices}
                    >
                      {t('timeSeries.actions.selectAllIndices', 'Select all')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                      onClick={clearAllVegetationIndices}
                    >
                      {t('timeSeries.actions.unselectAllIndices', 'Clear all')}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-500">
                  {t('timeSeries.labels.indicesSelected', {
                    count: selectedIndices.length,
                  })}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  <div className="p-2 space-y-1">
                        {TIME_SERIES_INDICES.map(vegIndex => {
                      const isSelected = selectedIndices.includes(vegIndex);
                      return (
                        <button
                          type="button"
                          key={vegIndex}
                          onClick={() => toggleIndex(vegIndex)}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-left",
                            isSelected ? "bg-blue-50/80 border border-blue-100" : "hover:bg-slate-100 border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                              )}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={cn(
                              "text-xs font-semibold tracking-tight",
                              isSelected ? "text-blue-700" : "text-slate-600"
                            )}>
                              {vegIndex === 'TCARI_OSAVI' ? 'TCARI / OSAVI' : vegIndex}
                            </span>
                          </div>
                          <div className="w-1.5 h-6 rounded-full opacity-60" style={{ backgroundColor: getIndexColor(vegIndex) }} />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Date Range Selection */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-4 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Custom Range
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('timeSeries.labels.startDate')}</Label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('timeSeries.labels.endDate')}</Label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Section */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-4 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {selectedIndices.map(vegIndex => {
                    const stats = calculateStatistics(vegIndex);
                    if (!stats) return (
                      <div key={vegIndex} className="p-4 flex items-center justify-between opacity-40 grayscale">
                        <span className="text-xs font-bold text-slate-500 uppercase">{vegIndex}</span>
                        <span className="text-[10px] italic">No data</span>
                      </div>
                    );
                    return (
                      <div key={vegIndex} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getIndexColor(vegIndex) }} />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{vegIndex}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Trend</span>
                            {getTrendIcon(vegIndex)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('timeSeries.table.mean')}</span>
                            <div className="text-xs font-bold text-slate-800 tabular-nums">{stats.mean.toFixed(3)}</div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('timeSeries.table.std')}</span>
                            <div className="text-xs font-bold text-slate-800 tabular-nums">{stats.std.toFixed(3)}</div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('timeSeries.table.min')}</span>
                            <div className="text-xs font-semibold text-rose-600 tabular-nums">{stats.min.toFixed(3)}</div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('timeSeries.table.max')}</span>
                            <div className="text-xs font-semibold text-emerald-600 tabular-nums">{stats.max.toFixed(3)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                      {showTemperature && weatherData && weatherData.length > 0 && (
                        <div className="p-4 bg-orange-50/30 space-y-2.5 border-t border-orange-100">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-tight">Temperature</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                         <div className="space-y-0.5">
                           <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Average</span>
                           <div className="text-xs font-bold text-orange-700 tabular-nums">
                             {(weatherData.reduce((acc, curr) => acc + curr.temperature_mean, 0) / weatherData.length).toFixed(1)} °C
                           </div>
                         </div>
                         <div className="space-y-0.5">
                           <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Range</span>
                           <div className="text-[10px] font-bold text-orange-700 tabular-nums">
                             {Math.min(...weatherData.map(d => d.temperature_min)).toFixed(1)}° - {Math.max(...weatherData.map(d => d.temperature_max)).toFixed(1)}°C
                           </div>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TimeSeriesChart;
