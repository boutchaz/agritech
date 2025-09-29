import React, { useState, useCallback, useEffect } from 'react';
import { Download, Layers, ZoomIn, MousePointer, Loader } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  HeatmapDataResponse,
  InteractiveDataResponse,
  convertBoundaryToGeoJSON
} from '../../lib/satellite-api';
import LeafletHeatmapViewer from './LeafletHeatmapViewer';

interface InteractiveIndexViewerProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
}

type VisualizationType = 'leaflet' | 'scatter';

const InteractiveIndexViewer: React.FC<InteractiveIndexViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  // Always default to NDVI as requested
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NDVI');
  const [selectedDate, setSelectedDate] = useState('');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('leaflet');

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | InteractiveDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const generateVisualization = useCallback(async () => {
    if (!boundary || !selectedDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const result = await satelliteApi.generateInteractiveVisualization(
        aoi,
        selectedDate,
        selectedIndex,
        visualizationType === 'leaflet' ? 'heatmap' : 'scatter'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interactive visualization');
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelName, selectedDate, selectedIndex, visualizationType]);

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
        <h1 className="text-2xl font-bold">{selectedIndex} Interactive Visualization</h1>
        <div className="text-lg text-gray-600 mt-2">
          {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
        </div>
      </div>

      {/* Configuration Panel - Simplified */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Vegetation Index</label>
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
            <label className="text-sm font-medium mb-2 block">Visualization Type</label>
            <select
              value={visualizationType}
              onChange={(e) => setVisualizationType(e.target.value as VisualizationType)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="leaflet">Leaflet Map (Recommended)</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={generateVisualization}
            disabled={isLoading || !boundary}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
            {isLoading ? 'Generating...' : 'Generate Visualization'}
          </button>

          {data && (
            <button
              onClick={downloadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export Data
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

      {/* Interactive Visualization */}
      {data && (
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
    </div>
  );
};

export default InteractiveIndexViewer;