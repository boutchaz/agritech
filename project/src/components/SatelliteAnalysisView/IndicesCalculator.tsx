import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Satellite, Download, Database, RefreshCw, Calculator, Calendar, Layers, Activity, Zap, Info, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  IndexCalculationRequest,
  IndexCalculationResponse,
  convertBoundaryToGeoJSON,
  formatDateForAPI
} from '../../lib/satellite-api';
import { satelliteIndicesApi } from '../../lib/api/satellite-indices';
import { useAuth } from '../../hooks/useAuth';
import { ButtonLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IndicesCalculatorProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
  onResultsUpdate?: (results: IndexCalculationResponse) => void;
}

interface CachedIndexResult {
  index: VegetationIndexType;
  value: number;
  date: string;
}

const IndicesCalculator: React.FC<IndicesCalculatorProps> = ({
  parcelId,
  parcelName,
  farmId,
  boundary,
  onResultsUpdate
}) => {
  const CLOUD_COVERAGE_FIXED = 10;
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NIRv', 'EVI', 'NDRE']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scale, setScale] = useState(10);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<IndexCalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const todayDate = formatDateForAPI(new Date());

  // Initialize with reasonable default dates (last 30 days)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    setEndDate(formatDateForAPI(endDate));
    setStartDate(formatDateForAPI(startDate));
  }, []);

  // Query cached indices from database
  const {
    data: cachedIndices,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-indices-calc-cache', parcelId, selectedIndices, startDate, endDate],
    queryFn: async (): Promise<CachedIndexResult[]> => {
      if (!organizationId || !parcelId || !startDate || !endDate) return [];

      const allIndices: CachedIndexResult[] = [];
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
        // Get the most recent entry with mean_value for each index
        const sorted = response
          .filter(item => item.mean_value !== undefined && item.mean_value !== null)
          .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

        if (sorted.length > 0) {
          allIndices.push({
            index: sorted[0].index_name as VegetationIndexType,
            value: sorted[0].mean_value || 0,
            date: sorted[0].date?.split('T')[0] || startDate,
          });
        }
      }
      return allIndices;
    },
    enabled: !!organizationId && !!parcelId && selectedIndices.length > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Build results from cache
  const buildResultsFromCache = useCallback((): IndexCalculationResponse | null => {
    if (!cachedIndices || cachedIndices.length === 0) return null;

    return {
      timestamp: new Date().toISOString(),
      indices: cachedIndices.map(item => ({
        index: item.index,
        value: item.value,
      })),
      metadata: {
        source: 'cache',
        date_range: `${startDate} - ${endDate}`,
      },
    };
  }, [cachedIndices, startDate, endDate]);

  // Get display results: prefer cached, fall back to API result
  const getDisplayResults = useCallback((): IndexCalculationResponse | null => {
    const fromCache = buildResultsFromCache();
    if (fromCache && fromCache.indices.length > 0) {
      return fromCache;
    }
    return results;
  }, [buildResultsFromCache, results]);

  const getCacheStats = () => {
    const cached = cachedIndices || [];
    return { total: cached.length, fromCache: cached.length > 0 };
  };

  const handleIndexToggle = (index: VegetationIndexType) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCalculate = async () => {
    if (!boundary || !startDate || !endDate || selectedIndices.length === 0 || !organizationId) {
      setError('Veuillez sélectionner une plage de dates et au moins un indice de végétation');
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start >= end) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    if (start >= now) {
      setError('La date de début ne peut pas être dans le futur');
      return;
    }

    if (end >= now) {
      setError('La date de fin ne peut pas être dans le futur. Les données satellite ne sont pas disponibles pour les dates futures.');
      return;
    }

    // Check if date range is reasonable
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    if (start < threeYearsAgo) {
      setError('La date de début est trop ancienne. Veuillez sélectionner une date dans les 3 dernières années.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const request: IndexCalculationRequest = {
        aoi: {
          geometry: convertBoundaryToGeoJSON(boundary),
          name: parcelName || 'Selected Area'
        },
        date_range: {
          start_date: startDate,
          end_date: endDate
        },
        indices: selectedIndices,
        cloud_coverage: CLOUD_COVERAGE_FIXED,
        scale: scale
      };

      const response = await satelliteApi.calculateIndices(request);

      if (!response || !response.indices || response.indices.length === 0) {
        throw new Error('No satellite imagery data available for the selected date range and location.');
      }

       for (const indexResult of response.indices) {
         try {
           await satelliteIndicesApi.create(
             {
               parcel_id: parcelId,
               farm_id: farmId,
               index_name: indexResult.index,
               date: endDate,
               mean_value: indexResult.value,
               cloud_coverage_percentage: CLOUD_COVERAGE_FIXED,
               metadata: { scale, source: 'indices_calculator' },
             },
             organizationId
           );
         } catch (_saveError) {}
       }

      await refetchCache();
      queryClient.invalidateQueries({ queryKey: ['satellite-indices-calc-cache', parcelId] });

      setResults(response);
      onResultsUpdate?.(response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Échec du calcul des indices';
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const getIndexColors = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, { bg: string, text: string, border: string }> = {
      NDVI: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
      NDRE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
      NDMI: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
      MNDWI: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
      GCI: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-100' },
      SAVI: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
      OSAVI: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
      MSAVI2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
      NIRv: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
      EVI: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
      MSI: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
      MCARI: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
      TCARI: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' }
    };
    return colors[index] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-100">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Vegetation Indices Calculator</CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">
                    Batch analysis for {parcelName || 'selected area'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getCacheStats().fromCache && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-2 py-1">
                    <Database className="w-3 h-3 mr-1.5" />
                    {getCacheStats().total} IN CACHE
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-8">
            {/* Configuration Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Date Range */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-tight">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Analysis Period
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</Label>
                    <input
                      type="date"
                      value={startDate}
                      max={todayDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</Label>
                    <input
                      type="date"
                      value={endDate}
                      max={todayDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-tight">
                  <Satellite className="w-4 h-4 text-blue-600" />
                  Parameters & Quality
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cloud Coverage Threshold</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">{CLOUD_COVERAGE_FIXED}%</Badge>
                      <span className="text-[11px] text-slate-500 font-medium leading-tight">Fixed for optimal data consistency and accuracy.</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pixel Scale</Label>
                      <span className="text-xs font-bold text-blue-600">{scale}m</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={scale}
                      onChange={(e) => setScale(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 py-1"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Lower scale = higher resolution, slower processing.</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Indices Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-tight">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Select Indices to Calculate
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIndices.length} Selected</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {VEGETATION_INDICES.map((index: VegetationIndexType) => {
                  const isSelected = selectedIndices.includes(index);
                  const colors = getIndexColors(index);
                  return (
                    <button
                      key={index}
                      onClick={() => handleIndexToggle(index)}
                      className={cn(
                        "group flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden",
                        isSelected 
                          ? "bg-white border-blue-500 shadow-lg shadow-blue-50" 
                          : "bg-slate-50/50 border-transparent hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold mb-2 uppercase tracking-tighter border",
                        colors.bg, colors.text, colors.border
                      )}>
                        {index}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-snug line-clamp-2">{VEGETATION_INDEX_DESCRIPTIONS[index]}</p>
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => refetchCache()}
                disabled={isLoadingCache || isCalculating}
                className="bg-white border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 h-11 px-6 shadow-sm"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingCache && "animate-spin")} />
                Refresh Cache
              </Button>

              <Button 
                onClick={handleCalculate} 
                disabled={isCalculating || selectedIndices.length === 0 || !startDate || !endDate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-widest h-11 px-8 shadow-lg shadow-blue-100 flex-1 sm:flex-none"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Process Satellite Data
                  </>
                )}
              </Button>

              {getDisplayResults() && (
                <Button variant="outline" className="ml-auto border-slate-200 font-bold text-[11px] uppercase tracking-widest h-11">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 shadow-sm animate-in">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-sm font-bold uppercase tracking-tight">Calculation Error</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {getDisplayResults() && (
          <Card className="border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500 animate-in">
            <CardHeader className="bg-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  {getCacheStats().fromCache ? 'Cached Analysis Results' : 'Satellite Processing Results'}
                </CardTitle>
                <CardDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Processed on {new Date(getDisplayResults()!.timestamp).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                COMPLETE
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getDisplayResults()!.indices.map((result: any, index: number) => {
                  const colors = getIndexColors(result.index as VegetationIndexType);
                  return (
                    <Card key={index} className="border-slate-100 shadow-none bg-slate-50/30 overflow-hidden group hover:border-slate-200 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight",
                            colors.bg, colors.text, colors.border
                          )}>
                            {result.index}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-slate-300 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px] text-[10px]">
                              {VEGETATION_INDEX_DESCRIPTIONS[result.index as VegetationIndexType]}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-black text-slate-800 tabular-nums tracking-tighter">
                            {result.value.toFixed(3)}
                          </span>
                          <Activity className="w-4 h-4 text-emerald-500 mb-1 opacity-40" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic line-clamp-1">
                          {VEGETATION_INDEX_DESCRIPTIONS[result.index as VegetationIndexType]}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {getDisplayResults()!.metadata && (
                <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3 text-slate-600 font-bold text-[10px] uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Processing Metadata
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {Object.entries(getDisplayResults()!.metadata).map(([key, value]) => (
                      <div key={key} className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{key}</span>
                        <span className="text-xs font-bold text-slate-700">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default IndicesCalculator;
