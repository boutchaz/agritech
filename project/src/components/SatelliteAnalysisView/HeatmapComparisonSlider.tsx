import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HeatmapDataResponse, VegetationIndexType } from '../../lib/satellite-api';
import { GridHeatmapLayer, SmoothHeatmapLayer, type HeatmapRenderMode, type ValueDisplayMode } from './LeafletHeatmapViewer';
import { type ColorPalette } from './InteractiveIndexViewer';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';

interface HeatmapComparisonSliderProps {
  boundary?: number[][];
  leftData: HeatmapDataResponse;
  rightData: HeatmapDataResponse;
  leftLabel: string;
  rightLabel: string;
  leftDate: string;
  rightDate: string;
  selectedIndex: VegetationIndexType;
  colorPalette?: ColorPalette;
  baseLayer?: 'osm' | 'satellite';
  renderMode?: HeatmapRenderMode;
  valueDisplay?: ValueDisplayMode;
  showIsolines?: boolean;
  className?: string;
}

/**
 * Syncs two Leaflet maps: when `sourceMap` moves, the other follows.
 */
const SyncMaps = ({ otherMapRef }: { otherMapRef: React.RefObject<L.Map | null> }) => {
  const map = useMap();
  const isSyncing = useRef(false);

  useEffect(() => {
    const syncTo = () => {
      const other = otherMapRef.current;
      if (!other || isSyncing.current) return;
      isSyncing.current = true;
      other.setView(map.getCenter(), map.getZoom(), { animate: false });
      isSyncing.current = false;
    };

    map.on('move', syncTo);
    map.on('zoom', syncTo);
    return () => {
      map.off('move', syncTo);
      map.off('zoom', syncTo);
    };
  }, [map, otherMapRef]);

  return null;
};

/**
 * Captures the map instance into a ref for cross-map synchronization.
 */
const CaptureMap = ({ mapRef }: { mapRef: React.RefObject<L.Map | null> }) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
};

/**
 * Before/after comparison slider for two heatmaps on synchronized Leaflet maps.
 * Two maps are stacked; the top map is clipped to the left side of the slider.
 * Drag the handle to reveal more of either side.
 */
const HeatmapComparisonSlider = ({
  boundary,
  leftData,
  rightData,
  leftLabel,
  rightLabel,
  leftDate,
  rightDate,
  selectedIndex,
  colorPalette = 'red-green',
  baseLayer = 'satellite',
  renderMode = 'smooth',
  valueDisplay = 'interactive',
  showIsolines = false,
  className,
}: HeatmapComparisonSliderProps) => {
  const [sliderPercent, setSliderPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const leftMapRef = useRef<L.Map | null>(null);
  const rightMapRef = useRef<L.Map | null>(null);

  const mapCenter: [number, number] = useMemo(() => {
    if (!boundary?.length) return [33.9, -6.9];
    const lats = boundary.map(c => c[1]);
    const lngs = boundary.map(c => c[0]);
    return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
  }, [boundary]);

  const leftAoiBoundary = leftData.aoi_boundary;

  const polygonPositions: [number, number][] = useMemo(() => {
    const aoiBoundary = leftAoiBoundary?.length ? leftAoiBoundary : boundary;
    return aoiBoundary?.map(coord => [coord[1], coord[0]] as [number, number]) ?? [];
  }, [leftAoiBoundary, boundary]);

  const clipBoundary: [number, number][] | undefined = useMemo(() => {
    if (leftAoiBoundary?.length) return leftAoiBoundary as [number, number][];
    if (boundary?.length) {
      return boundary.map(coord => {
        const [x, y] = coord;
        if (Math.abs(x) > 180 || Math.abs(y) > 90) {
          const lon = (x / 20037508.34) * 180;
          const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
          return [lon, lat] as [number, number];
        }
        return [x, y] as [number, number];
      });
    }
    return undefined;
  }, [leftAoiBoundary, boundary]);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPercent(percent);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSlider(e.clientX);
  }, [updateSlider]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updateSlider(e.clientX);
  }, [updateSlider]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const renderHeatmapLayer = (data: HeatmapDataResponse) => {
    if (renderMode === 'grid') {
      return <GridHeatmapLayer data={data} selectedIndex={selectedIndex} colorPalette={colorPalette} valueDisplay={valueDisplay} showBorders={true} boundary={clipBoundary} />;
    }
    return <SmoothHeatmapLayer data={data} colorPalette={colorPalette} valueDisplay={valueDisplay} showIsolines={showIsolines} boundary={clipBoundary} />;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative h-[400px] rounded-lg overflow-hidden border border-slate-200 select-none", className)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Bottom layer: RIGHT (comparison) map — full width */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <CaptureMap mapRef={rightMapRef} />
          <SyncMaps otherMapRef={leftMapRef} />
          <LeafletBaseTileLayers
            variant={baseLayer === 'satellite' ? 'satellite' : 'streets'}
            withSatelliteReferenceLabels={baseLayer === 'satellite'}
          />
          {renderHeatmapLayer(rightData)}
          {polygonPositions.length > 0 && (
            <Polygon positions={polygonPositions} pathOptions={{ color: '#00FF00', weight: 2.5, fillOpacity: 0, opacity: 0.9 }} />
          )}
        </MapContainer>
      </div>

      {/* Top layer: LEFT (reference) map — clipped to left of slider */}
      <div
        className="absolute inset-0 z-10"
        style={{ clipPath: `inset(0 ${100 - sliderPercent}% 0 0)` }}
      >
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <CaptureMap mapRef={leftMapRef} />
          <SyncMaps otherMapRef={rightMapRef} />
          <LeafletBaseTileLayers
            variant={baseLayer === 'satellite' ? 'satellite' : 'streets'}
            withSatelliteReferenceLabels={baseLayer === 'satellite'}
          />
          {renderHeatmapLayer(leftData)}
          {polygonPositions.length > 0 && (
            <Polygon positions={polygonPositions} pathOptions={{ color: '#00FF00', weight: 2.5, fillOpacity: 0, opacity: 0.9 }} />
          )}
        </MapContainer>
      </div>

      {/* Slider handle — above both maps */}
      <div
        className="absolute top-0 bottom-0 z-[1000] cursor-col-resize"
        style={{ left: `${sliderPercent}%`, transform: 'translateX(-50%)', width: '44px' }}
        onPointerDown={onPointerDown}
      >
        {/* Vertical divider line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/90 -translate-x-1/2" style={{ boxShadow: '0 0 6px rgba(0,0,0,0.5)' }} />

        {/* Grip handle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-14 bg-white rounded-full shadow-lg border-2 border-slate-300 flex items-center justify-center cursor-col-resize hover:border-slate-500 hover:shadow-xl transition-all">
          <div className="flex gap-[3px]">
            <div className="w-[2px] h-5 bg-slate-400 rounded-full" />
            <div className="w-[2px] h-5 bg-slate-400 rounded-full" />
            <div className="w-[2px] h-5 bg-slate-400 rounded-full" />
          </div>
        </div>

        {/* Arrow indicators */}
        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute -left-7 -translate-y-1/2 text-white/80 text-lg font-bold drop-shadow-md">&#9664;</div>
          <div className="absolute left-3 -translate-y-1/2 text-white/80 text-lg font-bold drop-shadow-md">&#9654;</div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-[1001] pointer-events-none">
        <Badge className="bg-purple-600 text-white text-[9px] font-bold uppercase tracking-tighter px-1.5 h-5 shadow-md pointer-events-none">
          {leftLabel}
        </Badge>
        <span className="ml-1.5 text-[10px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{leftDate}</span>
      </div>
      <div className="absolute top-3 right-3 z-[1001] pointer-events-none">
        <span className="mr-1.5 text-[10px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{rightDate}</span>
        <Badge className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-tighter px-1.5 h-5 shadow-md pointer-events-none">
          {rightLabel}
        </Badge>
      </div>

      {/* Mean value indicators */}
      <div className="absolute bottom-3 left-3 z-[1001] pointer-events-none">
        <div className="bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
          MEAN: {(leftData.statistics?.mean ?? 0).toFixed(3)}
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-[1001] pointer-events-none">
        <div className="bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
          MEAN: {(rightData.statistics?.mean ?? 0).toFixed(3)}
        </div>
      </div>
    </div>
  );
};

export default HeatmapComparisonSlider;
