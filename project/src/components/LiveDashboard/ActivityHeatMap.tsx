import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, RefreshCw, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@/components/ui/skeleton';
import type { ActivityHeatmapPoint } from '../../services/liveDashboardService';
import NewsTicker from './NewsTicker';

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Activity type → color mapping (consistent with ActiveOperationsWidget)
const ACTIVITY_COLORS: Record<string, string> = {
  irrigation:    '#3b82f6', // bleu
  harvesting:    '#f97316', // orange
  harvest:       '#f97316', // orange (alias)
  planting:      '#22c55e', // vert
  fertilization: '#a3e635', // lime
  maintenance:   '#8b5cf6', // violet
  pruning:       '#06b6d4', // cyan
  pest_control:  '#ef4444', // rouge
  inspection:    '#eab308', // jaune
  cultivation:   '#84cc16', // lime-green
  soil_preparation: '#92400e', // marron
  general:       '#16a34a', // vert foncé
  farming:       '#16a34a', // vert foncé (alias)
  idle:          '#94a3b8', // gris
};

const ACTIVITY_LABELS: Record<string, string> = {
  irrigation:    'Irrigation',
  harvesting:    'Récolte',
  harvest:       'Récolte',
  planting:      'Plantation',
  fertilization: 'Fertilisation',
  maintenance:   'Maintenance',
  pruning:       'Taille',
  pest_control:  'Traitement',
  inspection:    'Inspection',
  cultivation:   'Culture',
  soil_preparation: 'Préparation sol',
  general:       'Tâche générale',
  farming:       'Agriculture',
  idle:          'Inactif',
};

interface ActivityHeatMapProps {
  data: ActivityHeatmapPoint[];
  isLoading?: boolean;
  lastUpdated?: string;
}

// Fit all bounds controller — called imperatively via ref
const FitAllController: React.FC<{ triggerRef: React.MutableRefObject<(() => void) | null>; data: ActivityHeatmapPoint[] }> = ({ triggerRef, data }) => {
  const map = useMap();
  triggerRef.current = () => {
    if (!data || data.length === 0) return;
    const bounds = L.latLngBounds(data.map(p => [p.lat, p.lng] as [number, number]));
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1 });
  };
  return null;
};

// Auto-fit map bounds to show all data points
const MapBoundsAdjuster: React.FC<{ data: ActivityHeatmapPoint[] }> = ({ data }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data || data.length === 0) return;
    const bounds = L.latLngBounds(data.map(p => [p.lat, p.lng] as [number, number]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      fitted.current = true;
    }
  }, [data, map]);

  return null;
};

// Circles colored by activity type
const ActivityCircles: React.FC<{ data: ActivityHeatmapPoint[] }> = ({ data }) => {
  const map = useMap();

  return (
    <>
      {data.map((point, idx) => {
        const color = ACTIVITY_COLORS[point.activityType] ?? '#94a3b8';
        const isInProgress = point.status === 'in_progress';
        const isIdle = point.isIdle ?? false;
        const isFarm = point.isActiveFarm ?? false;

        // Farm → larger circle; parcel → smaller; idle → visible but muted
        const radius = isIdle
          ? (isFarm ? 10 : 8)
          : Math.max(isFarm ? 10 : 8, Math.min((point.count * 3) + (isFarm ? 8 : 5), 22));

        return (
          <CircleMarker
            key={`${point.farmId}-${point.parcelName ?? 'farm'}-${idx}`}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color: isIdle ? '#94a3b8' : color,
              fillColor: isIdle ? '#94a3b8' : color,
              fillOpacity: isIdle ? 0.45 : 0.75,
              weight: isInProgress ? 2.5 : 1.5,
              opacity: isIdle ? 0.7 : 0.95,
              dashArray: isIdle ? '4 4' : undefined,
            }}
            eventHandlers={{
              click: () => map.flyTo([point.lat, point.lng], 15, { duration: 1 }),
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1} permanent={false}>
              <span className="font-semibold text-xs">
                {point.parcelName ?? point.farmName ?? '—'}
              </span>
              {point.parcelName && point.farmName && (
                <span className="text-gray-500 text-xs block">{point.farmName}</span>
              )}
            </Tooltip>
            <Popup>
              <div className="text-sm min-w-[160px]">
                <div className="font-bold text-gray-800 mb-1">
                  {point.farmName ?? '—'}
                </div>
                {point.parcelName && (
                  <div className="text-gray-600 text-xs mb-1">
                    📍 {point.parcelName}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="font-medium" style={{ color }}>
                    {ACTIVITY_LABELS[point.activityType] ?? point.activityType}
                  </span>
                </div>
                {!isIdle && (
                  <div className="text-gray-500 text-xs mt-1">
                    {point.count} tâche{point.count > 1 ? 's' : ''}
                    {point.status === 'in_progress' && (
                      <span className="ml-1 text-green-600 font-medium">● En cours</span>
                    )}
                    {point.status === 'pending' && (
                      <span className="ml-1 text-yellow-600 font-medium">○ En attente</span>
                    )}
                  </div>
                )}
                {isIdle && (
                  <div className="text-gray-400 text-xs mt-1 italic">
                    Aucune activité en cours
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

const ActivityHeatMap: React.FC<ActivityHeatMapProps> = ({
  data,
  isLoading = false,
  lastUpdated,
}) => {
  const { t } = useTranslation();
  const [isSatellite, setIsSatellite] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fitAllRef = useRef<(() => void) | null>(null);

  const defaultCenter: [number, number] = [33.5731, -7.5898];

  // Stats
  const activeFarmsCount = useMemo(() => new Set(data.filter(p => !p.isIdle && p.farmId).map(p => p.farmId)).size, [data]);
  const totalFarmsCount = useMemo(() => new Set(data.filter(p => p.farmId).map(p => p.farmId)).size, [data]);
  const activeCount = useMemo(() => data.filter(p => !p.isIdle).length, [data]);

  // Activity types present (excluding idle)
  const presentTypes = useMemo(() => {
    const types = new Set(data.filter(p => !p.isIdle).map(p => p.activityType));
    return Array.from(types);
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton height="h-96" />;
  }

  return (
    <div className={isFullscreen
      ? 'fixed inset-0 z-[2000] bg-white dark:bg-gray-800 flex flex-col'
      : 'group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300'
    }>
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
            {data.length > 0 && (
              <button
                onClick={() => fitAllRef.current?.()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Voir toutes les parcelles"
              >
                ⊞ Tout voir
              </button>
            )}
            <button
              onClick={() => setIsSatellite(s => !s)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSatellite
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Basculer vue satellite"
            >
              <Layers className="h-3.5 w-3.5" />
              {isSatellite ? 'Satellite' : 'Carte'}
            </button>
            <button
              onClick={() => setIsFullscreen(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      </div>

      {/* Map — always shown */}
      <div className={isFullscreen ? 'flex-1 relative min-h-0' : 'h-96 relative'}>
        <MapContainer
          key={isFullscreen ? 'fullscreen' : 'normal'}
          center={defaultCenter}
          zoom={6}
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
          className="z-0"
        >
          {isSatellite ? (
            <>
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
            </>
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          <MapBoundsAdjuster data={data} />
          <FitAllController triggerRef={fitAllRef} data={data} />
          <ActivityCircles data={data} />
        </MapContainer>

        {/* Empty state overlay — shown on top of the map */}
        {data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000] pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg px-6 py-4 text-center max-w-xs">
              <Map className="h-8 w-8 opacity-30 mx-auto mb-2" />
              <p className="font-medium text-gray-600 dark:text-gray-300 text-sm">
                {t('liveDashboard.heatmap.noFarms', 'Aucune ferme localisée')}
              </p>
              <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                {t('liveDashboard.heatmap.noFarmsHint', 'Dessinez des parcelles sur la carte pour voir vos fermes ici')}
              </p>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <>
            {/* Légende */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-[180px]">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Légende</h4>
              <div className="space-y-1.5">
                {/* Active types */}
                {presentTypes.map(type => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: ACTIVITY_COLORS[type] ?? '#6b7280' }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {ACTIVITY_LABELS[type] ?? type}
                    </span>
                  </div>
                ))}
                {/* Idle */}
                <div className="flex items-center gap-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                  <span className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-dashed border-gray-400 bg-gray-200 dark:bg-gray-600" />
                  <span className="text-gray-400 dark:text-gray-500 italic">Inactif</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
              <div className="text-xs text-gray-500 dark:text-gray-400">Fermes actives</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {activeFarmsCount}
                <span className="text-sm font-normal text-gray-400"> / {totalFarmsCount}</span>
              </div>
              {activeCount > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {activeCount} activité{activeCount > 1 ? 's' : ''} en cours
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* News ticker — fullscreen only */}
      {isFullscreen && <NewsTicker data={data} />}
    </div>
  );
};

export default ActivityHeatMap;
