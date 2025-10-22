import React, { useState, useCallback, useEffect } from 'react';
import { Download, Layers, ZoomIn, MousePointer, Loader, Maximize, Minimize } from 'lucide-react';
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
  convertBoundaryToGeoJSON
} from '../../lib/satellite-api';
import LeafletHeatmapViewer, { GridHeatmapLayer } from './LeafletHeatmapViewer';
import { DatePicker } from '../ui/DatePicker';

interface InteractiveIndexViewerProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
}

type VisualizationType = 'leaflet' | 'scatter';

// Color palette configurations
export type ColorPalette = 'viridis' | 'red-green' | 'blue-red' | 'rainbow' | 'terrain';

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
    colors: ['#0000ff', '#4169e1', '#00bfff', '#ffffff', '#ff69b4', '#ff0000', '#8b0000'],
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
  }
};

const InteractiveIndexViewer: React.FC<InteractiveIndexViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  // View mode: single, multi-grid, or multi-overlay
  const [viewMode, setViewMode] = useState<'single' | 'multi-grid' | 'multi-overlay'>('single');

  // Always default to NDVI as requested
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NDVI');
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NDVI', 'NDRE', 'NDMI']);
  const [selectedDate, setSelectedDate] = useState('');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('leaflet');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('red-green');
  const [baseLayer, setBaseLayer] = useState<'osm' | 'satellite'>('osm');

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | InteractiveDataResponse | null>(null);
  const [multiData, setMultiData] = useState<Map<VegetationIndexType, HeatmapDataResponse>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Overlay opacity control (per index)
  const [overlayOpacity, setOverlayOpacity] = useState<Map<VegetationIndexType, number>>(
    new Map([['NDVI', 0.7], ['NDRE', 0.7], ['NDMI', 0.7]])
  );

  // Available dates state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  // Fetch available dates when boundary changes
  useEffect(() => {
    if (!boundary) return;

    const fetchAvailableDates = async () => {
      setIsLoadingDates(true);
      try {
        const aoi = {
          geometry: convertBoundaryToGeoJSON(boundary),
          name: parcelName || 'Selected Parcel'
        };

        // Get dates for last 6 months
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 6);

        const result = await satelliteApi.getAvailableDates(
          aoi,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          30 // 30% cloud coverage threshold
        );

        const dates = result.available_dates
          .filter(d => d.available)
          .map(d => d.date);

        setAvailableDates(dates);

        // Set initial date to the most recent available date
        if (dates.length > 0) {
          setSelectedDate(dates[dates.length - 1]);
        }
      } catch (err) {
        console.error('Failed to fetch available dates:', err);
        // Fallback to today's date
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
      } finally {
        setIsLoadingDates(false);
      }
    };

    fetchAvailableDates();
  }, [boundary, parcelName]);

  const generateVisualization = useCallback(async () => {
    if (!boundary || !selectedDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      if (viewMode === 'single') {
        const result = await satelliteApi.generateInteractiveVisualization(
          aoi,
          selectedDate,
          selectedIndex,
          visualizationType === 'leaflet' ? 'heatmap' : 'scatter'
        );
        setData(result);
      } else {
        // Multi-index mode (both grid and overlay): fetch data for all selected indices
        const results = new Map<VegetationIndexType, HeatmapDataResponse>();

        for (const index of selectedIndices) {
          try {
            const result = await satelliteApi.generateInteractiveVisualization(
              aoi,
              selectedDate,
              index,
              'heatmap'
            ) as HeatmapDataResponse;
            results.set(index, result);
          } catch (err) {
            console.error(`Failed to fetch ${index}:`, err);
          }
        }

        setMultiData(results);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate interactive visualization';

      // Provide more helpful error messages
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
  }, [boundary, parcelName, selectedDate, selectedIndex, selectedIndices, visualizationType, viewMode]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      PRI: '#ef4444', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
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
            : 'Multi-Index Overlay (Même Carte)'}
        </h1>
        <div className="text-lg text-gray-600 mt-2">
          {viewMode === 'single'
            ? VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]
            : viewMode === 'multi-grid'
            ? 'Comparer plusieurs indices côte à côte'
            : 'Superposer plusieurs indices sur la même carte'}
        </div>
      </div>

      {/* Configuration Panel - Enhanced */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        {/* View Mode Selector */}
        <div className="flex gap-2 p-1 bg-white rounded-lg border">
          <button
            onClick={() => setViewMode('single')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              viewMode === 'single'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Vue Simple
          </button>
          <button
            onClick={() => setViewMode('multi-grid')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              viewMode === 'multi-grid'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Multi-Grille
          </button>
          <button
            onClick={() => setViewMode('multi-overlay')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              viewMode === 'multi-overlay'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Multi-Overlay
          </button>
        </div>

        {/* Base Layer Selector (for leaflet views) */}
        {(viewMode === 'single' && visualizationType === 'leaflet') || viewMode !== 'single' ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Fond de Carte</label>
            <div className="flex gap-2 p-1 bg-white rounded-lg border">
              <button
                onClick={() => setBaseLayer('osm')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                  baseLayer === 'osm'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                OpenStreetMap
              </button>
              <button
                onClick={() => setBaseLayer('satellite')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                  baseLayer === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🛰️ Vue Satellite
              </button>
            </div>
          </div>
        ) : null}

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

        {/* Color Palette Selector (only for leaflet heatmap, not for overlay mode) */}
        {((viewMode === 'single' && visualizationType === 'leaflet') || viewMode === 'multi-grid') ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Palette de Couleurs</label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {(Object.entries(COLOR_PALETTES) as [ColorPalette, typeof COLOR_PALETTES[ColorPalette]][]).map(([key, palette]) => (
                <button
                  key={key}
                  onClick={() => setColorPalette(key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    colorPalette === key
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">{palette.name}</div>
                  <div className="flex h-4 rounded overflow-hidden">
                    {palette.colors.map((color, i) => (
                      <div key={i} style={{ backgroundColor: color, flex: 1 }} />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{palette.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4">
          <button
            onClick={generateVisualization}
            disabled={isLoading || !boundary || (viewMode !== 'single' && selectedIndices.length === 0)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
            {isLoading ? 'Génération...' : 'Générer la Visualisation'}
          </button>

          {((viewMode === 'single' && data) || (viewMode !== 'single' && multiData.size > 0)) && (
            <button
              onClick={downloadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Exporter les Données
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
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
              <div className="font-semibold">{data.statistics.mean.toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Median</div>
              <div className="font-semibold">{data.statistics.median.toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">P10</div>
              <div className="font-semibold">{data.statistics.p10.toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">P90</div>
              <div className="font-semibold">{data.statistics.p90.toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Std Dev</div>
              <div className="font-semibold">{data.statistics.std.toFixed(3)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Count</div>
              <div className="font-semibold">{data.statistics.count}</div>
            </div>
          </div>

          {/* Visualization Display */}
          {visualizationType === 'leaflet' ? (
            <LeafletHeatmapViewer
              parcelId={parcelId}
              parcelName={parcelName}
              boundary={boundary}
              initialData={'pixel_data' in data ? data as HeatmapDataResponse : null}
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
                      <div className="font-semibold">{indexData.statistics.mean.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Min</div>
                      <div className="font-semibold">{indexData.statistics.min.toFixed(3)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Max</div>
                      <div className="font-semibold">{indexData.statistics.max.toFixed(3)}</div>
                    </div>
                  </div>
                </div>

                {/* Mini heatmap */}
                <div className="h-48">
                  <LeafletHeatmapViewer
                    parcelId={parcelId}
                    parcelName={parcelName}
                    boundary={boundary}
                    initialData={indexData}
                    selectedIndex={index}
                    selectedDate={selectedDate}
                    embedded={true}
                    colorPalette={colorPalette}
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
                      {data.statistics.mean.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {data.statistics.median.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {data.statistics.std.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {data.statistics.min.toFixed(3)} / {data.statistics.max.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {data.statistics.count.toLocaleString()}
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
                        <td className="px-3 py-2 text-right">{data.statistics.mean.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right">{data.statistics.min.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right">{data.statistics.max.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
}> = ({ parcelId, parcelName, boundary, multiData, overlayOpacity, selectedDate, baseLayer }) => {
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

// Helper to get appropriate color palette for each index
function getIndexColorPalette(index: VegetationIndexType): ColorPalette {
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
    PRI: 'rainbow',
    MSI: 'blue-red',
    MCARI: 'viridis',
    TCARI: 'viridis'
  };
  return paletteMap[index] || 'red-green';
}

export default InteractiveIndexViewer;