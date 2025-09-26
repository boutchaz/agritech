import React, { useState, useCallback, useEffect } from 'react';
import { Activity, Download, Layers, ZoomIn, MousePointer, Loader, Map, BarChart3 } from 'lucide-react';
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

type VisualizationType = 'heatmap' | 'scatter' | 'leaflet';

const InteractiveIndexViewer: React.FC<InteractiveIndexViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NDVI');
  const [selectedDate, setSelectedDate] = useState('');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('leaflet');
  const [gridSize, setGridSize] = useState(50);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | InteractiveDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartRef, setChartRef] = useState<any>(null);

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
        visualizationType
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

  const createHeatmapOption = (data: HeatmapDataResponse): EChartsOption => {
    const { heatmap_data, statistics, coordinate_system, index, bounds } = data;

    // Filter only valid AOI data points from backend - those inside the AOI boundary 
    const aoIData = heatmap_data.filter(([, , value]) => value !== null && value !== undefined);

    return {
      title: {
        text: `${index} AOI Heatmap`,
        subtext: `Analysis for ${data.date} - Following Parcel Shape`,
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      backgroundColor: '#fff',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#fff'
        },
        formatter: function (params: any) {
          const [x, y, value] = params.data;
          const lon = coordinate_system.x_axis[x];
          const lat = coordinate_system.y_axis[y];
          return `
            <div style="padding: 8px; line-height: 1.4">
              <strong style="color: #4CAF50; font-size: 14px">${index} AOI Analysis</strong><br/>
              <span style="color: #FFC107">Value: ${value.toFixed(3)}</span><br/>
              <span style="color: #E3F2FD">Grid: [${x}, ${y}]</span><br/>
              <span style="color: #E3F2FD">Position: ${lon.toFixed(4)}°, ${lat.toFixed(4)}°</span>
            </div>
          `;
        }
      },
      grid: {
        left: '5%',
        right: '15%', 
        top: '15%',
        bottom: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        name: 'X Position',
        nameLocation: 'middle',
        nameGap: 25,
        axisLabel: {
          formatter: function(value: string) {
            return value.toString();
          },
          color: '#666',
          interval: Math.max(1, Math.floor(data.grid_size / 8))
        },
        axisLine: {
          show: true,
          lineStyle: { color: '#333' }
        },
        splitLine: {
          show: false
        },
        scale: true
      },
      yAxis: {
        type: 'category', 
        name: 'Y Position',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: {
          formatter: function(value: string) {
            return value.toString();
          },
          color: '#666',
          interval: Math.max(1, Math.floor(data.grid_size / 8))
        },
        axisLine: {
          show: true,
          lineStyle: { color: '#333' }
        },
        splitLine: {
          show: false
        },
        scale: true
      },
      visualMap: {
        min: statistics.min,
        max: statistics.max,
        calculable: true,
        precision: 3,
        orient: 'vertical',
        left: 'right',
        top: 'middle',
        bottom: '20%',
        itemWidth: 25,
        itemHeight: 180,
        inRange: {
          color: ['#8B0000', '#B22222', '#DC143C', '#FF6347', '#FFD700', '#98FB98', '#00FF7F', '#00FF00']
        },
        text: [`${statistics.max.toFixed(2)}`, `${statistics.min.toFixed(2)}`],
        textStyle: {
          fontSize: 11,
          color: '#333'
        },
        realtime: true,
        inverse: false
      },
      series: [{
        name: `${index} Heatmap`,
        type: 'heatmap',
        data: aoIData,
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            borderWidth: 2,
            borderColor: '#fff'
          }
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.95)'
        },
        label: {
          show: false
        },
        // Progressive rendering for performance  
        large: true,
        progressive: 1000,
        animation: true,
        animationDuration: 1500
      }],
      graphic: [
        {
          type: 'group',
          left: 15,
          bottom: 15,
          children: [
            {
              type: 'rect',
              shape: { 
                width: 210, 
                height: 130,
                r: 10
              },
              style: { 
                fill: 'rgba(0,0,0,0.88)',
                stroke: '#33a453',
                strokeWidth: 2
              }
            },
            {
              type: 'text',
              style: {
                text: `Agricultural Analysis\n${index} over AOI Shape\n\nMean: ${statistics.mean.toFixed(4)}\nMedian: ${statistics.median.toFixed(4)}\nP10: ${statistics.p10.toFixed(4)}\nP90: ${statistics.p90.toFixed(4)}\nStd: ${statistics.std.toFixed(4)}`,
                fill: '#ffffff',
                fontSize: 11,
                lineHeight: 16,
                fontWeight: '500'
              },
              left: 15,
              top: 12
            }
          ]
        }
      ]
    };
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

  const exportChart = () => {
    if (!chartRef) return;

    const chartInstance = chartRef.getEchartsInstance();
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    });

    const link = document.createElement('a');
    link.href = url;
    link.download = `${parcelName || parcelId}_${selectedIndex}_${selectedDate}_chart.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Interactive Vegetation Index Visualization</h2>
      </div>

      <p className="text-gray-600">
        Explore interactive satellite data for {parcelName || `Parcel ${parcelId}`} with hover details, zoom, and pan capabilities.
      </p>

      {/* Configuration Panel */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="heatmap">ECharts Heatmap</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>

          {visualizationType === 'heatmap' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Grid Size</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value={25}>25x25 (Fast)</option>
                <option value={50}>50x50 (Balanced)</option>
                <option value={100}>100x100 (Detailed)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={generateVisualization}
            disabled={isLoading || !boundary}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
            {isLoading ? 'Generating...' : 'Generate Interactive View'}
          </button>

          {data && (
            <div className="flex items-center gap-2">
              <button
                onClick={downloadData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Data
              </button>
              <button
                onClick={exportChart}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Download className="w-4 h-4" />
                Chart
              </button>
            </div>
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
            />
          ) : (
            <div className="bg-white border rounded-lg p-4">
              <ReactECharts
                ref={(e) => setChartRef(e)}
                option={
                  visualizationType === 'heatmap' && 'pixel_data' in data
                    ? createHeatmapOption(data as HeatmapDataResponse)
                    : createScatterOption(data as InteractiveDataResponse)
                }
                style={{ height: '600px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
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
              <p>• <strong>Export:</strong> Download data as JSON or save chart as PNG</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveIndexViewer;