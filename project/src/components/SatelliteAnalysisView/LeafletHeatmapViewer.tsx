import {  useState, useCallback, useEffect, useRef, useMemo  } from "react";
import { Download, Layers, ZoomIn, Loader, Calendar, RefreshCw } from 'lucide-react';
import { MapContainer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  HeatmapDataResponse,
  convertBoundaryToGeoJSON,
  DEFAULT_CLOUD_COVERAGE,
  formatDateForAPI
} from '../../lib/satellite-api';
import { type ColorPalette, COLOR_PALETTES } from './InteractiveIndexViewer';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';

// Fix Leaflet default icon issue - only in browser
if (typeof window !== 'undefined') {

  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

export type HeatmapRenderMode = 'grid' | 'smooth';
export type ValueDisplayMode = 'interactive' | 'always';

// Ray-casting point-in-polygon test (lon/lat coordinates)
function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

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
  renderMode?: HeatmapRenderMode;
  valueDisplay?: ValueDisplayMode;
  showIsolines?: boolean;
}

// Custom hook to add grid-based heatmap layer to map (like desired.png)
export const GridHeatmapLayer = ({ data, selectedIndex, colorPalette = 'red-green', opacity = 1.0, valueDisplay = 'interactive', showBorders = true, boundary }: {
  data: HeatmapDataResponse | null;
  selectedIndex: VegetationIndexType;
  colorPalette?: ColorPalette;
  opacity?: number;
  valueDisplay?: ValueDisplayMode;
  showBorders?: boolean;
  boundary?: [number, number][];  // [lon, lat][] — only render pixels inside this polygon
}) => {
  const map = useMap();
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);

  // Color interpolation function using selected palette
  const getColorForValue = (value: number, min: number, max: number): string => {
    const range = max - min;
    const normalized = range === 0 ? 0.5 : Math.max(0, Math.min(1, (value - min) / range));
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
    if (!data || typeof data !== 'object' || !data.pixel_data || data.pixel_data.length === 0 || !data.statistics) {
      return;
    }

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

    // Remove existing label layer
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    // Determine if we should show value labels
    const showLabels = valueDisplay === 'always';
    // Only show labels if pixel count is manageable (anti-overlap)
    const MAX_LABELS = 120;
    const shouldRenderLabels = showLabels && sortedPixels.length <= MAX_LABELS;

    if (showLabels && sortedPixels.length > MAX_LABELS) {
      labelLayerRef.current = L.layerGroup();
      const warningMarker = L.marker([sortedPixels[0].lat, sortedPixels[0].lon], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;border-radius:6px;font-size:10px;white-space:nowrap;font-weight:bold;">Zoom in to see values</div>`,
          iconAnchor: [0, 0]
        }),
        interactive: false,
      });
      labelLayerRef.current.addLayer(warningMarker);
      labelLayerRef.current.addTo(map);
    }

    const clipPolygon = boundary || (data.aoi_boundary?.length ? data.aoi_boundary as [number, number][] : undefined);

    sortedPixels.forEach((point) => {
      // Skip pixels outside parcel boundary
      if (clipPolygon && !pointInPolygon(point.lon, point.lat, clipPolygon)) return;

      const color = getColorForValue(point.value, data.statistics.min, data.statistics.max);

      const bounds: [number, number][] = [
        [point.lat - pixelSizeDegrees/2, point.lon - pixelSizeDegrees/2],
        [point.lat + pixelSizeDegrees/2, point.lon + pixelSizeDegrees/2]
      ];

      const rectangle = L.rectangle(bounds, {
        fillColor: color,
        fillOpacity: opacity,
        color: showBorders ? color : 'transparent',
        weight: showBorders ? 0.1 : 0,
        opacity: showBorders ? Math.min(0.3, opacity) : 0
      });

      if (valueDisplay === 'interactive') {
        rectangle.bindTooltip(
          `${selectedIndex}: ${point.value.toFixed(3)}<br/>Lat: ${point.lat.toFixed(6)}<br/>Lon: ${point.lon.toFixed(6)}<br/>Scale: ${pixelScale}m`,
          { sticky: true }
        );
      }

      gridLayerRef.current!.addLayer(rectangle);
    });

    gridLayerRef.current.addTo(map);

    // Add value labels if needed
    if (shouldRenderLabels) {
      labelLayerRef.current = L.layerGroup();
      sortedPixels.forEach((point) => {
        const label = L.marker([point.lat, point.lon], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:rgba(0,0,0,0.65);color:#fff;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:bold;line-height:1.4;white-space:nowrap;transform:translate(-50%,-50%);">${point.value.toFixed(2)}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          interactive: false,
          zIndexOffset: 1000
        });
        labelLayerRef.current!.addLayer(label);
      });
      labelLayerRef.current.addTo(map);
    }

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
      if (labelLayerRef.current) {
        map.removeLayer(labelLayerRef.current);
      }
    };
  }, [data, selectedIndex, map, valueDisplay, showBorders]);

  return null;
};


// Helper: get interpolated RGB from palette for a normalized value [0,1]
function paletteColorRGB(normalized: number, colorPalette: ColorPalette): [number, number, number] {
  const palette = COLOR_PALETTES[colorPalette];
  const colors = palette.colors;
  const idx = Math.max(0, Math.min(1, normalized)) * (colors.length - 1);
  const li = Math.floor(idx);
  const ui = Math.min(Math.ceil(idx), colors.length - 1);
  const t = idx - li;
  const hex2rgb = (h: string): [number, number, number] => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [lr, lg, lb] = hex2rgb(colors[li]);
  const [ur, ug, ub] = hex2rgb(colors[ui]);
  return [Math.round(lr + (ur-lr)*t), Math.round(lg + (ug-lg)*t), Math.round(lb + (ub-lb)*t)];
}

// Build heatmap canvas using bilinear interpolation.
// GEE already clips pixel_data to the AOI — pixels outside = NaN in the grid.
// Additional polygon clipping ensures clean edges matching the AOI boundary.
function buildHeatmapCanvas(
  grid: Float32Array, nRows: number, nCols: number,
  minLon: number, maxLat: number, pxDeg: number,
  min: number, range: number,
  colorPalette: ColorPalette, opacity: number,
  aoiPolygon?: [number, number][],
): string {
  // Target ~3000px on the longest side for smooth rendering at any zoom
  const maxDim = Math.max(nCols, nRows);
  const SCALE = Math.max(40, Math.ceil(3000 / maxDim));
  const cW = nCols * SCALE;
  const cH = nRows * SCALE;
  const degPerPx = pxDeg / SCALE;
  const bMinLon = minLon - pxDeg / 2;
  const bMaxLat = maxLat + pxDeg / 2;

  // Safe grid accessor — returns NaN for out-of-bounds
  const G = (r: number, c: number): number =>
    r >= 0 && r < nRows && c >= 0 && c < nCols ? grid[r * nCols + c] : NaN;

  // Cubic Hermite basis (Catmull-Rom spline, a = -0.5)
  const cubic = (t: number): [number, number, number, number] => {
    const t2 = t * t, t3 = t2 * t;
    return [
      -0.5*t3 + t2 - 0.5*t,         // w(-1)
       1.5*t3 - 2.5*t2 + 1,          // w(0)
      -1.5*t3 + 2*t2 + 0.5*t,        // w(1)
       0.5*t3 - 0.5*t2,              // w(2)
    ];
  };

  // Bicubic interpolation using 4×4 neighborhood (Catmull-Rom)
  // Falls back to bilinear then nearest-neighbor at data boundaries (NaN cells)
  const sampleGrid = (gxF: number, gyF: number): number => {
    const ci = Math.floor(gxF), ri = Math.floor(gyF);
    const fx = gxF - ci, fy = gyF - ri;

    // Try bicubic (4×4 neighborhood) — all 16 cells must be valid for clean spline
    const wx = cubic(fx), wy = cubic(fy);
    let allValid = true;
    let vSum = 0;
    for (let jr = -1; jr <= 2 && allValid; jr++) {
      for (let jc = -1; jc <= 2 && allValid; jc++) {
        const v = G(ri + jr, ci + jc);
        if (isNaN(v)) { allValid = false; break; }
        vSum += v * wy[jr + 1] * wx[jc + 1];
      }
    }
    if (allValid) return vSum;

    // Fallback: bilinear (2×2)
    const v00 = G(ri, ci), v10 = G(ri, ci+1), v01 = G(ri+1, ci), v11 = G(ri+1, ci+1);
    const corners = [v00, v10, v01, v11];
    const weights = [(1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy];
    let bwSum = 0, bvSum = 0;
    for (let k = 0; k < 4; k++) {
      if (!isNaN(corners[k])) { bwSum += weights[k]; bvSum += corners[k] * weights[k]; }
    }
    return bwSum > 0 ? bvSum / bwSum : NaN;
  };

  // Render interpolated pixels to a temporary canvas first
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = cW; tmpCanvas.height = cH;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  const img = tmpCtx.createImageData(cW, cH);
  const d = img.data;

  for (let cy = 0; cy < cH; cy++) {
    for (let cx = 0; cx < cW; cx++) {
      const lon = bMinLon + (cx + 0.5) * degPerPx;
      const lat = bMaxLat - (cy + 0.5) * degPerPx;

      const gxF = (lon - minLon) / pxDeg;
      const gyF = (maxLat - lat) / pxDeg;
      const value = sampleGrid(gxF, gyF);
      if (isNaN(value)) continue;

      const [r, g, b] = paletteColorRGB((value - min) / range, colorPalette);
      const pi = (cy * cW + cx) * 4;
      d[pi]=r; d[pi+1]=g; d[pi+2]=b; d[pi+3]=Math.round(opacity * 230);
    }
  }
  tmpCtx.putImageData(img, 0, 0);

  // Final canvas: apply vector clip path from AOI polygon, then draw the heatmap
  const canvas = document.createElement('canvas');
  canvas.width = cW; canvas.height = cH;
  const ctx = canvas.getContext('2d')!;

  // Helper to convert lon/lat to canvas pixel coordinates
  const lonToCanvasX = (lon: number) => (lon - bMinLon) / degPerPx;
  const latToCanvasY = (lat: number) => (bMaxLat - lat) / degPerPx;

  if (aoiPolygon && aoiPolygon.length > 2) {
    ctx.beginPath();
    ctx.moveTo(lonToCanvasX(aoiPolygon[0][0]), latToCanvasY(aoiPolygon[0][1]));
    for (let i = 1; i < aoiPolygon.length; i++) {
      ctx.lineTo(lonToCanvasX(aoiPolygon[i][0]), latToCanvasY(aoiPolygon[i][1]));
    }
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(tmpCanvas, 0, 0);
  return canvas.toDataURL();
}

// Smooth heatmap using Canvas ImageOverlay with bilinear interpolation + optional isolines
export const SmoothHeatmapLayer = ({ data, colorPalette = 'red-green', opacity = 1.0, valueDisplay = 'interactive', showIsolines = false, boundary }: {
  data: HeatmapDataResponse | null;
  colorPalette?: ColorPalette;
  opacity?: number;
  valueDisplay?: ValueDisplayMode;
  showIsolines?: boolean;
  boundary?: [number, number][];  // [lon, lat][] fallback for AOI clipping
}) => {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const isolinesRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!data?.pixel_data?.length || !data.statistics) return;

    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    if (isolinesRef.current) { map.removeLayer(isolinesRef.current); isolinesRef.current = null; }

    const { min, max } = data.statistics;
    const range = max - min || 1;
    const pxDeg = (data.metadata?.sample_scale || 10) / 111320;

    const lats = data.pixel_data.map(p => p.lat);
    const lons = data.pixel_data.map(p => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);

    const nRows = Math.max(2, Math.round((maxLat - minLat) / pxDeg) + 1);
    const nCols = Math.max(2, Math.round((maxLon - minLon) / pxDeg) + 1);

    const grid = new Float32Array(nRows * nCols).fill(NaN);
    data.pixel_data.forEach(p => {
      const ri = Math.round((maxLat - p.lat) / pxDeg);
      const ci = Math.round((p.lon - minLon) / pxDeg);
      if (ri >= 0 && ri < nRows && ci >= 0 && ci < nCols) grid[ri * nCols + ci] = p.value;
    });

    // The canvas renderer keeps `NaN` samples fully transparent.
    // When the source grid has sparse gaps (common with rounded lat/lon -> indices),
    // those transparent pixels show up as thin straight seams.
    //
    // We fill all NaN holes using a nearest-neighbor propagation:
    // - multi-source BFS from every finite grid cell
    // - first reach for a NaN cell wins (nearest by Manhattan distance)
    const fillNaNsWithNearestBfs = (source: Float32Array, rows: number, cols: number) => {
      const filled = new Float32Array(source);
      const idxOf = (r: number, c: number) => r * cols + c;
      const isFiniteVal = (v: number) => Number.isFinite(v) && !Number.isNaN(v);

      const total = rows * cols;
      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      let head = 0;
      let tail = 0;

      for (let idx = 0; idx < total; idx++) {
        if (isFiniteVal(filled[idx])) {
          visited[idx] = 1;
          queue[tail++] = idx;
        }
      }

      // If the whole grid is NaN, leave it as-is (nothing we can do).
      if (tail === 0) return filled;

      while (head < tail) {
        const idx = queue[head++];
        const r = Math.floor(idx / cols);
        const c = idx - r * cols;
        const v = filled[idx];

        // 4-neighborhood is enough and avoids diagonal artifacts.
        const neighbors: number[] = [
          r > 0 ? idxOf(r - 1, c) : -1,
          r + 1 < rows ? idxOf(r + 1, c) : -1,
          c > 0 ? idxOf(r, c - 1) : -1,
          c + 1 < cols ? idxOf(r, c + 1) : -1,
        ];

        for (const nIdx of neighbors) {
          if (nIdx < 0 || visited[nIdx]) continue;
          visited[nIdx] = 1;
          filled[nIdx] = v;
          queue[tail++] = nIdx;
        }
      }

      return filled;
    };

    const gridFilled = fillNaNsWithNearestBfs(grid, nRows, nCols);

    const aoiPolygon = data.aoi_boundary?.length
      ? data.aoi_boundary as [number, number][]
      : boundary;
    const dataUrl = buildHeatmapCanvas(gridFilled, nRows, nCols, minLon, maxLat, pxDeg, min, range, colorPalette, opacity, aoiPolygon);
    const bounds = L.latLngBounds([minLat - pxDeg/2, minLon - pxDeg/2], [maxLat + pxDeg/2, maxLon + pxDeg/2]);
    overlayRef.current = L.imageOverlay(dataUrl, bounds, { opacity: 1, interactive: false });
    overlayRef.current.addTo(map);
    // Ensure smooth scaling — prevent pixelated rendering when the browser scales the image
    const imgEl = overlayRef.current.getElement();
    if (imgEl) {
      imgEl.style.imageRendering = 'auto';
    }
    map.fitBounds(bounds, { padding: [20, 20] });

    // Marching squares isolines
    if (showIsolines) {
      isolinesRef.current = L.layerGroup();
      const NUM_LEVELS = 5;
      const thresholds = Array.from({ length: NUM_LEVELS }, (_, i) => min + (i + 1) * range / (NUM_LEVELS + 1));

      thresholds.forEach(threshold => {
        const segments: [[number,number],[number,number]][] = [];
        for (let r = 0; r < nRows - 1; r++) {
          for (let c = 0; c < nCols - 1; c++) {
            const vTL = grid[r*nCols+c], vTR = grid[r*nCols+c+1];
            const vBL = grid[(r+1)*nCols+c], vBR = grid[(r+1)*nCols+c+1];
            if (isNaN(vTL) || isNaN(vTR) || isNaN(vBL) || isNaN(vBR)) continue;
            const lonL = minLon + c * pxDeg, lonR = minLon + (c+1) * pxDeg;
            const latT = maxLat - r * pxDeg, latB = maxLat - (r+1) * pxDeg;
            const lerp = (v1: number, v2: number) => (threshold - v1) / (v2 - v1);
            const top    = (vTL > threshold) !== (vTR > threshold) ? [latT, lonL + lerp(vTL,vTR)*pxDeg] as [number,number] : null;
            const right  = (vTR > threshold) !== (vBR > threshold) ? [latT - lerp(vTR,vBR)*pxDeg, lonR] as [number,number] : null;
            const bottom = (vBL > threshold) !== (vBR > threshold) ? [latB, lonL + lerp(vBL,vBR)*pxDeg] as [number,number] : null;
            const left   = (vTL > threshold) !== (vBL > threshold) ? [latT - lerp(vTL,vBL)*pxDeg, lonL] as [number,number] : null;
            const cross = [top, right, bottom, left].filter(Boolean) as [number,number][];
            if (cross.length === 2) segments.push([cross[0], cross[1]]);
            else if (cross.length === 4) { segments.push([cross[0], cross[3]]); segments.push([cross[1], cross[2]]); }
          }
        }
        if (segments.length > 0) {
          isolinesRef.current!.addLayer(L.polyline(segments, { color: 'white', weight: 1.5, opacity: 0.85, smoothFactor: 1.5 }));
        }
      });
      isolinesRef.current.addTo(map);
    }

    return () => {
      if (overlayRef.current) map.removeLayer(overlayRef.current);
      if (isolinesRef.current) map.removeLayer(isolinesRef.current);
    };
  }, [data, colorPalette, opacity, map, showIsolines, boundary]);

  // Click popup for interactive mode
  useEffect(() => {
    if (!data?.pixel_data?.length || valueDisplay !== 'interactive') return;
    const pxDeg = (data.metadata?.sample_scale || 10) / 111320;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMapClick = (e: any) => {
      const { lat, lng } = e.latlng;
      const nearest = data.pixel_data.reduce((best, p) =>
        Math.abs(p.lat-lat)+Math.abs(p.lon-lng) < Math.abs(best.lat-lat)+Math.abs(best.lon-lng) ? p : best
      );
      if (Math.abs(nearest.lat-lat)+Math.abs(nearest.lon-lng) < pxDeg * 4) {
        L.popup().setLatLng([lat, lng])
          .setContent(`Valeur: <strong>${nearest.value.toFixed(3)}</strong><br/>Lat: ${nearest.lat.toFixed(5)}<br/>Lon: ${nearest.lon.toFixed(5)}`)
          .openOn(map);
      }
    };
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [data, map, valueDisplay]);

  return null;
};


interface ColorScaleProps {
  data: HeatmapDataResponse;
  colorPalette: ColorPalette | string;
}

const ColorScale = ({ data, colorPalette }: ColorScaleProps) => {
  const steps = 20;
  const stepHeight = 20;
  const scaleHeight = steps * stepHeight;
  const palette = COLOR_PALETTES[(colorPalette || 'red-green') as ColorPalette];

  const getColorForNormalized = (normalized: number): string => {
    const colors = palette.colors;
    const safeNorm = Number.isFinite(normalized) ? Math.max(0, Math.min(1, normalized)) : 0.5;
    const index = safeNorm * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(Math.ceil(index), colors.length - 1);

    if (lowerIndex === upperIndex || !colors[lowerIndex] || !colors[upperIndex]) {
      return colors[lowerIndex] || colors[0];
    }

    const t = index - lowerIndex;
    const lower = colors[lowerIndex];
    const upper = colors[upperIndex];

    const lowerRGB = {
      r: parseInt(lower.slice(1, 3), 16),
      g: parseInt(lower.slice(3, 5), 16),
      b: parseInt(lower.slice(5, 7), 16)
    };
    const upperRGB = {
      r: parseInt(upper.slice(1, 3), 16),
      g: parseInt(upper.slice(3, 5), 16),
      b: parseInt(upper.slice(5, 7), 16)
    };

    const r = Math.round(lowerRGB.r + (upperRGB.r - lowerRGB.r) * t);
    const g = Math.round(lowerRGB.g + (upperRGB.g - lowerRGB.g) * t);
    const b = Math.round(lowerRGB.b + (upperRGB.b - lowerRGB.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-[1000]">
      <div className="flex items-center">
        <div className="flex flex-col mr-2" style={{ height: scaleHeight }}>
          {Array.from({ length: steps }).map((_, stepIdx) => {
            const value = data.statistics.max - (stepIdx / (steps - 1)) * (data.statistics.max - data.statistics.min);
            const normalized = (value - data.statistics.min) / (data.statistics.max - data.statistics.min);
            const color = getColorForNormalized(normalized);

            return (
              <div
                key={"step-" + stepIdx}
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
        <div className="flex flex-col justify-between text-xs text-gray-900 dark:text-gray-100" style={{ height: scaleHeight }}>
          <span>{(data.statistics?.max ?? 0).toFixed(1)}</span>
          <span>{(((data.statistics?.max ?? 0) + (data.statistics?.min ?? 0)) / 2).toFixed(1)}</span>
          <span>{(data.statistics?.min ?? 0).toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

const LeafletHeatmapViewer = ({
  parcelId,
  parcelName,
  boundary,
  initialData,
  selectedIndex: propSelectedIndex,
  selectedDate: propSelectedDate,
  embedded = false,
  colorPalette = 'red-green',
  compact = false,
  baseLayer = 'satellite',
  renderMode = 'smooth',
  valueDisplay = 'interactive',
  showIsolines = false,
}: LeafletHeatmapViewerProps) => {
  const { t } = useTranslation('satellite');
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>(propSelectedIndex || 'NIRv');
  const [selectedDate, setSelectedDate] = useState(propSelectedDate || '');
  const [samplePoints, setSamplePoints] = useState(10000); // Start with high detail
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isCheckingDates, setIsCheckingDates] = useState(false);
  const [recommendedDate, setRecommendedDate] = useState<string | null>(null);



  useEffect(() => {
    if (propSelectedIndex) setSelectedIndex(propSelectedIndex);
  }, [propSelectedIndex]);

  useEffect(() => {
    if (propSelectedDate) setSelectedDate(propSelectedDate);
  }, [propSelectedDate]);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const checkAvailableDates = useCallback(async () => {
    if (!boundary || embedded) return;

    setIsCheckingDates(true);
    setError(null);

    try {
      const endDate = formatDateForAPI(new Date());
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const startDateStr = formatDateForAPI(startDate);

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
        max_cloud_coverage: DEFAULT_CLOUD_COVERAGE
      });

      if (result.recommended_date) {
        setRecommendedDate(result.recommended_date);
        setSelectedDate(prev => prev || result.recommended_date!);
      }

      const dates = result.recommended_date ? [result.recommended_date] : [];
      setAvailableDates(dates);

    } catch (err) {
      console.error('Error checking available dates:', err);
      setError(t('satellite:heatmap.warnings.failedToCheckDates'));
    } finally {
      setIsCheckingDates(false);
    }
  }, [boundary, parcelName, embedded, t]);

  useEffect(() => {
    if (!embedded && boundary && boundary.length > 0) {
      checkAvailableDates();
    }
  }, [embedded, boundary, checkAvailableDates]);

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
        grid_size: samplePoints,
        parcel_id: parcelId,
      };

      const result = await satelliteApi.getHeatmapData(requestParams);

      setData(result as HeatmapDataResponse);
    } catch (err) {
      // Backend signals "no Sentinel-2 acquisition for this date" via a
      // structured 404 detail. Render a friendly warning instead of the
      // generic "request failed" message.
      const detail = (err as Error & { detail?: { code?: string; hint?: string } })?.detail;
      if (detail?.code === 'no_satellite_imagery') {
        setError(
          t(
            'satellite:heatmap.warnings.noImageryForDate',
            'Aucune image Sentinel-2 disponible pour cette date. Le satellite repasse environ tous les 5 jours et les jours nuageux sont filtrés. Choisissez une date proche.',
          ),
        );
      } else {
        setError(err instanceof Error ? err.message : t('satellite:heatmap.warnings.failedToGenerate'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [boundary, parcelName, selectedDate, selectedIndex, samplePoints, parcelId, t]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      NIRv: '#ef4444', EVI: '#0ea5e9', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
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

  // Boundary in WGS84 [lon, lat] format for heatmap clipping
  const clipBoundary: [number, number][] | undefined = useMemo(() => {
    if (data?.aoi_boundary?.length) return data.aoi_boundary as [number, number][];
    if (boundary?.length) {
      // Convert from Web Mercator (EPSG:3857) to WGS84 if needed
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
  }, [data?.aoi_boundary, boundary]);

  return (
    <div className={`bg-white rounded-lg shadow p-6 space-y-6 ${embedded ? 'p-0 shadow-none' : ''}`}>
      {!embedded && (
        <>
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">{t('satellite:heatmap.leafletViewer.title', { index: selectedIndex })}</h1>
            <div className="text-lg text-gray-600 mt-2">{selectedDate}</div>
          </div>

          {/* Configuration Panel - Only shown when not embedded */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">{t('satellite:heatmap.configuration')}</h3>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date
                  {isCheckingDates && (
                    <span className="ml-2 text-xs text-gray-500">
                      <RefreshCw className="inline w-3 h-3 animate-spin mr-1" />
                      {t('satellite:heatmap.leafletViewer.checkingAvailability')}
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
                    <Button variant="blue"
                      onClick={() => setSelectedDate(recommendedDate)}
                      className="absolute right-1 top-1 bottom-1 px-2 text-xs bg-blue-500 rounded hover:bg-blue-600"
                      title={`Use recommended date: ${recommendedDate}`}
                    >
                      <Calendar className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {availableDates.length > 0 && !availableDates.includes(selectedDate) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {t('satellite:heatmap.warnings.noDataForDate', { date: recommendedDate })}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('satellite:heatmap.labels.vegetationIndex')}</label>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {VEGETATION_INDICES.map((vegIndex) => (
                    <option key={vegIndex} value={vegIndex}>{vegIndex}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('satellite:heatmap.samplePoints.label')}</label>
                <select
                  value={samplePoints}
                  onChange={(e) => setSamplePoints(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={1000}>1000 ({t('satellite:heatmap.samplePoints.fast')})</option>
                  <option value={2000}>2000 ({t('satellite:heatmap.samplePoints.balanced')})</option>
                  <option value={5000}>5000 ({t('satellite:heatmap.samplePoints.detailed')})</option>
                  <option value={10000}>10000 ({t('satellite:heatmap.samplePoints.highDetail')})</option>
                  <option value={25000}>25000 ({t('satellite:heatmap.samplePoints.maximumDetail')})</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="green" onClick={generateVisualization} disabled={isLoading || !boundary} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed" >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
                  {isLoading ? t('satellite:heatmap.actions.loading') : data ? t('satellite:heatmap.actions.regenerate') : t('satellite:heatmap.actions.generate')}
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>{t('satellite:heatmap.labels.indexDescription')}</strong> {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
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
            {t('satellite:heatmap.leafletViewer.heatmapTitle', { index: selectedIndex, date: selectedDate })}
          </h3>
          {data && (
            <Button variant="blue" onClick={downloadData} className="flex items-center gap-2 px-4 py-2 rounded-md" >
              <Download className="w-4 h-4" />
              {t('satellite:heatmap.leafletViewer.exportData')}
            </Button>
          )}
        </div>

        <div className={`border rounded-lg overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-96'}`}>
          {/* Fullscreen Toggle Button */}
          {!compact && (
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg p-2 shadow-lg transition-colors"
              title={isFullscreen ? t('satellite:heatmap.fullscreen.exit') : t('satellite:heatmap.fullscreen.enter')}
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
            </Button>
          )}
          {data && <ColorScale data={data} colorPalette={colorPalette} />}
          {/* Statistics Box (like desired.png) */}
          {data?.statistics && (
            <div key="stats-box" className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-sm z-[1000]">
              <div>{t('satellite:heatmap.leafletViewer.statistics.mean')}: {(data.statistics.mean ?? 0).toFixed(3)}</div>
              <div>{t('satellite:heatmap.leafletViewer.statistics.median')}: {(data.statistics.median ?? 0).toFixed(3)}</div>
              <div>{t('satellite:heatmap.leafletViewer.statistics.p10')}: {(data.statistics.p10 ?? 0).toFixed(3)}</div>
              <div>{t('satellite:heatmap.leafletViewer.statistics.p90')}: {(data.statistics.p90 ?? 0).toFixed(3)}</div>
              <div>{t('satellite:heatmap.leafletViewer.statistics.std')}: {(data.statistics.std ?? 0).toFixed(3)}</div>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            className="leaflet-container"
          >
            <LeafletBaseTileLayers
              variant={baseLayer === 'satellite' ? 'satellite' : 'streets'}
              withSatelliteReferenceLabels={baseLayer === 'satellite'}
            />

            {/* Heatmap Layer — switches by renderMode, clipped to boundary */}
            {renderMode === 'grid' && (
              <GridHeatmapLayer key="grid-heatmap" data={data} selectedIndex={selectedIndex} colorPalette={colorPalette} valueDisplay={valueDisplay} showBorders={false} boundary={clipBoundary} />
            )}
            {renderMode === 'smooth' && (
              <SmoothHeatmapLayer key="smooth-heatmap" data={data} colorPalette={colorPalette} valueDisplay={valueDisplay} showIsolines={showIsolines} boundary={clipBoundary} />
            )}

            {/* Parcel border outline */}
            {polygonPositions.length > 0 && (
              <Polygon
                key="parcel-border"
                positions={polygonPositions}
                pathOptions={{
                  color: '#00FF00',
                  weight: 2.5,
                  fillOpacity: 0,
                  opacity: 0.9,
                }}
              />
            )}


          </MapContainer>
        </div>

      </div>
    </div>
  );
};

export default LeafletHeatmapViewer;
