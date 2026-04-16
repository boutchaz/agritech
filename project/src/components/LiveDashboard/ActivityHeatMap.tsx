import { useEffect, useRef, useMemo, useState, type MutableRefObject } from "react";
import { cn } from '@/lib/utils';
import { MapContainer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, RefreshCw, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@/components/ui/skeleton';
import type { ActivityHeatmapPoint, FarmActivity } from '../../services/liveDashboardService';
import { Button } from '@/components/ui/button';
import NewsTicker from './NewsTicker';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
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
  recentActivities?: FarmActivity[];
}

// Fit all bounds controller — called imperatively via ref
const FitAllController = ({ triggerRef, data }: { triggerRef: MutableRefObject<(() => void) | null>; data: ActivityHeatmapPoint[] }) => {
  const map = useMap();
  useEffect(() => {
    triggerRef.current = () => {
      if (!data || data.length === 0) return;
      const bounds = L.latLngBounds(data.map(p => [p.lat, p.lng] as [number, number]));
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1 });
    };
    return () => {
      triggerRef.current = null;
    };
  }, [data, map, triggerRef]);
  return null;
};

// Auto-fit map bounds to show all data points
const MapBoundsAdjuster = ({ data }: { data: ActivityHeatmapPoint[] }) => {
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
const ActivityCircles = ({ data }: { data: ActivityHeatmapPoint[] }) => {
  const map = useMap();

  return (
    <>
      {data.map((point, ptIdx) => {
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
            key={`${point.farmId}-${point.parcelName ?? 'farm'}-${ptIdx}`}
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

const ActivityHeatMap = ({
  data,
  isLoading = false,
  lastUpdated,
  recentActivities = [],
}: ActivityHeatMapProps) => {
  const { t } = useTranslation();
  const [isSatellite, setIsSatellite] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fitAllRef = useRef<(() => void) | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const mapShellRef = useRef<HTMLDivElement | null>(null);

  const defaultCenter: [number, number] = [33.5731, -7.5898];

  useEffect(() => {
    const el = mapShellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => leafletMapRef.current?.invalidateSize());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Leaflet often needs an explicit resize after container visibility/position changes
  // (e.g. when switching to fullscreen). This is in addition to the ResizeObserver
  // because the layout transition may happen slightly after React renders.
  useEffect(() => {
    const invalidate = () => leafletMapRef.current?.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const timeout = window.setTimeout(invalidate, 550); // match transition-all duration-500
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [isFullscreen]);

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
    <div className={cn(
      "transition-all duration-500",
      isFullscreen
        // Use viewport units so `fixed` behaves as expected even if an ancestor
        // creates a new containing block (e.g. via transforms/animations).
        ? 'fixed inset-0 z-[2000] bg-white dark:bg-slate-900 flex flex-col w-screen h-screen min-h-0'
        : 'group bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5'
    )}>
      {/* Header */}
      <div className="p-6 border-b border-slate-50 dark:border-slate-700/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
              <MapIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase">
                {t('liveDashboard.heatmap.title')}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                {t('liveDashboard.heatmap.subtitle')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:flex text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <Button
                size="sm"
                variant={isSatellite ? 'default' : 'ghost'}
                onClick={() => setIsSatellite(true)}
                className={cn(
                  "h-8 text-[10px] font-medium uppercase tracking-widest rounded-lg px-3",
                  isSatellite ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Layers className="h-3 w-3 mr-1.5" />
                Satellite
              </Button>
              <Button
                size="sm"
                variant={!isSatellite ? 'default' : 'ghost'}
                onClick={() => setIsSatellite(false)}
                className={cn(
                  "h-8 text-[10px] font-medium uppercase tracking-widest rounded-lg px-3",
                  !isSatellite ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <MapIcon className="h-3 w-3 mr-1.5" />
                Plan
              </Button>
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 h-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div
        ref={mapShellRef}
        className={cn(
          "relative overflow-hidden",
          isFullscreen ? "flex-1 min-h-0 w-full" : "h-[500px]"
        )}
      >
        <MapContainer
          ref={leafletMapRef}
          center={defaultCenter}
          zoom={6}
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
          className="z-0"
        >
          <LeafletBaseTileLayers
            variant={isSatellite ? 'satellite' : 'streets'}
            withSatelliteReferenceLabels={isSatellite}
          />
          <MapBoundsAdjuster data={data} />
          <FitAllController triggerRef={fitAllRef} data={data} />
          <ActivityCircles data={data} />
        </MapContainer>

        {/* Empty state overlay */}
        {data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 px-10 py-8 text-center max-w-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl w-fit mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                <MapIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-tight">{t('liveDashboard.heatmap.noFarms')}</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                {t('liveDashboard.heatmap.noFarmsHint')}
              </p>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <>
            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 z-20 min-w-[200px] rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/80">
              <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Legend</h4>
              <div className="space-y-3">
                {presentTypes.map(type => (
                  <div key={type} className="flex items-center gap-3 group/item cursor-default">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border-2 border-white dark:border-slate-700 transition-transform group-hover/item:scale-125"
                      style={{ background: ACTIVITY_COLORS[type] ?? '#6b7280' }}
                    />
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      {ACTIVITY_LABELS[type] ?? type}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2 mt-2 border-t border-slate-50 dark:border-slate-700 opacity-60">
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 border-dashed border-slate-400 bg-slate-100 dark:bg-slate-900" />
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Idle / Farm</span>
                </div>
              </div>
            </div>

            {/* Live Stats Overlay */}
            <div className="absolute right-4 top-4 z-20 flex flex-col gap-3 sm:right-6 sm:top-6">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 min-w-[160px]">
                <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Active Assets</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{activeFarmsCount}</span>
                  <span className="text-[10px] font-bold text-slate-400">/ {totalFarmsCount} FARMS</span>
                </div>
                {activeCount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg w-fit">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[8px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                      {activeCount} OPERATING
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fitAllRef.current?.()}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:bg-white transition-all h-10 px-4"
              >
                Reset View
              </Button>
            </div>
          </>
        )}
      </div>

      {/* News ticker — fullscreen only */}
      {isFullscreen && <NewsTicker data={data} recentActivities={recentActivities} />}
    </div>
  );
};

export default ActivityHeatMap;
