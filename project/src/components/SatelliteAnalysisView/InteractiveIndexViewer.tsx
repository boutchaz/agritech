import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Download, 
  Layers, 
  Loader, 
  Maximize, 
  Minimize, 
  GitCompareArrows, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Settings2,
  Map as MapIcon,
  Eye,
  BarChart4,
  LayoutGrid,
  Copy,
  CalendarDays,
  Activity,
  Check
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { MapContainer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
   satelliteApi,
   VegetationIndexType,
   VEGETATION_INDICES,
   HeatmapDataResponse,
   InteractiveDataResponse,
   convertBoundaryToGeoJSON,
   DEFAULT_CLOUD_COVERAGE,
   formatDateForAPI
} from '../../lib/satellite-api';
import LeafletHeatmapViewer, { GridHeatmapLayer } from './LeafletHeatmapViewer';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';

import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Trans, useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/radix-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InteractiveIndexViewerProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
}

type VisualizationType = 'leaflet' | 'scatter';

// Color palette configurations
export type ColorPalette = 'viridis' | 'red-green' | 'blue-red' | 'rainbow' | 'terrain' | 'green-red-inverted' | 'blue-red-inverted';

export const COLOR_PALETTES: Record<ColorPalette, { name: string; colors: string[]; description: string }> = {
  'red-green': {
    name: 'Rouge-Vert',
    colors: ['#dc143c', '#ff6347', '#ffa500', '#ffff00', '#adff2f', '#32cd32', '#228b22'],
    description: 'Classique pour la végétation'
  },
  'viridis': {
    name: 'Viridis',
    colors: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde724'],
    description: 'Scientifique et accessible'
  },
  'blue-red': {
    name: 'Bleu-Rouge',
    colors: ['#8b0000', '#ff0000', '#ff69b4', '#ffffff', '#00bfff', '#4169e1', '#0000ff'],
    description: 'Contraste thermique'
  },
  'rainbow': {
    name: 'Arc-en-ciel',
    colors: ['#9400d3', '#4b0082', '#0000ff', '#00ff00', '#ffff00', '#ff7f00', '#ff0000'],
    description: 'Maximum de contraste'
  },
  'terrain': {
    name: 'Terrain',
    colors: ['#333333', '#8b4513', '#daa520', '#f0e68c', '#9acd32', '#228b22', '#006400'],
    description: 'Terrain naturel'
  },
  'green-red-inverted': {
    name: 'Vert-Rouge (Inv.)',
    colors: ['#228b22', '#32cd32', '#adff2f', '#ffff00', '#ffa500', '#ff6347', '#dc143c'],
    description: 'Pour MSI - bas = bon'
  },
  'blue-red-inverted': {
    name: 'Bleu-Rouge (Inv.)',
    colors: ['#0000ff', '#4169e1', '#00bfff', '#ffffff', '#ff69b4', '#ff0000', '#8b0000'],
    description: 'Pour MSI - bas = bon'
  }
};

const InteractiveIndexViewer: React.FC<InteractiveIndexViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  const { t, i18n } = useTranslation('satellite');

  // View mode: single, multi-grid, multi-overlay, or temporal-compare
  const [viewMode, setViewMode] = useState<'single' | 'multi-grid' | 'multi-overlay' | 'temporal-compare'>('single');

  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NIRv');
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NIRv', 'EVI', 'NDRE']);
  const [selectedDate, setSelectedDate] = useState('');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('leaflet');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('red-green');
  const [baseLayer, setBaseLayer] = useState<'osm' | 'satellite'>('satellite');

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | InteractiveDataResponse | null>(null);
  const [multiData, setMultiData] = useState<Map<VegetationIndexType, HeatmapDataResponse>>(new Map());

  // Temporal comparison state
  const [compareDate, setCompareDate] = useState('');
  const [leftTemporalData, setLeftTemporalData] = useState<HeatmapDataResponse | null>(null);
  const [rightTemporalData, setRightTemporalData] = useState<HeatmapDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateMismatch, setDateMismatch] = useState<{requested: string; actual: string} | null>(null);

  // Overlay opacity control (per index)
  const [overlayOpacity, setOverlayOpacity] = useState<Map<VegetationIndexType, number>>(
    new Map([['NIRv', 0.7], ['EVI', 0.7], ['NDRE', 0.7]])
  );

  // Per-index color palette selection for multi-grid view
  const [indexColorPalettes, setIndexColorPalettes] = useState<Map<VegetationIndexType, ColorPalette>>(
    new Map([['NIRv', 'red-green'], ['EVI', 'viridis'], ['NDRE', 'blue-red']])
  );

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [datesLoaded, setDatesLoaded] = useState(false);
  // Ref-based lock to prevent concurrent fetchAvailableDates calls (e.g. React Strict Mode double-invoke)
  const isFetchingDatesRef = React.useRef(false);

  const [navYear, setNavYear] = useState(() => new Date().getFullYear());
  const [navMonth, setNavMonth] = useState(() => new Date().getMonth());
  const [compareNavYear, setCompareNavYear] = useState(() => new Date().getFullYear());
  const [compareNavMonth, setCompareNavMonth] = useState(() => new Date().getMonth());
  const [compareAvailableDates, setCompareAvailableDates] = useState<string[]>([]);
  const [compareIsLoadingDates, setCompareIsLoadingDates] = useState(false);
  const [compareDatesLoaded, setCompareDatesLoaded] = useState(false);
  const isFetchingCompareDatesRef = React.useRef(false);

  const navMonthLabel = useMemo(() => {
    const d = new Date(navYear, navMonth, 1);
    return d.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  }, [i18n.language, navYear, navMonth]);

  const compareNavMonthLabel = useMemo(() => {
    const d = new Date(compareNavYear, compareNavMonth, 1);
    return d.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  }, [i18n.language, compareNavYear, compareNavMonth]);

  const navigateMonth = useCallback((direction: -1 | 1) => {
    setNavMonth(prev => {
      const newMonth = prev + direction;
      if (newMonth < 0) {
        setNavYear(y => y - 1);
        return 11;
      }
      if (newMonth > 11) {
        setNavYear(y => y + 1);
        return 0;
      }
      return newMonth;
    });
    isFetchingDatesRef.current = false;
    setDatesLoaded(false);
    setAvailableDates([]);
  }, []);

  const navigateCompareMonth = useCallback((direction: -1 | 1) => {
    setCompareNavMonth(prev => {
      const newMonth = prev + direction;
      if (newMonth < 0) {
        setCompareNavYear(y => y - 1);
        return 11;
      }
      if (newMonth > 11) {
        setCompareNavYear(y => y + 1);
        return 0;
      }
      return newMonth;
    });
    isFetchingCompareDatesRef.current = false;
    setCompareDatesLoaded(false);
    setCompareAvailableDates([]);
  }, []);

  const fetchAvailableDates = useCallback(async () => {
    if (!boundary || isFetchingDatesRef.current) return;

    isFetchingDatesRef.current = true;
    setIsLoadingDates(true);
    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const monthStart = new Date(navYear, navMonth, 1);
      const monthEnd = new Date(navYear, navMonth + 1, 0);

      const result = await satelliteApi.getAvailableDates(
        aoi,
        formatDateForAPI(monthStart),
        formatDateForAPI(monthEnd),
        DEFAULT_CLOUD_COVERAGE,
        parcelId,
        false // use cache on initial load; force_refresh only on explicit navigation
      );

      const dates = result.available_dates
        .filter(d => d.available)
        .map(d => d.date);

      setAvailableDates(dates);
      setDatesLoaded(true);

      if (dates.length > 0) {
        setSelectedDate(dates[dates.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch available dates:', err);
      setDatesLoaded(true);
    } finally {
      setIsLoadingDates(false);
      isFetchingDatesRef.current = false;
    }
  }, [boundary, parcelName, navYear, navMonth, parcelId]);

  const fetchCompareAvailableDates = useCallback(async () => {
    if (!boundary || isFetchingCompareDatesRef.current) return;

    isFetchingCompareDatesRef.current = true;
    setCompareIsLoadingDates(true);
    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const monthStart = new Date(compareNavYear, compareNavMonth, 1);
      const monthEnd = new Date(compareNavYear, compareNavMonth + 1, 0);

      const result = await satelliteApi.getAvailableDates(
        aoi,
        formatDateForAPI(monthStart),
        formatDateForAPI(monthEnd),
        DEFAULT_CLOUD_COVERAGE,
        parcelId,
        false // use cache; force_refresh only on explicit navigation
      );

      const dates = result.available_dates
        .filter(d => d.available)
        .map(d => d.date);

      setCompareAvailableDates(dates);
      setCompareDatesLoaded(true);

      if (dates.length > 0) {
        const latestDifferentDate = [...dates].reverse().find((date) => date !== selectedDate);
        setCompareDate(latestDifferentDate || dates[dates.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch compare available dates:', err);
      setCompareDatesLoaded(true);
    } finally {
      setCompareIsLoadingDates(false);
      isFetchingCompareDatesRef.current = false;
    }
  }, [boundary, parcelName, compareNavYear, compareNavMonth, parcelId, selectedDate]);

  useEffect(() => {
    if (boundary && !datesLoaded) {
      fetchAvailableDates();
    }
  }, [boundary, datesLoaded, fetchAvailableDates]);

  useEffect(() => {
    if (viewMode !== 'temporal-compare') return;
    if (boundary && !compareDatesLoaded) {
      fetchCompareAvailableDates();
    }
  }, [viewMode, boundary, compareDatesLoaded, fetchCompareAvailableDates]);

  useEffect(() => {
    if (viewMode !== 'temporal-compare' || !selectedDate) return;

    const selected = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(selected.getTime())) return;

    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth();

    setCompareNavYear(selectedYear);
    setCompareNavMonth(selectedMonth);

    setCompareDatesLoaded(false);
    setCompareAvailableDates([]);
  }, [viewMode, selectedDate]);

  const generateVisualization = useCallback(async () => {
    if (!boundary || !selectedDate) return;

    setIsLoading(true);
    setError(null);
    setDateMismatch(null);

    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      if (viewMode === 'temporal-compare') {
        if (!compareDate) {
          setError(t('satellite:heatmap.temporalCompare.selectBothDates'));
          setIsLoading(false);
          return;
        }

        const [leftResult, rightResult] = await Promise.all([
          satelliteApi.generateInteractiveVisualization(aoi, selectedDate, selectedIndex, 'heatmap', parcelId) as Promise<HeatmapDataResponse>,
          satelliteApi.generateInteractiveVisualization(aoi, compareDate, selectedIndex, 'heatmap', parcelId) as Promise<HeatmapDataResponse>,
        ]);

        if (leftResult.metadata?.requested_date && leftResult.date !== leftResult.metadata.requested_date) {
          setDateMismatch({ requested: leftResult.metadata.requested_date, actual: leftResult.date });
        } else if (rightResult.metadata?.requested_date && rightResult.date !== rightResult.metadata.requested_date) {
          setDateMismatch({ requested: rightResult.metadata.requested_date, actual: rightResult.date });
        }

        setLeftTemporalData(leftResult);
        setRightTemporalData(rightResult);
      } else if (viewMode === 'single') {
        const result = await satelliteApi.generateInteractiveVisualization(
          aoi,
          selectedDate,
          selectedIndex,
          visualizationType === 'leaflet' ? 'heatmap' : 'scatter',
          parcelId
        );

        const heatmapResult = result as HeatmapDataResponse;
        if (heatmapResult.metadata?.requested_date && heatmapResult.date !== heatmapResult.metadata.requested_date) {
          setDateMismatch({ requested: heatmapResult.metadata.requested_date, actual: heatmapResult.date });
        }

        setData(result);
      } else {
        const results = new Map<VegetationIndexType, HeatmapDataResponse>();
        let foundMismatch: {requested: string; actual: string} | null = null;

        for (const index of selectedIndices) {
          try {
            const result = await satelliteApi.generateInteractiveVisualization(
              aoi,
              selectedDate,
              index,
              'heatmap',
              parcelId
            ) as HeatmapDataResponse;
            results.set(index, result);

            if (!foundMismatch && result.metadata?.requested_date && result.date !== result.metadata.requested_date) {
              foundMismatch = { requested: result.metadata.requested_date, actual: result.date };
            }
          } catch (err) {
            console.error(`Failed to fetch ${index}:`, err);
          }
        }

        if (foundMismatch) {
          setDateMismatch(foundMismatch);
        }

        setMultiData(results);

        const newPalettes = new Map(indexColorPalettes);
        let updated = false;
        for (const index of selectedIndices) {
          if (!newPalettes.has(index)) {
            newPalettes.set(index, getDefaultPaletteForIndex(index));
            updated = true;
          }
        }
        if (updated) {
          setIndexColorPalettes(newPalettes);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('satellite:heatmap.warnings.failedToGenerate');
      if (errorMessage.includes('No images found')) {
        setError(t('satellite:heatmap.warnings.noImagesForDate', { date: selectedDate }));
      } else if (errorMessage.includes('cloud coverage')) {
        setError(t('satellite:heatmap.warnings.cloudCoverageError'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelName, selectedDate, compareDate, selectedIndex, selectedIndices, visualizationType, viewMode, parcelId, indexColorPalettes, t]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      NIRv: '#ef4444', EVI: '#0ea5e9', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
    };
    return colors[index] || '#64748b';
  };

  const createScatterOption = (data: InteractiveDataResponse): EChartsOption => {
    const { pixel_data, visualization, index } = data;
    return {
      tooltip: {
        formatter: function (params: any) {
          const [lon, lat, value] = params.data;
          return `<div class="p-2">
            <div class="font-bold text-slate-800">${index}: ${value.toFixed(3)}</div>
            <div class="text-xs text-slate-500">Lon: ${lon.toFixed(6)}</div>
            <div class="text-xs text-slate-500">Lat: ${lat.toFixed(6)}</div>
          </div>`;
        }
      },
      grid: { containLabel: true, top: 20, bottom: 40, left: 60, right: 40 },
      xAxis: { type: 'value', name: 'Longitude', nameLocation: 'middle', nameGap: 25, splitLine: { show: false } },
      yAxis: { type: 'value', name: 'Latitude', nameLocation: 'middle', nameGap: 45, splitLine: { show: false } },
      visualMap: {
        min: visualization.min,
        max: visualization.max,
        dimension: 2,
        orient: 'vertical',
        right: 10,
        top: 'center',
        inRange: { color: visualization.palette }
      },
      series: [{
        name: index,
        type: 'scatter',
        data: pixel_data.map(p => [p.lon, p.lat, p.value]),
        symbolSize: function (value: number[]) {
          return Math.max(4, Math.min(10, (value[2] - visualization.min) / (visualization.max - visualization.min) * 6 + 4));
        }
      }]
    };
  };

  const downloadData = () => {
    if (!data) return;
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${parcelName || parcelId}_${selectedIndex}_${selectedDate}_interactive.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Configuration */}
        <div className="lg:col-span-4 space-y-6">
          {/* View Mode Selection */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 p-4 py-3">
              <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5" />
                {t('satellite:heatmap.labels.visualizationType')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'single', label: t('satellite:heatmap.viewModes.single'), icon: Eye },
                  { id: 'multi-grid', label: t('satellite:heatmap.viewModes.multiGrid'), icon: LayoutGrid },
                  { id: 'multi-overlay', label: t('satellite:heatmap.viewModes.multiOverlay'), icon: Copy },
                  { id: 'temporal-compare', label: t('satellite:heatmap.viewModes.temporalCompare'), icon: GitCompareArrows },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border transition-all gap-1.5",
                      viewMode === mode.id 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                        : "bg-white border-transparent text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <mode.icon className={cn("w-4 h-4", viewMode === mode.id ? "text-emerald-600" : "text-slate-400")} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{mode.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data & Layer Configuration */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 py-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                {t('satellite:heatmap.configuration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Common Configuration: Date & Base Layer */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.dateNavigator.date')}</Label>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-4 w-4"><ChevronLeft className="w-3 h-3" /></Button>
                      <span className="min-w-[80px] text-center">{navMonthLabel}</span>
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-4 w-4" disabled={navYear === new Date().getFullYear() && navMonth >= new Date().getMonth()}><ChevronRight className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <Select value={selectedDate} onValueChange={setSelectedDate} disabled={!boundary || isLoadingDates}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-200">
                      <SelectValue placeholder={isLoadingDates ? t('satellite:heatmap.dateNavigator.loading', 'Loading dates...') : t('satellite:heatmap.dateNavigator.selectDate', 'Select date')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.length === 0 && !isLoadingDates && (
                        <div className="px-3 py-2 text-xs text-slate-400">{t('satellite:heatmap.dateNavigator.noDates', 'No dates available')}</div>
                      )}
                      {[...availableDates].reverse().map(date => (
                        <SelectItem key={date} value={date} className="text-xs font-medium">{date}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {viewMode === 'temporal-compare' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compare with</Label>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Button variant="ghost" size="icon" onClick={() => navigateCompareMonth(-1)} className="h-4 w-4"><ChevronLeft className="w-3 h-3" /></Button>
                        <span className="min-w-[80px] text-center">{compareNavMonthLabel}</span>
                        <Button variant="ghost" size="icon" onClick={() => navigateCompareMonth(1)} className="h-4 w-4" disabled={compareNavYear === new Date().getFullYear() && compareNavMonth >= new Date().getMonth()}><ChevronRight className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <Select value={compareDate} onValueChange={setCompareDate} disabled={!boundary || compareIsLoadingDates}>
                      <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-200">
                        <SelectValue placeholder={compareIsLoadingDates ? t('satellite:heatmap.dateNavigator.loading', 'Loading dates...') : t('satellite:heatmap.dateNavigator.selectDate', 'Select date')} />
                      </SelectTrigger>
                      <SelectContent>
                        {compareAvailableDates.length === 0 && !compareIsLoadingDates && (
                          <div className="px-3 py-2 text-xs text-slate-400">{t('satellite:heatmap.dateNavigator.noDates', 'No dates available')}</div>
                        )}
                        {[...compareAvailableDates].reverse().map(date => (
                          <SelectItem key={date} value={date} className="text-xs font-medium">{date}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.baseMap.label')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={baseLayer === 'satellite' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBaseLayer('satellite')}
                      className={cn("text-[10px] h-8 font-bold uppercase", baseLayer === 'satellite' ? "bg-slate-700 hover:bg-slate-800" : "text-slate-500")}
                    >
                      Satellite
                    </Button>
                    <Button
                      variant={baseLayer === 'osm' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBaseLayer('osm')}
                      className={cn("text-[10px] h-8 font-bold uppercase", baseLayer === 'osm' ? "bg-slate-700 hover:bg-slate-800" : "text-slate-500")}
                    >
                      Map
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Mode Specific Configuration */}
              <div className="space-y-4">
                {(viewMode === 'single' || viewMode === 'temporal-compare') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.labels.vegetationIndex')}</Label>
                      <Select value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as VegetationIndexType)}>
                        <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEGETATION_INDICES.map(idx => (
                            <SelectItem key={idx} value={idx} className="text-xs font-medium">{idx}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {viewMode === 'single' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Mode</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={visualizationType === 'leaflet' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setVisualizationType('leaflet')}
                            className={cn("text-[10px] h-8 font-bold uppercase", visualizationType === 'leaflet' ? "bg-emerald-600 hover:bg-emerald-700" : "text-slate-500")}
                          >
                            Map
                          </Button>
                          <Button
                            variant={visualizationType === 'scatter' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setVisualizationType('scatter')}
                            className={cn("text-[10px] h-8 font-bold uppercase", visualizationType === 'scatter' ? "bg-emerald-600 hover:bg-emerald-700" : "text-slate-500")}
                          >
                            Scatter
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.labels.colorPalette')}</Label>
                      <div className="grid grid-cols-1 gap-1.5">
                        <Select value={colorPalette} onValueChange={(v) => setColorPalette(v as ColorPalette)}>
                          <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                              <SelectItem key={key} value={key} className="text-xs font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-2.5 w-12 rounded overflow-hidden">
                                    {palette.colors.map(c => <div key={c} style={{backgroundColor: c, flex: 1}} />)}
                                  </div>
                                  {palette.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {(viewMode === 'multi-grid' || viewMode === 'multi-overlay') && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.labels.indicesToCompare')}</Label>
                    <ScrollArea className="h-[200px] border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-1">
                        {VEGETATION_INDICES.map(idx => {
                          const isSelected = selectedIndices.includes(idx);
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (isSelected) setSelectedIndices(selectedIndices.filter(i => i !== idx));
                                else setSelectedIndices([...selectedIndices, idx]);
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md transition-all text-left",
                                isSelected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-100 text-slate-500"
                              )}
                            >
                              <div className={cn("w-3 h-3 rounded border flex items-center justify-center transition-all", isSelected ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300")}>
                                {isSelected && <Check className="w-2 h-2 text-white" />}
                              </div>
                              <span className="text-[10px] font-bold">{idx}</span>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                
                {viewMode === 'multi-overlay' && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('satellite:heatmap.labels.overlayOpacity')}</Label>
                    <div className="space-y-2.5">
                      {selectedIndices.map(index => (
                        <div key={index} className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: getIndexColor(index)}} />
                              {index}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{Math.round((overlayOpacity.get(index) || 0.7) * 100)}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={(overlayOpacity.get(index) || 0.7) * 100}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const newOpacity = new Map(overlayOpacity);
                              newOpacity.set(index, val / 100);
                              setOverlayOpacity(newOpacity);
                            }}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={generateVisualization} 
                  disabled={isLoading || !boundary || !datesLoaded || !selectedDate || (viewMode === 'temporal-compare' && !compareDate) || (viewMode !== 'single' && viewMode !== 'temporal-compare' && selectedIndices.length === 0)}
                  className={cn(
                    "w-full font-bold uppercase tracking-widest text-[11px] shadow-lg transition-all h-10",
                    viewMode === 'temporal-compare' ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  )}
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : viewMode === 'temporal-compare' ? <GitCompareArrows className="w-4 h-4 mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                  {isLoading ? t('satellite:heatmap.actions.generating') : viewMode === 'temporal-compare' ? t('satellite:heatmap.actions.compareDates') : t('satellite:heatmap.actions.generate')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Area: Visualization & Stats */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <AlertTitle className="text-sm font-bold">Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {dateMismatch && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm font-bold">{t('satellite:heatmap.warnings.dateMismatchTitle')}</AlertTitle>
              <AlertDescription className="text-xs">
                <Trans
                  i18nKey="satellite:heatmap.warnings.dateMismatchDescription"
                  values={{ requested: dateMismatch.requested, actual: dateMismatch.actual }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>
          )}

          {!data && multiData.size === 0 && !leftTemporalData && !isLoading && (
            <div className="h-[600px] flex flex-col items-center justify-center text-slate-300 gap-4 bg-white rounded-xl border-2 border-dashed border-slate-100 shadow-sm">
              <div className="p-5 bg-slate-50 rounded-full shadow-inner">
                <MapIcon className="w-12 h-12 text-slate-200" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">{t('satellite:heatmap.actions.loading')}</p>
                <p className="text-[11px] text-slate-400 px-10">Configure your analysis and click the button in the sidebar to visualize satellite data.</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="h-[600px] flex flex-col items-center justify-center gap-5 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="p-4 bg-emerald-50 rounded-full shadow-lg shadow-emerald-50">
                <Loader className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <div className="text-center animate-pulse">
                <p className="font-bold text-emerald-700 uppercase tracking-widest text-xs">Processing Imagery...</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Connecting to Copernicus Hub</p>
              </div>
            </div>
          )}

          {/* Single Mode Content */}
          {viewMode === 'single' && data && !isLoading && (
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold tracking-widest uppercase">{selectedIndex}</Badge>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{selectedDate}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadData} className="h-8 text-[10px] font-bold uppercase tracking-tight bg-white border-slate-200 hover:bg-slate-50 text-slate-600">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export JSON
                  </Button>
                </CardHeader>
                <CardContent className="p-0 relative">
                  <div className="h-[600px]">
                    {visualizationType === 'leaflet' ? (
                      <LeafletHeatmapViewer
                        parcelId={parcelId}
                        parcelName={parcelName}
                        boundary={boundary}
                        initialData={data as HeatmapDataResponse}
                        selectedIndex={selectedIndex}
                        selectedDate={selectedDate}
                        embedded={true}
                        colorPalette={colorPalette}
                        baseLayer={baseLayer}
                      />
                    ) : (
                      <div className="p-4 h-full">
                        <ReactECharts
                          option={createScatterOption(data as InteractiveDataResponse)}
                          style={{ height: '100%', width: '100%' }}
                          opts={{ renderer: 'canvas' }}
                          notMerge={true}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {(data as any).statistics && [
                  { label: t('satellite:heatmap.stats.mean'), value: (data as any).statistics.mean, icon: Activity, color: 'text-blue-600' },
                  { label: t('satellite:heatmap.stats.median'), value: (data as any).statistics.median, icon: Minus, color: 'text-slate-600' },
                  { label: t('satellite:heatmap.stats.p10'), value: (data as any).statistics.p10, icon: ArrowDown, color: 'text-rose-500' },
                  { label: t('satellite:heatmap.stats.p90'), value: (data as any).statistics.p90, icon: ArrowUp, color: 'text-emerald-500' },
                  { label: t('satellite:heatmap.stats.std'), value: (data as any).statistics.std, icon: BarChart4, color: 'text-purple-600' },
                  { label: 'Pixels', value: (data as any).statistics.count, icon: LayoutGrid, color: 'text-amber-600', isCount: true },
                ].map((stat, i) => (
                  <Card key={i} className="border-slate-100 shadow-none bg-white">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
                      <stat.icon className={cn("w-3.5 h-3.5 mb-1", stat.color)} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">
                        {stat.isCount ? stat.value.toLocaleString() : stat.value.toFixed(3)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Grid Mode Content */}
          {viewMode === 'multi-grid' && multiData.size > 0 && !isLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(multiData.entries()).map(([index, indexData]) => (
                  <Card key={index} className="border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-3 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getIndexColor(index) }} />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{index}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {t('satellite:heatmap.stats.moy')} {(indexData.statistics?.mean ?? 0).toFixed(3)}
                      </span>
                    </CardHeader>
                    <div className="h-64 relative bg-slate-50">
                      <LeafletHeatmapViewer
                        parcelId={parcelId}
                        parcelName={parcelName}
                        boundary={boundary}
                        initialData={indexData}
                        selectedIndex={index}
                        selectedDate={selectedDate}
                        embedded={true}
                        colorPalette={indexColorPalettes.get(index) || 'red-green'}
                        baseLayer={baseLayer}
                        compact={true}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Multi-Grid Table Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 py-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <BarChart4 className="w-3.5 h-3.5" />
                    Comparative Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-b-slate-100">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6">{t('satellite:heatmap.multiGrid.indexComparison')}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">{t('satellite:heatmap.multiGrid.average')}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">{t('satellite:heatmap.multiGrid.stdDev')}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider pr-6">Min / Max</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(multiData.entries()).map(([index, data]) => (
                        <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-2.5 pl-6">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getIndexColor(index) }} />
                              <span className="text-xs font-bold text-slate-700">{index}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold tabular-nums text-slate-700">{(data.statistics?.mean ?? 0).toFixed(3)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-500">{(data.statistics?.std ?? 0).toFixed(3)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-500 pr-6">
                            {(data.statistics?.min ?? 0).toFixed(2)} / {(data.statistics?.max ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Multi-Overlay Mode Content */}
          {viewMode === 'multi-overlay' && multiData.size > 0 && !isLoading && (
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-700">{t('satellite:heatmap.multiOverlay.title', { date: selectedDate })}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[600px]">
                    <MultiIndexOverlayMap
                      parcelId={parcelId}
                      parcelName={parcelName}
                      boundary={boundary}
                      multiData={multiData}
                      overlayOpacity={overlayOpacity}
                      selectedDate={selectedDate}
                      baseLayer={baseLayer}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Legends Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from(multiData.keys()).map(index => (
                  <Card key={index} className="border-slate-100 shadow-none bg-white">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg shadow-sm border border-slate-100 flex items-center justify-center font-bold text-[10px] text-white" 
                        style={{ 
                          backgroundColor: getIndexColor(index),
                          opacity: overlayOpacity.get(index) || 0.7 
                        }}
                      >
                        {index.substring(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 leading-tight">{index}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Mean: {(multiData.get(index)?.statistics?.mean ?? 0).toFixed(3)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Temporal Compare Mode Content */}
          {viewMode === 'temporal-compare' && leftTemporalData && rightTemporalData && !isLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Side-by-side Maps */}
                {[
                  { id: 'left', date: selectedDate, data: leftTemporalData, color: 'bg-purple-600', label: 'Reference' },
                  { id: 'right', date: compareDate, data: rightTemporalData, color: 'bg-indigo-600', label: 'Comparison' },
                ].map((side) => (
                  <Card key={side.id} className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(side.color, "text-white text-[9px] font-bold uppercase tracking-tighter px-1.5 h-5")}>{side.label}</Badge>
                        <span className="text-xs font-bold text-slate-700">{side.date}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">MEAN: {(side.data.statistics?.mean ?? 0).toFixed(3)}</span>
                    </CardHeader>
                    <div className="h-80 bg-slate-50">
                      <LeafletHeatmapViewer
                        parcelId={parcelId}
                        parcelName={parcelName}
                        boundary={boundary}
                        initialData={side.data}
                        selectedIndex={selectedIndex}
                        selectedDate={side.date}
                        embedded={true}
                        colorPalette={colorPalette}
                        baseLayer={baseLayer}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Temporal Delta Analysis */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <GitCompareArrows className="w-3.5 h-3.5" />
                      Delta Statistics — {selectedIndex}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-200 text-purple-700 bg-purple-50">
                      Variation Analysis
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow className="border-b-slate-100">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6">{t('satellite:heatmap.stats.statistic')}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">{selectedDate}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">{compareDate}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">{t('satellite:heatmap.stats.delta')}</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider pr-6">{t('satellite:heatmap.stats.variation')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {([
                        { label: t('satellite:heatmap.stats.mean'), key: 'mean' as const },
                        { label: t('satellite:heatmap.stats.median'), key: 'median' as const },
                        { label: t('satellite:heatmap.stats.min'), key: 'min' as const },
                        { label: t('satellite:heatmap.stats.max'), key: 'max' as const },
                        { label: t('satellite:heatmap.stats.std'), key: 'std' as const },
                      ]).map(({ label, key }) => {
                        const valA = leftTemporalData.statistics?.[key] ?? 0;
                        const valB = rightTemporalData.statistics?.[key] ?? 0;
                        const delta = valB - valA;
                        const pctChange = valA !== 0 ? (delta / Math.abs(valA)) * 100 : 0;

                        return (
                          <TableRow key={key} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-2.5 pl-6 text-xs font-bold text-slate-600">{label}</TableCell>
                            <TableCell className="text-right text-xs font-bold tabular-nums text-slate-700">{valA.toFixed(3)}</TableCell>
                            <TableCell className="text-right text-xs font-bold tabular-nums text-slate-700">{valB.toFixed(3)}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              <span className={cn(
                                "inline-flex items-center font-bold px-1.5 py-0.5 rounded text-[10px]",
                                delta > 0.001 ? "text-emerald-700 bg-emerald-50" : delta < -0.001 ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-50"
                              )}>
                                {delta > 0.001 ? '+' : ''}{delta.toFixed(3)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs pr-6 tabular-nums">
                              <span className={cn(
                                "font-bold",
                                pctChange > 0.1 ? "text-emerald-600" : pctChange < -0.1 ? "text-rose-600" : "text-slate-500"
                              )}>
                                {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

// Multi-Index Overlay Map Component
const MultiIndexOverlayMap: React.FC<{
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
  multiData: Map<VegetationIndexType, HeatmapDataResponse>;
  overlayOpacity: Map<VegetationIndexType, number>;
  selectedDate: string;
  baseLayer: 'osm' | 'satellite';
}> = ({ boundary, multiData, overlayOpacity, baseLayer }) => {
  const { t } = useTranslation('satellite');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const indices = Array.from(multiData.keys());

  if (indices.length === 0 || !boundary) return null;

  const lats = boundary.map(coord => coord[1]);
  const lngs = boundary.map(coord => coord[0]);
  const center: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2
  ];

  return (
    <div className={cn("relative transition-all duration-300 overflow-hidden rounded-xl", isFullscreen ? "fixed inset-0 z-50 bg-white" : "h-full border border-slate-100")}>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-[1000] shadow-lg border border-slate-200 bg-white/90 backdrop-blur hover:bg-white"
        title={isFullscreen ? t('satellite:heatmap.fullscreen.exit') : t('satellite:heatmap.fullscreen.enter')}
      >
        {isFullscreen ? <Minimize className="w-5 h-5 text-slate-600" /> : <Maximize className="w-5 h-5 text-slate-600" />}
      </Button>

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
      >
        <LeafletBaseTileLayers
          variant={baseLayer === 'satellite' ? 'satellite' : 'streets'}
          withSatelliteReferenceLabels={baseLayer === 'satellite'}
        />

        <Polygon
          positions={boundary.map(coord => [coord[1], coord[0]] as [number, number])}
          pathOptions={{ color: '#ffffff', weight: 2, fillOpacity: 0, dashArray: '5, 10' }}
        />

        {indices.map(index => {
          const indexData = multiData.get(index);
          if (!indexData) return null;
          return (
            <GridHeatmapLayer
              key={index}
              data={indexData}
              selectedIndex={index}
              colorPalette={getIndexColorPalette(index)}
              opacity={overlayOpacity.get(index) || 0.7}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

function getDefaultPaletteForIndex(index: VegetationIndexType): ColorPalette {
  const paletteMap: Record<VegetationIndexType, ColorPalette> = {
    NDVI: 'red-green', NDRE: 'viridis', NDMI: 'blue-red', MNDWI: 'blue-red',
    GCI: 'terrain', SAVI: 'red-green', OSAVI: 'red-green', MSAVI2: 'red-green',
    NIRv: 'red-green', EVI: 'viridis', MSI: 'blue-red', MCARI: 'viridis', TCARI: 'viridis'
  };
  return paletteMap[index] || 'red-green';
}

function getIndexColorPalette(index: VegetationIndexType): ColorPalette {
  return getDefaultPaletteForIndex(index);
}

export default InteractiveIndexViewer;
