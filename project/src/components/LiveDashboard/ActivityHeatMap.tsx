import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Layers, Filter, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ActivityHeatmapPoint } from '../../services/liveDashboardService';

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface ActivityHeatMapProps {
  data: ActivityHeatmapPoint[];
  isLoading?: boolean;
  lastUpdated?: string;
}

// Component to handle heat map rendering
const HeatmapLayer: React.FC<{ data: ActivityHeatmapPoint[]; selectedType: string | null }> = ({ data, selectedType }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Filter data by selected type if applicable
    const filteredData = selectedType
      ? data.filter(p => p.activityType === selectedType)
      : data;

    // Convert to heat layer format [lat, lng, intensity]
    const heatPoints: [number, number, number][] = filteredData.map(point => [
      point.lat,
      point.lng,
      point.intensity,
    ]);

    // Dynamically import and create heat layer
    const createHeatLayer = async () => {
      try {
        // Import leaflet.heat
        await import('leaflet.heat');

        // Remove existing heat layer
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }

        // Create new heat layer
        if (heatPoints.length > 0) {
          heatLayerRef.current = (L as any).heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.0: '#3b82f6', // blue
              0.25: '#22c55e', // green
              0.5: '#eab308', // yellow
              0.75: '#f97316', // orange
              1.0: '#ef4444', // red
            },
          }).addTo(map);
        }
      } catch (error) {
        console.error('Error loading heat layer:', error);
      }
    };

    createHeatLayer();

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [data, map, selectedType]);

  return null;
};

// Activity markers component
const ActivityMarkers: React.FC<{ data: ActivityHeatmapPoint[]; selectedType: string | null }> = ({ data, selectedType }) => {
  const { t } = useTranslation();

  // Filter data by selected type if applicable
  const filteredData = selectedType
    ? data.filter(p => p.activityType === selectedType)
    : data;

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      harvest: '#f97316', // orange
      irrigation: '#3b82f6', // blue
      maintenance: '#8b5cf6', // purple
      planting: '#22c55e', // green
      inspection: '#eab308', // yellow
    };
    return colors[type] || '#6b7280';
  };

  return (
    <>
      {filteredData.map((point, index) => (
        <Circle
          key={index}
          center={[point.lat, point.lng]}
          radius={500 + point.count * 100}
          pathOptions={{
            color: getActivityColor(point.activityType),
            fillColor: getActivityColor(point.activityType),
            fillOpacity: 0.3 + point.intensity * 0.4,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-bold capitalize">{point.activityType}</div>
              <div className="text-gray-600">
                {t('liveDashboard.heatmap.activities')}: {point.count}
              </div>
              <div className="text-gray-500 text-xs">
                {t('liveDashboard.heatmap.intensity')}: {Math.round(point.intensity * 100)}%
              </div>
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
};

const ActivityHeatMap: React.FC<ActivityHeatMapProps> = ({
  data,
  isLoading = false,
  lastUpdated,
}) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [baseLayer, setBaseLayer] = useState<'osm' | 'satellite'>('osm');

  // Calculate map center from data or use default (Morocco)
  const mapCenter: [number, number] = useMemo(() => {
    if (data && data.length > 0) {
      const avgLat = data.reduce((sum, p) => sum + p.lat, 0) / data.length;
      const avgLng = data.reduce((sum, p) => sum + p.lng, 0) / data.length;
      return [avgLat, avgLng];
    }
    return [33.5731, -7.5898]; // Default to Morocco
  }, [data]);

  // Activity types from data
  const activityTypes = useMemo(() => {
    const types = new Set(data.map(p => p.activityType));
    return Array.from(types);
  }, [data]);

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      harvest: 'bg-orange-500',
      irrigation: 'bg-blue-500',
      maintenance: 'bg-purple-500',
      planting: 'bg-green-500',
      inspection: 'bg-yellow-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 rounded-xl">
              <Map className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('liveDashboard.heatmap.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('liveDashboard.heatmap.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Layer toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showHeatmap
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <Layers className="h-3 w-3" />
              {t('liveDashboard.heatmap.heatmapLayer')}
            </button>
            <button
              onClick={() => setBaseLayer(baseLayer === 'osm' ? 'satellite' : 'osm')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {baseLayer === 'osm' ? t('liveDashboard.heatmap.satellite') : t('liveDashboard.heatmap.street')}
            </button>
          </div>

          {/* Activity type filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => setSelectedType(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedType === null
                  ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-800'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {t('liveDashboard.heatmap.all')}
            </button>
            {activityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-800'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getActivityColor(type)}`}></span>
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-96 relative">
        <MapContainer
          center={mapCenter}
          zoom={8}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
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

          {showHeatmap && <HeatmapLayer data={data} selectedType={selectedType} />}
          <ActivityMarkers data={data} selectedType={selectedType} />
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            {t('liveDashboard.heatmap.legend')}
          </h4>
          <div className="space-y-1">
            {activityTypes.map((type) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span className={`w-3 h-3 rounded-full ${getActivityColor(type)}`}></span>
                <span className="capitalize text-gray-600 dark:text-gray-400">{type}</span>
              </div>
            ))}
          </div>
          {showHeatmap && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('liveDashboard.heatmap.intensity')}
              </div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 via-orange-500 to-red-500"></div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{t('liveDashboard.heatmap.low')}</span>
                <span>{t('liveDashboard.heatmap.high')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats overlay */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('liveDashboard.heatmap.totalPoints')}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedType ? data.filter(p => p.activityType === selectedType).length : data.length}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
            {t('liveDashboard.heatmap.activeLocations')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatMap;
