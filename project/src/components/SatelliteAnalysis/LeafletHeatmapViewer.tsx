import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Activity, Download, Layers, ZoomIn, MousePointer, Loader, Satellite } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  HeatmapDataResponse,
  convertBoundaryToGeoJSON
} from '../../lib/satellite-api';

// Fix Leaflet default icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletHeatmapViewerProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
}

// Custom hook to add heatmap layer to map
const HeatmapLayer: React.FC<{
  data: HeatmapDataResponse | null;
  selectedIndex: VegetationIndexType;
}> = ({ data, selectedIndex }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!data || !data.pixel_data) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Prepare heatmap data for Leaflet
    const heatData = data.pixel_data.map(point => [
      point.lat,
      point.lon,
      Math.max(0.1, Math.min(1.0, (point.value - data.statistics.min) / (data.statistics.max - data.statistics.min)))
    ]);

    if (heatData.length > 0) {
      // Create heatmap layer with proper options
      heatLayerRef.current = (L as any).heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.4,
        gradient: {
          0.0: '#8B0000',   // Dark red
          0.2: '#DC143C',   // Crimson
          0.4: '#FF4500',   // Orange red
          0.6: '#FFD700',   // Gold
          0.8: '#ADFF2F',   // Green yellow
          1.0: '#00FF00'    // Lime green
        }
      });

      heatLayerRef.current.addTo(map);

      // Fit map to heatmap bounds
      const bounds = L.latLngBounds(heatData.map(point => [point[0], point[1]] as [number, number]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [data, selectedIndex, map]);

  return null;
};

const LeafletHeatmapViewer: React.FC<LeafletHeatmapViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NDVI');
  const [selectedDate, setSelectedDate] = useState('');
  const [samplePoints, setSamplePoints] = useState(1000);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | null>(null);
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

      const result = await satelliteApi.getHeatmapData({
        aoi,
        date: selectedDate,
        index: selectedIndex,
        // Pass sample_points instead of grid_size for the new backend
        grid_size: samplePoints
      });

      setData(result as HeatmapDataResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate heatmap visualization');
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelName, selectedDate, selectedIndex, samplePoints]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      PRI: '#ef4444', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  const downloadData = () => {
    if (!data) return;

    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${parcelName || parcelId}_${selectedIndex}_${selectedDate}_heatmap.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Calculate center point for map initialization
  const mapCenter: [number, number] = boundary && boundary.length > 0
    ? [
        boundary.reduce((sum, coord) => sum + coord[1], 0) / boundary.length,
        boundary.reduce((sum, coord) => sum + coord[0], 0) / boundary.length
      ]
    : [46.2276, 2.2137]; // Default to center of France

  // Convert boundary to Leaflet polygon format
  const polygonPositions: [number, number][] = boundary
    ? boundary.map(coord => [coord[1], coord[0]]) // Convert [lng, lat] to [lat, lng]
    : [];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Satellite className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Agricultural Heatmap Visualization</h2>
      </div>

      <p className="text-gray-600">
        Real satellite data heatmap for {parcelName || `Parcel ${parcelId}`} using Leaflet mapping with proper AOI boundaries.
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
            <label className="text-sm font-medium mb-2 block">Sample Points</label>
            <select
              value={samplePoints}
              onChange={(e) => setSamplePoints(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value={500}>500 (Fast)</option>
              <option value={1000}>1000 (Balanced)</option>
              <option value={2000}>2000 (Detailed)</option>
              <option value={5000}>5000 (High Detail)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateVisualization}
              disabled={isLoading || !boundary}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
              {isLoading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <strong>Index Description:</strong> {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Statistics Display */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600">Mean</div>
            <div className="font-semibold" style={{ color: getIndexColor(selectedIndex) }}>
              {data.statistics.mean.toFixed(3)}
            </div>
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
            <div className="text-sm text-gray-600">Points</div>
            <div className="font-semibold">{data.statistics.count}</div>
          </div>
        </div>
      )}

      {/* Leaflet Map */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5" style={{ color: getIndexColor(selectedIndex) }} />
            {selectedIndex} Heatmap - {selectedDate}
          </h3>
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

        <div className="h-96 border rounded-lg overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            className="leaflet-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* AOI Polygon Boundary */}
            {polygonPositions.length > 0 && (
              <Polygon
                positions={polygonPositions}
                pathOptions={{
                  color: getIndexColor(selectedIndex),
                  weight: 3,
                  fillOpacity: 0.1,
                  fillColor: getIndexColor(selectedIndex)
                }}
              />
            )}

            {/* Heatmap Layer */}
            <HeatmapLayer data={data} selectedIndex={selectedIndex} />
          </MapContainer>
        </div>

        {/* Legend and Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Interactive Map Features</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Real Data:</strong> Actual Sentinel-2 satellite pixel values from Earth Engine</p>
            <p>• <strong>AOI Boundary:</strong> Green polygon shows the exact field boundary</p>
            <p>• <strong>Heatmap:</strong> Red = Low {selectedIndex}, Green = High {selectedIndex}</p>
            <p>• <strong>Zoom & Pan:</strong> Use mouse wheel and drag to explore the data</p>
            <p>• <strong>Data Source:</strong> {data?.metadata?.data_source || 'Sentinel-2 Earth Engine'}</p>
            <p>• <strong>Sample Scale:</strong> {data?.metadata?.sample_scale || 'Auto'} meters per pixel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeafletHeatmapViewer;