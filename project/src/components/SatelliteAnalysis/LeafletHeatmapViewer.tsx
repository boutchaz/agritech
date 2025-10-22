import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Download, Layers, ZoomIn, MousePointer, Loader, Calendar, RefreshCw } from 'lucide-react';
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
import { ColorPalette, COLOR_PALETTES } from './InteractiveIndexViewer';

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
  initialData?: HeatmapDataResponse | null;
  selectedIndex?: VegetationIndexType;
  selectedDate?: string;
  embedded?: boolean; // When true, hides the configuration panel and is used within other components
  colorPalette?: ColorPalette; // Color palette to use for the heatmap
  compact?: boolean; // When true, shows a minimal version suitable for grid display
  baseLayer?: 'osm' | 'satellite'; // Base map layer
}

// Custom hook to add grid-based heatmap layer to map (like desired.png)
export const GridHeatmapLayer: React.FC<{
  data: HeatmapDataResponse | null;
  selectedIndex: VegetationIndexType;
  colorPalette?: ColorPalette;
  opacity?: number;
}> = ({ data, selectedIndex, colorPalette = 'red-green', opacity = 1.0 }) => {
  const map = useMap();
  const gridLayerRef = useRef<L.LayerGroup | null>(null);

  // Color interpolation function using selected palette
  const getColorForValue = (value: number, min: number, max: number): string => {
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const palette = COLOR_PALETTES[colorPalette];
    const colors = palette.colors;

    // Interpolate between colors in the palette
    const index = normalized * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex) {
      return colors[lowerIndex];
    }

    const t = index - lowerIndex;
    const lowerColor = hexToRgb(colors[lowerIndex]);
    const upperColor = hexToRgb(colors[upperIndex]);

    if (!lowerColor || !upperColor) {
      return colors[lowerIndex];
    }

    const r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * t);
    const g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * t);
    const b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  useEffect(() => {
    console.log('GridHeatmapLayer useEffect - data:', data);
    if (!data || !data.pixel_data) {
      console.log('No data or pixel_data available');
      return;
    }

    console.log(`Processing ${data.pixel_data.length} pixels`);

    // Remove existing grid layer
    if (gridLayerRef.current) {
      map.removeLayer(gridLayerRef.current);
    }

    // Create new layer group for grid cells
    gridLayerRef.current = L.layerGroup();

    // Calculate pixel size matching research notebook approach (10m scale)
    const pixelScale = data.metadata?.sample_scale || 10; // meters per pixel
    const pixelSizeDegrees = pixelScale / 111320; // Convert meters to degrees (approx)

    // Sort pixels to create organized grid layout like reference image
    const sortedPixels = [...data.pixel_data].sort((a, b) => {
      if (Math.abs(a.lat - b.lat) > 0.00001) return b.lat - a.lat; // Sort by lat first (top to bottom)
      return a.lon - b.lon; // Then by lon (left to right)
    });

    // Create rectangular grid cells matching reference visualization
    console.log(`Creating ${sortedPixels.length} rectangles with pixel size: ${pixelSizeDegrees} degrees (${pixelScale}m)`);

    sortedPixels.forEach((point, index) => {
      const color = getColorForValue(point.value, data.statistics.min, data.statistics.max);

      const bounds: [number, number][] = [
        [point.lat - pixelSizeDegrees/2, point.lon - pixelSizeDegrees/2],
        [point.lat + pixelSizeDegrees/2, point.lon + pixelSizeDegrees/2]
      ];

      if (index < 5) { // Log first few rectangles for debugging
        console.log(`Rectangle ${index}:`, {
          point,
          color,
          bounds,
          value: point.value
        });
      }

      const rectangle = L.rectangle(bounds, {
        fillColor: color,
        fillOpacity: opacity,
        color: color,
        weight: 0.1,
        opacity: Math.min(0.3, opacity)
      }).bindTooltip(
        `${selectedIndex}: ${point.value.toFixed(3)}<br/>
         Lat: ${point.lat.toFixed(6)}<br/>
         Lon: ${point.lon.toFixed(6)}<br/>
         Scale: ${pixelScale}m`,
        { sticky: true }
      );

      gridLayerRef.current!.addLayer(rectangle);
    });

    console.log(`Added ${gridLayerRef.current.getLayers().length} layers to grid`);

    gridLayerRef.current.addTo(map);
    console.log('Grid layer added to map');

    // Fit map to data bounds
    const lats = data.pixel_data.map(p => p.lat);
    const lons = data.pixel_data.map(p => p.lon);
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    );
    map.fitBounds(bounds, { padding: [20, 20] });

    return () => {
      if (gridLayerRef.current) {
        map.removeLayer(gridLayerRef.current);
      }
    };
  }, [data, selectedIndex, map]);

  return null;
};

const LeafletHeatmapViewer: React.FC<LeafletHeatmapViewerProps> = ({
  parcelId,
  parcelName,
  boundary,
  initialData,
  selectedIndex: propSelectedIndex,
  selectedDate: propSelectedDate,
  embedded = false,
  colorPalette = 'red-green',
  compact = false,
  baseLayer = 'osm'
}) => {
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>(propSelectedIndex || 'NDVI');
  const [selectedDate, setSelectedDate] = useState(propSelectedDate || '');
  const [samplePoints, setSamplePoints] = useState(10000); // Start with high detail
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isCheckingDates, setIsCheckingDates] = useState(false);
  const [recommendedDate, setRecommendedDate] = useState<string | null>(null);

  // Debug data changes
  useEffect(() => {
    console.log('LeafletHeatmapViewer - data state changed:', data);
    console.log('Data has pixel_data:', data?.pixel_data?.length || 0, 'pixels');
  }, [data]);

  // Initialize with today's date if no props provided
  useEffect(() => {
    if (!propSelectedDate) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [propSelectedDate]);

  // Update state when props change
  useEffect(() => {
    if (propSelectedIndex) setSelectedIndex(propSelectedIndex);
  }, [propSelectedIndex]);

  useEffect(() => {
    if (propSelectedDate) setSelectedDate(propSelectedDate);
  }, [propSelectedDate]);

  useEffect(() => {
    console.log('LeafletHeatmapViewer - initialData changed:', initialData);
    if (initialData) {
      console.log('Setting data from initialData:', initialData);
      setData(initialData);
    }
  }, [initialData]);

  // Check available dates with satellite data - Fixed infinite refetch
  const checkAvailableDates = useCallback(async () => {
    if (!boundary) return;

    setIsCheckingDates(true);
    setError(null);

    try {
      // Check dates in the last 3 months
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const startDateStr = startDate.toISOString().split('T')[0];

      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const result = await satelliteApi.checkCloudCoverage({
        geometry: aoi.geometry,
        date_range: {
          start_date: startDateStr,
          end_date: endDate
        },
        max_cloud_coverage: 20 // Allow up to 20% cloud coverage
      });

      if (result.recommended_date) {
        setRecommendedDate(result.recommended_date);
        // Use the recommended date if we have one
        setSelectedDate(prev => prev || result.recommended_date!);
      }

      // Extract available dates from metadata if provided
      const dates = result.recommended_date ? [result.recommended_date] : [];
      setAvailableDates(dates);

    } catch (err) {
      console.error('Error checking available dates:', err);
      setError('Failed to check available dates. Using current date as fallback.');
    } finally {
      setIsCheckingDates(false);
    }
  }, [boundary, parcelName]); // Removed selectedDate and availableDates from deps to fix infinite loop

  // Check available dates when boundary changes
  useEffect(() => {
    if (boundary && boundary.length > 0) {
      checkAvailableDates();
    }
  }, [boundary, checkAvailableDates]);

  const generateVisualization = useCallback(async () => {
    if (!boundary || !selectedDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const requestParams = {
        aoi,
        date: selectedDate,
        index: selectedIndex,
        grid_size: samplePoints
      };

      console.log('🚀 Making heatmap API request with params:', requestParams);
      console.log('📊 Sample points:', samplePoints);
      console.log('📅 Selected date:', selectedDate);

      const result = await satelliteApi.getHeatmapData(requestParams);

      console.log('📥 Received heatmap data:', result);
      console.log('🔢 Pixel count:', result.pixel_data?.length || 0);

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

  // Convert boundary to Leaflet polygon format - use backend AOI boundary if available
  const polygonPositions: [number, number][] = useMemo(() => {
    if (data?.aoi_boundary && data.aoi_boundary.length > 0) {
      return data.aoi_boundary.map(coord => [coord[1], coord[0]]);
    }
    if (boundary && boundary.length > 0) {
      return boundary.map(coord => [coord[1], coord[0]]);
    }
    return [];
  }, [data?.aoi_boundary, boundary]);

  // Color scale component matching desired.png
  const ColorScale: React.FC = () => {
    if (!data) return null;

    const steps = 20;
    const stepHeight = 20;
    const scaleHeight = steps * stepHeight;

    return (
      <div className="absolute top-4 right-4 bg-white p-2 rounded shadow-lg border z-[1000]">
        <div className="flex items-center">
          <div className="flex flex-col mr-2" style={{ height: scaleHeight }}>
            {Array.from({ length: steps }).map((_, i) => {
              const value = data.statistics.max - (i / (steps - 1)) * (data.statistics.max - data.statistics.min);
              const normalized = (value - data.statistics.min) / (data.statistics.max - data.statistics.min);
              let color;
              if (normalized <= 0.2) {
                const t = normalized / 0.2;
                color = `rgb(${Math.round(220 + (255 - 220) * t)}, ${Math.round(20 * t)}, ${Math.round(60 * (1 - t))})`;
              } else if (normalized <= 0.4) {
                const t = (normalized - 0.2) / 0.2;
                color = `rgb(255, ${Math.round(165 + (255 - 165) * t)}, ${Math.round(0 + 50 * t)})`;
              } else if (normalized <= 0.6) {
                const t = (normalized - 0.4) / 0.2;
                color = `rgb(${Math.round(255 - 100 * t)}, 255, ${Math.round(50 + 100 * t)})`;
              } else if (normalized <= 0.8) {
                const t = (normalized - 0.6) / 0.2;
                color = `rgb(${Math.round(155 - 55 * t)}, ${Math.round(255 - 50 * t)}, ${Math.round(150 - 50 * t)})`;
              } else {
                const t = (normalized - 0.8) / 0.2;
                color = `rgb(${Math.round(100 - 50 * t)}, ${Math.round(205 - 55 * t)}, ${Math.round(100 - 50 * t)})`;
              }
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: color,
                    height: stepHeight,
                    width: '20px',
                    border: '0.5px solid #ccc'
                  }}
                />
              );
            })}
          </div>
          <div className="flex flex-col justify-between text-xs" style={{ height: scaleHeight }}>
            <span>{data.statistics.max.toFixed(1)}</span>
            <span>{((data.statistics.max + data.statistics.min) / 2).toFixed(1)}</span>
            <span>{data.statistics.min.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 space-y-6 ${embedded ? 'p-0 shadow-none' : ''}`}>
      {!embedded && (
        <>
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">{selectedIndex} - évolution temporelle</h1>
            <div className="text-lg text-gray-600 mt-2">{selectedDate}</div>
          </div>

          {/* Configuration Panel - Only shown when not embedded */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date
                  {isCheckingDates && (
                    <span className="ml-2 text-xs text-gray-500">
                      <RefreshCw className="inline w-3 h-3 animate-spin mr-1" />
                      Checking availability...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      availableDates.length > 0 && !availableDates.includes(selectedDate)
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {recommendedDate && recommendedDate !== selectedDate && (
                    <button
                      onClick={() => setSelectedDate(recommendedDate)}
                      className="absolute right-1 top-1 bottom-1 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      title={`Use recommended date: ${recommendedDate}`}
                    >
                      <Calendar className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {availableDates.length > 0 && !availableDates.includes(selectedDate) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No data for selected date. Recommended: {recommendedDate}
                  </p>
                )}
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
                  <option value={1000}>1000 (Fast)</option>
                  <option value={2000}>2000 (Balanced)</option>
                  <option value={5000}>5000 (Detailed)</option>
                  <option value={10000}>10000 (High Detail)</option>
                  <option value={25000}>25000 (Maximum Detail)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateVisualization}
                  disabled={isLoading || !boundary}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
                  {isLoading ? 'Loading...' : data ? 'Regenerate' : 'Generate'}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>Index Description:</strong> {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
            </div>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
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

        <div className={`border rounded-lg overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-96'}`}>
          {/* Fullscreen Toggle Button */}
          {!compact && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg p-2 shadow-lg transition-colors"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
          <ColorScale />
          {/* Statistics Box (like desired.png) */}
          {data && (
            <div key="stats-box" className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-sm z-[1000]">
              <div>Mean: {data.statistics.mean.toFixed(3)}</div>
              <div>Median: {data.statistics.median.toFixed(3)}</div>
              <div>P10: {data.statistics.p10.toFixed(3)}</div>
              <div>P90: {data.statistics.p90.toFixed(3)}</div>
              <div>Std: {data.statistics.std.toFixed(3)}</div>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            className="leaflet-container"
          >
            {baseLayer === 'satellite' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}

            {/* AOI Polygon Boundary - Matching research notebook style */}
            {polygonPositions.length > 0 && (
              <>
                <Polygon
                  key="parcel-border-outer"
                  positions={polygonPositions}
                  pathOptions={{
                    color: '#000000',
                    weight: 3,
                    fillOpacity: 0,
                    opacity: 0.9
                  }}
                />
                <Polygon
                  key="parcel-border-inner"
                  positions={polygonPositions}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 1,
                    fillOpacity: 0,
                    opacity: 0.8
                  }}
                />
              </>
            )}

            {/* Grid Heatmap Layer */}
            <GridHeatmapLayer key="grid-heatmap" data={data} selectedIndex={selectedIndex} colorPalette={colorPalette} />
          </MapContainer>
        </div>

        {/* Legend and Information (hide in compact mode) */}
        {!compact && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Interactive Map Features</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Real Data:</strong> Actual Sentinel-2 satellite pixel values from Earth Engine</p>
              <p>• <strong>AOI Boundary:</strong> Black/white dashed line shows the exact field boundary</p>
              <p>• <strong>Grid Pixels:</strong> Each rectangle represents a {data?.metadata?.sample_scale || 10}m satellite pixel</p>
              <p>• <strong>Color Scale:</strong> {COLOR_PALETTES[colorPalette || 'red-green'].description}</p>
              <p>• <strong>Interaction:</strong> Hover over pixels to see exact values and coordinates</p>
              <p>• <strong>Data Source:</strong> {data?.metadata?.data_source || 'Sentinel-2 Earth Engine'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeafletHeatmapViewer;