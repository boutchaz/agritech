import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Layers, ZoomIn, MousePointer, Loader, Maximize, Minimize, GitCompareArrows, ArrowUp, ArrowDown, Minus, ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
   satelliteApi,
   VegetationIndexType,
   VEGETATION_INDICES,
   VEGETATION_INDEX_DESCRIPTIONS,
   HeatmapDataResponse,
   InteractiveDataResponse,
   convertBoundaryToGeoJSON,
   DEFAULT_CLOUD_COVERAGE
} from '../../lib/satellite-api';
import LeafletHeatmapViewer, { GridHeatmapLayer } from './LeafletHeatmapViewer';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

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
    name: 'Rouge-Vert (Défaut)',
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
    name: 'Vert-Rouge (Inversé)',
    colors: ['#228b22', '#32cd32', '#adff2f', '#ffff00', '#ffa500', '#ff6347', '#dc143c'],
    description: 'Pour indices inversés (MSI) - bas = bon'
  },
  'blue-red-inverted': {
    name: 'Bleu-Rouge (Inversé)',
    colors: ['#0000ff', '#4169e1', '#00bfff', '#ffffff', '#ff69b4', '#ff0000', '#8b0000'],
    description: 'Pour indices inversés (MSI) - bas = bon'
  }
};

const InteractiveIndexViewer: React.FC<InteractiveIndexViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
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

  const [navYear, setNavYear] = useState(() => new Date().getFullYear());
  const [navMonth, setNavMonth] = useState(() => new Date().getMonth());
  const [compareNavYear, setCompareNavYear] = useState(() => new Date().getFullYear());
  const [compareNavMonth, setCompareNavMonth] = useState(() => new Date().getMonth());
  const [compareAvailableDates, setCompareAvailableDates] = useState<string[]>([]);
  const [compareIsLoadingDates, setCompareIsLoadingDates] = useState(false);
  const [compareDatesLoaded, setCompareDatesLoaded] = useState(false);

  const navMonthLabel = useMemo(() => {
    const d = new Date(navYear, navMonth, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [navYear, navMonth]);

  const compareNavMonthLabel = useMemo(() => {
    const d = new Date(compareNavYear, compareNavMonth, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [compareNavYear, compareNavMonth]);

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
    setCompareDatesLoaded(false);
    setCompareAvailableDates([]);
  }, []);

  const fetchAvailableDates = useCallback(async () => {
    if (!boundary || isLoadingDates) return;

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
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0],
        DEFAULT_CLOUD_COVERAGE,
        parcelId
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
    }
  }, [boundary, parcelName, isLoadingDates, navYear, navMonth, parcelId]);

  const fetchCompareAvailableDates = useCallback(async () => {
    if (!boundary || compareIsLoadingDates) return;

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
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0],
        DEFAULT_CLOUD_COVERAGE,
        parcelId
      );

      const dates = result.available_dates
        .filter(d => d.available)
        .map(d => d.date);

      setCompareAvailableDates(dates);
      setCompareDatesLoaded(true);

      if (dates.length > 0) {
        setCompareDate(dates[dates.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch compare available dates:', err);
      setCompareDatesLoaded(true);
    } finally {
      setCompareIsLoadingDates(false);
    }
  }, [boundary, parcelName, compareIsLoadingDates, compareNavYear, compareNavMonth, parcelId]);

  useEffect(() => {
    if (boundary && !datesLoaded && !isLoadingDates) {
      fetchAvailableDates();
    }
  }, [boundary, datesLoaded, isLoadingDates, fetchAvailableDates]);

  useEffect(() => {
    if (viewMode !== 'temporal-compare') return;
    if (boundary && !compareDatesLoaded && !compareIsLoadingDates) {
      fetchCompareAvailableDates();
    }
  }, [viewMode, boundary, compareDatesLoaded, compareIsLoadingDates, fetchCompareAvailableDates]);

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
          setError('Veuillez sélectionner les deux dates pour la comparaison.');
          setIsLoading(false);
          return;
        }

        const [leftResult, rightResult] = await Promise.all([
          satelliteApi.generateInteractiveVisualization(aoi, selectedDate, selectedIndex, 'heatmap', parcelId) as Promise<HeatmapDataResponse>,
          satelliteApi.generateInteractiveVisualization(aoi, compareDate, selectedIndex, 'heatmap', parcelId) as Promise<HeatmapDataResponse>,
        ]);

        // Check for date mismatch in temporal compare mode
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

        // Check for date mismatch in single mode
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

            // Check for date mismatch (only report the first one found)
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate interactive visualization';

      if (errorMessage.includes('No images found')) {
        setError(`No satellite imagery available for ${selectedDate}. Please select a different date from the calendar.`);
      } else if (errorMessage.includes('cloud coverage')) {
        setError('Error processing cloud coverage. The selected date may have too much cloud cover.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelName, selectedDate, compareDate, selectedIndex, selectedIndices, visualizationType, viewMode, parcelId, indexColorPalettes]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      NIRv: '#ef4444', EVI: '#0ea5e9', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  const createScatterOption = (data: InteractiveDataResponse): EChartsOption => {
    const { pixel_data, visualization, index } = data;

    return {
      title: {
        text: `${index} - Interactive Scatter Plot`,
        subtext: data.date,
        left: 'center'
      },
      tooltip: {
        formatter: function (params: any) {
          const [lon, lat, value] = params.data;
          return `
            <div style="padding: 8px;">
              <div><strong>${index}: ${value.toFixed(3)}</strong></div>
              <div>Longitude: ${lon.toFixed(6)}</div>
              <div>Latitude: ${lat.toFixed(6)}</div>
            </div>
          `;
        }
      },
      grid: {
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Longitude',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: 'Latitude',
        nameLocation: 'middle',
        nameGap: 50
      },
      visualMap: {
        min: visualization.min,
        max: visualization.max,
        dimension: 2,
        orient: 'vertical',
        left: 'right',
        top: 'middle',
        inRange: {
          color: visualization.palette
        }
      },
      series: [{
        name: index,
        type: 'scatter',
        data: pixel_data.map(p => [p.lon, p.lat, p.value]),
        symbolSize: function (value: number[]) {
          return Math.max(4, Math.min(12, (value[2] - visualization.min) / (visualization.max - visualization.min) * 8 + 4));
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
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header - Clean and focused */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          {viewMode === 'single'
            ? `${selectedIndex} Interactive Visualization`
            : viewMode === 'multi-grid'
            ? 'Multi-Index Comparison (Grille)'
            : viewMode === 'temporal-compare'
            ? `Comparaison Temporelle — ${selectedIndex}`
            : 'Multi-Index Overlay (Même Carte)'}
        </h1>
        <div className="text-lg text-gray-600 mt-2">
          {viewMode === 'single'
            ? VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]
            : viewMode === 'multi-grid'
            ? 'Comparer plusieurs indices côte à côte'
            : viewMode === 'temporal-compare'
            ? 'Comparer le même indice entre deux dates différentes'
            : 'Superposer plusieurs indices sur la même carte'}
        </div>
      </div>

      {/* Configuration Panel - Enhanced */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'single' ? 'default' : 'outline'}
            className={cn("flex-1", viewMode === 'single' && "bg-green-600 hover:bg-green-700")}
            onClick={() => setViewMode('single')}
          >
            Vue Simple
          </Button>
          <Button
            variant={viewMode === 'multi-grid' ? 'default' : 'outline'}
            className={cn("flex-1", viewMode === 'multi-grid' && "bg-green-600 hover:bg-green-700")}
            onClick={() => setViewMode('multi-grid')}
          >
            Multi-Grille
          </Button>
          <Button
            variant={viewMode === 'multi-overlay' ? 'default' : 'outline'}
            className={cn("flex-1", viewMode === 'multi-overlay' && "bg-green-600 hover:bg-green-700")}
            onClick={() => setViewMode('multi-overlay')}
          >
            Multi-Overlay
          </Button>
          <Button
            variant={viewMode === 'temporal-compare' ? 'default' : 'outline'}
            className={cn("flex-1", viewMode === 'temporal-compare' && "bg-purple-600 hover:bg-purple-700")}
            onClick={() => setViewMode('temporal-compare')}
          >
            <GitCompareArrows className="w-4 h-4 mr-1" />
            Comparaison
          </Button>
        </div>

        {/* Base Layer Selector (for leaflet views) */}
        {(viewMode === 'single' && visualizationType === 'leaflet') || viewMode !== 'single' ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Fond de Carte</label>
            <div className="flex gap-2">
              <Button
                variant={baseLayer === 'osm' ? 'default' : 'outline'}
                className={cn("flex-1", baseLayer === 'osm' && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => setBaseLayer('osm')}
              >
                OpenStreetMap
              </Button>
              <Button
                variant={baseLayer === 'satellite' ? 'default' : 'outline'}
                className={cn("flex-1", baseLayer === 'satellite' && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => setBaseLayer('satellite')}
              >
                🛰️ Vue Satellite
              </Button>
            </div>
          </div>
        ) : null}

        {viewMode !== 'temporal-compare' && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[160px] text-center capitalize">
              {navMonthLabel}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(1)}
              disabled={navYear === new Date().getFullYear() && navMonth >= new Date().getMonth()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            {isLoadingDates && <Loader className="w-4 h-4 text-blue-600 animate-spin" />}
            {datesLoaded && (
              <span className="text-xs text-gray-500">
                {availableDates.length} date{availableDates.length !== 1 ? 's' : ''} disponible{availableDates.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {viewMode === 'temporal-compare' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Indice de Végétation</label>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {VEGETATION_INDICES.map(index => (
                    <option key={index} value={index}>{index}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Palette de Couleurs</label>
                <select
                  value={colorPalette}
                  onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                    <option key={key} value={key}>{palette.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[160px] text-center capitalize">
                  {navMonthLabel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth(1)}
                  disabled={navYear === new Date().getFullYear() && navMonth >= new Date().getMonth()}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {isLoadingDates && <Loader className="w-4 h-4 text-blue-600 animate-spin" />}
                {datesLoaded && (
                  <span className="text-xs text-gray-500">
                    {availableDates.length} date{availableDates.length !== 1 ? 's' : ''} disponible{availableDates.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date A (Avant)</label>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                  availableDates={availableDates}
                  isLoading={isLoadingDates}
                  disabled={!boundary}
                  placeholder="Date de référence"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateCompareMonth(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[160px] text-center capitalize">
                  {compareNavMonthLabel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateCompareMonth(1)}
                  disabled={compareNavYear === new Date().getFullYear() && compareNavMonth >= new Date().getMonth()}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {compareIsLoadingDates && <Loader className="w-4 h-4 text-blue-600 animate-spin" />}
                {compareDatesLoaded && (
                  <span className="text-xs text-gray-500">
                    {compareAvailableDates.length} date{compareAvailableDates.length !== 1 ? 's' : ''} disponible{compareAvailableDates.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date B (Après)</label>
                <DatePicker
                  value={compareDate}
                  onChange={(date) => date && setCompareDate(date)}
                  availableDates={compareAvailableDates}
                  isLoading={compareIsLoadingDates}
                  disabled={!boundary}
                  placeholder="Date à comparer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                availableDates={availableDates}
                isLoading={isLoadingDates}
                disabled={!boundary}
                placeholder="Select date with satellite data"
              />
            </div>

            {viewMode === 'single' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Indice de Végétation</label>
                  <select
                    value={selectedIndex}
                    onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {VEGETATION_INDICES.map(index => (
                      <option key={index} value={index}>{index}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type de Visualisation</label>
                  <select
                    value={visualizationType}
                    onChange={(e) => setVisualizationType(e.target.value as VisualizationType)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="leaflet">Carte Leaflet (Recommandé)</option>
                    <option value="scatter">Nuage de Points</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Indices à Comparer</label>
                <div className="grid grid-cols-3 gap-2">
                  {VEGETATION_INDICES.map(index => (
                    <label key={index} className="flex items-center gap-2 p-2 border rounded-md hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIndices.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIndices([...selectedIndices, index]);
                          } else {
                            setSelectedIndices(selectedIndices.filter(i => i !== index));
                          }
                        }}
                        className="rounded text-green-600"
                      />
                      <span className="text-sm font-medium">{index}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Opacity Controls for Multi-Overlay */}
        {viewMode === 'multi-overlay' && selectedIndices.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Opacité des Overlays</label>
            <div className="space-y-2">
              {selectedIndices.map(index => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getIndexColor(index) }}
                    />
                    <span className="text-sm font-medium">{index}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(overlayOpacity.get(index) || 0.7) * 100}
                    onChange={(e) => {
                      const newOpacity = new Map(overlayOpacity);
                      newOpacity.set(index, parseFloat(e.target.value) / 100);
                      setOverlayOpacity(newOpacity);
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {Math.round((overlayOpacity.get(index) || 0.7) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Color Palette Selector for Single View */}
        {viewMode === 'single' && visualizationType === 'leaflet' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Palette de Couleurs</label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {(Object.entries(COLOR_PALETTES) as [ColorPalette, typeof COLOR_PALETTES[ColorPalette]][]).map(([key, palette]) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => setColorPalette(key)}
                  className={cn(
                    "h-auto flex-col items-start p-3",
                    colorPalette === key && "border-green-600 bg-green-50 dark:bg-green-900/20"
                  )}
                >
                  <div className="text-xs font-medium mb-1">{palette.name}</div>
                  <div className="flex h-4 w-full rounded overflow-hidden">
                    {palette.colors.map((color, i) => (
                      <div key={i} style={{ backgroundColor: color, flex: 1 }} />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{palette.description}</div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Color Palette Selectors for Multi-Grid View - Per Index */}
        {viewMode === 'multi-grid' && selectedIndices.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-3 block">Palettes de Couleurs par Indice</label>
            <div className="space-y-3">
              {selectedIndices.map((index) => (
                <div key={index} className="bg-white rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getIndexColor(index) }}
                      />
                      <span className="text-sm font-medium">{index}</span>
                    </div>
                    <select
                      value={indexColorPalettes.get(index) || 'red-green'}
                      onChange={(e) => {
                        const newPalettes = new Map(indexColorPalettes);
                        newPalettes.set(index, e.target.value as ColorPalette);
                        setIndexColorPalettes(newPalettes);
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                        <option key={key} value={key}>
                          {palette.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Show color preview */}
                  <div className="flex h-3 rounded overflow-hidden">
                    {COLOR_PALETTES[indexColorPalettes.get(index) || 'red-green'].colors.map((color, i) => (
                      <div key={i} style={{ backgroundColor: color, flex: 1 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button
            onClick={generateVisualization}
            disabled={
              isLoading || !boundary || !datesLoaded || !selectedDate ||
              (viewMode === 'temporal-compare' && (!selectedDate || !compareDate)) ||
              (viewMode !== 'single' && viewMode !== 'temporal-compare' && selectedIndices.length === 0)
            }
            className={viewMode === 'temporal-compare' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : viewMode === 'temporal-compare' ? <GitCompareArrows className="w-4 h-4 mr-2" /> : <ZoomIn className="w-4 h-4 mr-2" />}
            {isLoading ? 'Génération...' : viewMode === 'temporal-compare' ? 'Comparer les Dates' : 'Générer la Visualisation'}
          </Button>

          {((viewMode === 'single' && data) || (viewMode !== 'single' && multiData.size > 0)) && (
            <Button
              onClick={downloadData}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter les Données
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Date Fallback Warning */}
      {dateMismatch && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium text-sm">Date de données différente</p>
            <p className="text-amber-700 text-sm mt-1">
              Aucune image satellite disponible pour le <strong>{dateMismatch.requested}</strong>.
              Données du <strong>{dateMismatch.actual}</strong> affichées à la place.
            </p>
          </div>
        </div>
      )}

      {/* Single Index Visualization */}
      {viewMode === 'single' && data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5" style={{ color: getIndexColor(selectedIndex) }} />
              {selectedIndex} Interactive Visualization
            </h3>
            <div className="text-sm text-gray-600">
              {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600">Mean</div>
              <div className="font-semibold">{(data.statistics?.mean ?? 0).toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Median</div>
              <div className="font-semibold">{(data.statistics?.median ?? 0).toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">P10</div>
              <div className="font-semibold">{(data.statistics?.p10 ?? 0).toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">P90</div>
              <div className="font-semibold">{(data.statistics?.p90 ?? 0).toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Std Dev</div>
              <div className="font-semibold">{(data.statistics?.std ?? 0).toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Count</div>
              <div className="font-semibold">{(data.statistics?.count ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Visualization Display */}
          {visualizationType === 'leaflet' ? (
            <LeafletHeatmapViewer
              parcelId={parcelId}
              parcelName={parcelName}
              boundary={boundary}
              initialData={data != null && typeof data === 'object' && 'pixel_data' in data ? data as HeatmapDataResponse : null}
              selectedIndex={selectedIndex}
              selectedDate={selectedDate}
              embedded={true}
              colorPalette={colorPalette}
              baseLayer={baseLayer}
            />
          ) : (
            <div className="bg-white border rounded-lg p-4">
              <ReactECharts
                option={createScatterOption(data as InteractiveDataResponse)}
                style={{ height: '600px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            </div>
          )}

          {/* Interactive Features Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Interactive Features</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Hover:</strong> View exact values and coordinates for each pixel</p>
              <p>• <strong>Zoom:</strong> Use mouse wheel or zoom controls to examine specific areas</p>
              <p>• <strong>Pan:</strong> Click and drag to move around the visualization</p>
              <p>• <strong>Legend:</strong> Click legend items to show/hide data series</p>
              <p>• <strong>Export:</strong> Download data as JSON</p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Index Grid Comparison View */}
      {viewMode === 'multi-grid' && multiData.size > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Comparaison des Indices - {selectedDate}</h3>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(multiData.entries()).map(([index, indexData]) => (
              <div key={index} className="bg-white border-2 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{index}</h4>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getIndexColor(index) }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {VEGETATION_INDEX_DESCRIPTIONS[index]}
                  </p>
                </div>

                {/* Mini statistics */}
                <div className="p-3 bg-gray-50 border-b">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-600">Moy.</div>
                      <div className="font-semibold">{(indexData.statistics?.mean ?? 0).toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Min</div>
                      <div className="font-semibold">{(indexData.statistics?.min ?? 0).toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Max</div>
                      <div className="font-semibold">{(indexData.statistics?.max ?? 0).toFixed(3)}</div>
                    </div>
                  </div>
                </div>

                {/* Mini heatmap */}
                <div className="relative h-48">
                  {/* Index Badge Overlay */}
                  <div className="absolute top-2 left-2 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getIndexColor(index) }}
                    />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{index}</span>
                  </div>

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
              </div>
            ))}
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Comparaison des Moyennes</h4>
            <ReactECharts
              option={{
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' }
                },
                grid: {
                  left: '3%',
                  right: '4%',
                  bottom: '3%',
                  containLabel: true
                },
                xAxis: {
                  type: 'category',
                  data: Array.from(multiData.keys()),
                  axisLabel: {
                    rotate: 45
                  }
                },
                yAxis: {
                  type: 'value',
                  name: 'Valeur Moyenne'
                },
                series: [
                  {
                    name: 'Moyenne',
                    type: 'bar',
                    data: Array.from(multiData.entries()).map(([index, data]) => ({
                      value: data.statistics.mean,
                      itemStyle: { color: getIndexColor(index) }
                    })),
                    label: {
                      show: true,
                      position: 'top',
                      formatter: '{c}'
                    }
                  }
                ]
              }}
              style={{ height: '300px', width: '100%' }}
            />
          </div>

          {/* Comparison Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moyenne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médiane
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Écart-type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min / Max
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pixels
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(multiData.entries()).map(([index, data]) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getIndexColor(index) }}
                        />
                        <span className="font-medium">{index}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(data.statistics?.mean ?? 0).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(data.statistics?.median ?? 0).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(data.statistics?.std ?? 0).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(data.statistics?.min ?? 0).toFixed(3)} / {(data.statistics?.max ?? 0).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(data.statistics?.count ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Index Overlay View - All indices on the same map */}
      {viewMode === 'multi-overlay' && multiData.size > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Superposition des Indices - {selectedDate}</h3>
            <div className="text-sm text-gray-600">
              Utilisez les curseurs d'opacité pour ajuster la visibilité de chaque indice
            </div>
          </div>

          {/* Overlaid Map */}
          <div className="bg-white border rounded-lg overflow-hidden">
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

          {/* Legend for overlays */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Légende des Indices</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from(multiData.keys()).map(index => (
                <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                  <div
                    className="w-6 h-6 rounded"
                    style={{
                      backgroundColor: getIndexColor(index),
                      opacity: overlayOpacity.get(index) || 0.7
                    }}
                  />
                  <div>
                    <div className="font-medium text-sm">{index}</div>
                    <div className="text-xs text-gray-500">
                      {VEGETATION_INDEX_DESCRIPTIONS[index]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-4">Moyennes par Indice</h4>
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                  },
                  grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                  },
                  xAxis: {
                    type: 'category',
                    data: Array.from(multiData.keys()),
                    axisLabel: {
                      rotate: 45
                    }
                  },
                  yAxis: {
                    type: 'value',
                    name: 'Valeur'
                  },
                  series: [
                    {
                      name: 'Moyenne',
                      type: 'bar',
                      data: Array.from(multiData.entries()).map(([index, data]) => ({
                        value: data.statistics.mean,
                        itemStyle: { color: getIndexColor(index) }
                      }))
                    }
                  ]
                }}
                style={{ height: '300px', width: '100%' }}
              />
            </div>

            {/* Statistics Table */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-4">Statistiques Détaillées</h4>
              <div className="overflow-auto max-h-[300px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Indice</th>
                      <th className="px-3 py-2 text-right">Moy.</th>
                      <th className="px-3 py-2 text-right">Min</th>
                      <th className="px-3 py-2 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(multiData.entries()).map(([index, data]) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getIndexColor(index) }}
                            />
                            <span className="font-medium">{index}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{(data.statistics?.mean ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-right">{(data.statistics?.min ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-right">{(data.statistics?.max ?? 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporal Comparison View */}
      {viewMode === 'temporal-compare' && leftTemporalData && rightTemporalData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-purple-600" />
              {selectedIndex} — {selectedDate} vs {compareDate}
            </h3>
          </div>

          {/* Side-by-side Maps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Map - Date A */}
            <div className="bg-white border-2 border-purple-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 p-3 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg text-purple-900">Date A: {selectedDate}</h4>
                  <span className="text-sm text-purple-700 font-medium">
                    Moy: {(leftTemporalData.statistics?.mean ?? 0).toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="relative h-[400px]">
                <LeafletHeatmapViewer
                  parcelId={parcelId}
                  parcelName={parcelName}
                  boundary={boundary}
                  initialData={leftTemporalData}
                  selectedIndex={selectedIndex}
                  selectedDate={selectedDate}
                  embedded={true}
                  colorPalette={colorPalette}
                  baseLayer={baseLayer}
                />
              </div>
            </div>

            {/* Right Map - Date B */}
            <div className="bg-white border-2 border-purple-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 p-3 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg text-purple-900">Date B: {compareDate}</h4>
                  <span className="text-sm text-purple-700 font-medium">
                    Moy: {(rightTemporalData.statistics?.mean ?? 0).toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="relative h-[400px]">
                <LeafletHeatmapViewer
                  parcelId={parcelId}
                  parcelName={parcelName}
                  boundary={boundary}
                  initialData={rightTemporalData}
                  selectedIndex={selectedIndex}
                  selectedDate={compareDate}
                  embedded={true}
                  colorPalette={colorPalette}
                  baseLayer={baseLayer}
                />
              </div>
            </div>
          </div>

          {/* Delta Statistics */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-purple-50 p-4 border-b">
              <h4 className="font-semibold text-purple-900">
                Comparaison Statistique — {selectedIndex}
              </h4>
              <p className="text-sm text-purple-700 mt-1">
                Variation entre {selectedDate} et {compareDate}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statistique</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date A ({selectedDate})</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date B ({compareDate})</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delta</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variation %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {([
                    { label: 'Moyenne', key: 'mean' as const },
                    { label: 'Médiane', key: 'median' as const },
                    { label: 'Minimum', key: 'min' as const },
                    { label: 'Maximum', key: 'max' as const },
                    { label: 'P10', key: 'p10' as const },
                    { label: 'P90', key: 'p90' as const },
                    { label: 'Écart-type', key: 'std' as const },
                  ]).map(({ label, key }) => {
                    const valA = leftTemporalData.statistics?.[key] ?? 0;
                    const valB = rightTemporalData.statistics?.[key] ?? 0;
                    const delta = valB - valA;
                    const pctChange = valA !== 0 ? (delta / Math.abs(valA)) * 100 : 0;

                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{label}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums">{valA.toFixed(3)}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums">{valB.toFixed(3)}</td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums">
                          <span className={`inline-flex items-center gap-1 ${delta > 0.001 ? 'text-green-600' : delta < -0.001 ? 'text-red-600' : 'text-gray-500'}`}>
                            {delta > 0.001 ? <ArrowUp className="w-3 h-3" /> : delta < -0.001 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right tabular-nums">
                          <span className={`${pctChange > 0.1 ? 'text-green-600' : pctChange < -0.1 ? 'text-red-600' : 'text-gray-500'}`}>
                            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-3 text-sm text-gray-900">Pixels</td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums">{(leftTemporalData.statistics?.count ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums">{(rightTemporalData.statistics?.count ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-500">—</td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-500">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Comparaison Visuelle</h4>
            <ReactECharts
              option={{
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' }
                },
                legend: {
                  data: [selectedDate, compareDate]
                },
                grid: {
                  left: '3%',
                  right: '4%',
                  bottom: '3%',
                  containLabel: true
                },
                xAxis: {
                  type: 'category',
                  data: ['Moyenne', 'Médiane', 'Min', 'Max', 'P10', 'P90', 'Écart-type']
                },
                yAxis: {
                  type: 'value',
                  name: selectedIndex
                },
                series: [
                  {
                    name: selectedDate,
                    type: 'bar',
                    data: [
                      leftTemporalData.statistics?.mean ?? 0,
                      leftTemporalData.statistics?.median ?? 0,
                      leftTemporalData.statistics?.min ?? 0,
                      leftTemporalData.statistics?.max ?? 0,
                      leftTemporalData.statistics?.p10 ?? 0,
                      leftTemporalData.statistics?.p90 ?? 0,
                      leftTemporalData.statistics?.std ?? 0,
                    ],
                    itemStyle: { color: '#8b5cf6' }
                  },
                  {
                    name: compareDate,
                    type: 'bar',
                    data: [
                      rightTemporalData.statistics?.mean ?? 0,
                      rightTemporalData.statistics?.median ?? 0,
                      rightTemporalData.statistics?.min ?? 0,
                      rightTemporalData.statistics?.max ?? 0,
                      rightTemporalData.statistics?.p10 ?? 0,
                      rightTemporalData.statistics?.p90 ?? 0,
                      rightTemporalData.statistics?.std ?? 0,
                    ],
                    itemStyle: { color: '#a78bfa' }
                  }
                ]
              }}
              style={{ height: '300px', width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Multi-Index Overlay Map Component - Unified layer with all indices
const MultiIndexOverlayMap: React.FC<{
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
  multiData: Map<VegetationIndexType, HeatmapDataResponse>;
  overlayOpacity: Map<VegetationIndexType, number>;
  selectedDate: string;
  baseLayer: 'osm' | 'satellite';
}> = ({ boundary, multiData, overlayOpacity, baseLayer }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const indices = Array.from(multiData.keys());

  if (indices.length === 0 || !boundary) return null;

  // Calculate center point from boundary
  const lats = boundary.map(coord => coord[1]);
  const lngs = boundary.map(coord => coord[0]);
  const center: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2
  ];

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[600px]'}`}>
      {/* Fullscreen Toggle Button */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg p-2 shadow-lg transition-colors"
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {/* Single unified map with all indices as layers */}
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        {/* Base Layer */}
        {baseLayer === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* Parcel boundary */}
        <Polygon
          positions={boundary.map(coord => [coord[1], coord[0]] as [number, number])}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0,
            dashArray: '5, 10'
          }}
        />

        {/* Render all index heatmap layers on the same map */}
        {indices.map(index => {
          const indexData = multiData.get(index);
          if (!indexData) return null;

          const opacity = overlayOpacity.get(index) || 0.7;

          return (
            <GridHeatmapLayer
              key={index}
              data={indexData}
              selectedIndex={index}
              colorPalette={getIndexColorPalette(index)}
              opacity={opacity}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

// Helper to get default color palette for each index
function getDefaultPaletteForIndex(index: VegetationIndexType): ColorPalette {
  // Assign different palettes to different indices for better distinction
  const paletteMap: Record<VegetationIndexType, ColorPalette> = {
    NDVI: 'red-green',
    NDRE: 'viridis',
    NDMI: 'blue-red',
    MNDWI: 'blue-red',
    GCI: 'terrain',
    SAVI: 'red-green',
    OSAVI: 'red-green',
    MSAVI2: 'red-green',
    NIRv: 'red-green',
    EVI: 'viridis',
    MSI: 'blue-red',
    MCARI: 'viridis',
    TCARI: 'viridis'
  };
  return paletteMap[index] || 'red-green';
}

// Helper to get appropriate color palette for each index (for overlay view)
function getIndexColorPalette(index: VegetationIndexType): ColorPalette {
  return getDefaultPaletteForIndex(index);
}

export default InteractiveIndexViewer;
