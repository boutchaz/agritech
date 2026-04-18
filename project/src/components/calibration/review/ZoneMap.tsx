import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, Filter } from 'lucide-react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection, Feature, GeoJsonObject, Point, Polygon } from 'geojson';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';
import type { HeatmapData, SpatialPatterns } from '@/types/calibration-review';

interface ZoneMapProps {
  heatmap: HeatmapData;
  spatialPatterns: SpatialPatterns | null;
  heterogeneityFlag: boolean;
  boundary?: number[][];
}

type ColorScale = 'vigor' | 'gci' | 'ndmi';

const ZONE_DESCRIPTIONS: Record<string, string> = {
  A: 'très vigoureuse, vert foncé',
  B: 'vigoureuse, vert moyen',
  C: 'normale, vert clair',
  D: 'faible, orange',
  E: 'problématique, rouge',
};

const COLOR_SCALES: Record<ColorScale, { label: string; colors: [number, number, number][] }> = {
  vigor: {
    label: 'Vigueur (NDVI)',
    colors: [
      [215, 48, 39],    // red (low)
      [252, 141, 89],   // orange
      [254, 224, 139],  // yellow
      [255, 255, 191],  // cream
      [217, 239, 255],  // light blue
      [145, 191, 219],  // medium blue
      [69, 117, 180],   // blue (high)
    ],
  },
  gci: {
    label: 'Nutritionnel (GCI)',
    colors: [
      [165, 0, 38],     // deep red (severe deficiency)
      [215, 48, 39],    // red
      [244, 109, 67],   // orange-red
      [253, 174, 97],   // orange
      [254, 224, 139],  // yellow
      [144, 190, 109],  // light green
      [39, 136, 69],    // dark green (well-nourished)
    ],
  },
  ndmi: {
    label: 'Humidité (NDMI)',
    colors: [
      [215, 48, 39],
      [252, 141, 89],
      [254, 224, 144],
      [224, 243, 248],
      [171, 217, 233],
      [116, 173, 209],
      [69, 117, 180],
    ],
  },
};

// --- Coordinate utilities ---

function toWgs84(coord: number[]): number[] {
  const [x, y] = coord;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    const lon = (x / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
    return [lon, lat];
  }
  return coord;
}

function ensureWgs84Ring(ring: number[][]): number[][] {
  if (!ring?.length) return ring;
  const [x, y] = ring[0];
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    return ring.map(toWgs84);
  }
  return ring;
}

function closedRingCoordinates(ring: number[][]): number[][] {
  if (ring.length < 3) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function ringBBox(ring: number[][]): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  if (!ring?.length) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const pt of ring) {
    const [lng, lat] = pt;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLng)) return null;
  return { minLng, minLat, maxLng, maxLat };
}

// Point-in-polygon (ray casting)
function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Interpolate between two RGB colors
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Map a normalized value (0-1) to RGB using a multi-stop color scale
function valueToRgb(normalized: number, colors: [number, number, number][]): [number, number, number] {
  const t = Math.max(0, Math.min(1, normalized));
  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return colors[lo];
  return lerpColor(colors[lo], colors[hi], idx - lo);
}

interface DataPoint {
  lon: number;
  lat: number;
  value: number;
}

// --- Detect if GeoJSON features have real geographic coordinates ---
function hasGeographicCoordinates(fc: FeatureCollection): boolean {
  const { features } = fc;
  if (!features?.length) return false;
  for (const f of features) {
    if (f.geometry?.type !== 'Point') return false;
    const [lng, lat] = (f.geometry as Point).coordinates;
    if (Math.abs(lng) <= 180 && Math.abs(lat) <= 90 && (Math.abs(lng) > 1 || Math.abs(lat) > 1)) {
      return true;
    }
  }
  return false;
}

// Extract data points from GeoJSON features
function extractDataPoints(fc: FeatureCollection): DataPoint[] {
  return fc.features
    .filter((f) => f.geometry?.type === 'Point' && f.properties?.value != null)
    .map((f) => ({
      lon: (f.geometry as Point).coordinates[0],
      lat: (f.geometry as Point).coordinates[1],
      value: Number(f.properties!.value),
    }));
}

// --- IDW Canvas Heatmap Layer ---

function IDWHeatmapLayer({
  points,
  boundary,
  colorScale,
  opacity = 0.65,
}: {
  points: DataPoint[];
  boundary: number[][];
  colorScale: ColorScale;
  opacity?: number;
}) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  const imageUrl = useMemo(() => {
    if (!points.length || !boundary.length) return null;

    const bbox = ringBBox(boundary);
    if (!bbox) return null;

    const { minLng, maxLng, minLat, maxLat } = bbox;
    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;
    if (lngSpan <= 0 || latSpan <= 0) return null;

    // Determine canvas resolution (cap at 250 for performance)
    const aspect = lngSpan / latSpan;
    const RES = 200;
    const width = aspect >= 1 ? RES : Math.max(50, Math.round(RES * aspect));
    const height = aspect >= 1 ? Math.max(50, Math.round(RES / aspect)) : RES;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const colors = COLOR_SCALES[colorScale].colors;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Pre-compute point positions in canvas space for speed
    const pxPoints = points.map((p) => ({
      cx: ((p.lon - minLng) / lngSpan) * width,
      cy: ((maxLat - p.lat) / latSpan) * height,
      value: p.value,
    }));

    for (let py = 0; py < height; py++) {
      const lat = maxLat - (py / height) * latSpan;
      for (let px = 0; px < width; px++) {
        const lng = minLng + (px / width) * lngSpan;

        if (!pointInPolygon(lng, lat, boundary)) continue;

        // IDW interpolation (power=2)
        let sumW = 0;
        let sumWV = 0;
        for (const p of pxPoints) {
          const dx = px - p.cx;
          const dy = py - p.cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            sumW = 1;
            sumWV = p.value;
            break;
          }
          const w = 1 / d2;
          sumW += w;
          sumWV += w * p.value;
        }

        const value = sumW > 0 ? sumWV / sumW : minVal;
        const normalized = (value - minVal) / range;
        const [r, g, b] = valueToRgb(normalized, colors);

        const idx = (py * width + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.round(opacity * 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }, [points, boundary, colorScale, opacity]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
    if (!imageUrl || !boundary.length) return;

    const bbox = ringBBox(boundary);
    if (!bbox) return;

    const bounds = L.latLngBounds(
      [bbox.minLat, bbox.minLng],
      [bbox.maxLat, bbox.maxLng],
    );
    const overlay = L.imageOverlay(imageUrl, bounds, { opacity: 1, interactive: false });
    overlay.addTo(map);
    overlayRef.current = overlay;

    return () => {
      overlay.remove();
    };
  }, [map, imageUrl, boundary]);

  return null;
}

// --- Fit Bounds helper ---

function FitBounds({ boundary }: { boundary?: number[][] }) {
  const map = useMap();
  useEffect(() => {
    if (!boundary?.length || boundary.length < 3) return;
    try {
      const wgs = ensureWgs84Ring(boundary);
      const latLngs = wgs.map(([lng, lat]) => [lat, lng] as [number, number]);
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 18 });
      }
    } catch {
      // ignore
    }
  }, [map, boundary]);
  return null;
}

// --- Pixel grid fallback (legacy: converts pixel indices to cell polygons) ---

function isPixelGridFeatureCollection(fc: FeatureCollection): boolean {
  const { features } = fc;
  if (!features?.length) return false;
  let maxC = 0, maxR = 0, minC = Infinity, minR = Infinity;
  let allIntegers = true;
  for (const f of features) {
    if (f.geometry?.type !== 'Point') return false;
    const [a, b] = (f.geometry as Point).coordinates;
    maxC = Math.max(maxC, a);
    maxR = Math.max(maxR, b);
    minC = Math.min(minC, a);
    minR = Math.min(minR, b);
    if (allIntegers && (a % 1 !== 0 || b % 1 !== 0)) allIntegers = false;
  }
  const startsAtZero = minC === 0 && minR === 0;
  const spanC = maxC - minC;
  const spanR = maxR - minR;
  const looksLikeGeographic = spanC <= 1.25 && spanR <= 1.25 && maxC <= 180 && minC >= -180 && maxR <= 90 && minR >= -90;
  if (allIntegers && startsAtZero && !looksLikeGeographic) return true;
  return (spanC > 2.5 || spanR > 2.5 || maxC > 24 || maxR > 24) && !looksLikeGeographic;
}

function transformPixelGridToCellPolygons(fc: FeatureCollection, boundaryRing: number[][]): FeatureCollection {
  const bbox = ringBBox(boundaryRing);
  if (!bbox) return fc;
  let maxCol = 0, maxRow = 0;
  for (const f of fc.features) {
    if (f.geometry?.type === 'Point') {
      const [c, r] = (f.geometry as Point).coordinates;
      maxCol = Math.max(maxCol, c);
      maxRow = Math.max(maxRow, r);
    }
  }
  const cols = Math.max(1, Math.floor(maxCol) + 1);
  const rows = Math.max(1, Math.floor(maxRow) + 1);
  const { minLng, maxLng, minLat, maxLat } = bbox;
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;

  const features: Feature[] = fc.features.map((f) => {
    if (f.geometry?.type !== 'Point') return f;
    const [col, row] = (f.geometry as Point).coordinates;
    const ci = Math.floor(col);
    const ri = Math.floor(row);
    const lng0 = minLng + (ci / cols) * lngSpan;
    const lng1 = minLng + ((ci + 1) / cols) * lngSpan;
    const latN = maxLat - (ri / rows) * latSpan;
    const latS = maxLat - ((ri + 1) / rows) * latSpan;
    const ring: [number, number][] = [[lng0, latN], [lng1, latN], [lng1, latS], [lng0, latS], [lng0, latN]];
    return { type: 'Feature', properties: f.properties ?? {}, geometry: { type: 'Polygon', coordinates: [ring] } as Polygon };
  });
  return { type: 'FeatureCollection', features };
}

function zoneClassFromProps(properties: GeoJSON.GeoJsonProperties | undefined): string {
  if (!properties || typeof properties !== 'object') return '';
  const p = properties as Record<string, unknown>;
  return (
    (typeof p.class_name === 'string' && p.class_name) ||
    (typeof p.zone === 'string' && p.zone) ||
    (typeof p.class === 'string' && p.class) ||
    ''
  );
}

// --- Main Component ---

export function ZoneMap({ heatmap, spatialPatterns, heterogeneityFlag, boundary }: ZoneMapProps) {
  const { t } = useTranslation('ai');
  const [colorScale, setColorScale] = useState<ColorScale>('vigor');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65);

  const sortedZones = useMemo(
    () =>
      [...heatmap.zone_summary].sort((a, b) => {
        const order = ['A', 'B', 'C', 'D', 'E'];
        return order.indexOf(a.class_name) - order.indexOf(b.class_name);
      }),
    [heatmap.zone_summary],
  );

  const totalPercent = sortedZones.reduce((sum, z) => sum + z.percent, 0);

  const wgs84Boundary = useMemo(() => {
    if (!boundary?.length) return null;
    return closedRingCoordinates(ensureWgs84Ring(boundary));
  }, [boundary]);

  // Determine rendering mode: smooth IDW heatmap vs. legacy polygon grid
  const renderConfig = useMemo(() => {
    const raw = heatmap.zones_geojson;
    if (!raw || typeof raw !== 'object') {
      return { mode: 'none' as const, points: [] as DataPoint[], fallbackGeoJson: null as GeoJsonObject | null };
    }
    const fc = raw as unknown as FeatureCollection;
    if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
      return { mode: 'none' as const, points: [], fallbackGeoJson: null };
    }

    // Prefer smooth heatmap when we have real geographic coordinates
    if (hasGeographicCoordinates(fc)) {
      const points = extractDataPoints(fc);
      if (points.length > 1) {
        return { mode: 'smooth' as const, points, fallbackGeoJson: null };
      }
    }

    // Legacy: pixel grid → polygon grid (when no real coordinates)
    if (isPixelGridFeatureCollection(fc) && wgs84Boundary) {
      const transformed = transformPixelGridToCellPolygons(fc, wgs84Boundary);
      return { mode: 'legacy' as const, points: [], fallbackGeoJson: transformed as GeoJsonObject };
    }

    return { mode: 'legacy' as const, points: [], fallbackGeoJson: raw as unknown as GeoJsonObject };
  }, [heatmap.zones_geojson, wgs84Boundary]);

  const zoneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of heatmap.zone_summary) map.set(z.class_name, z.color);
    return map;
  }, [heatmap.zone_summary]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (boundary && boundary.length > 0) {
      const wgs = ensureWgs84Ring(boundary);
      const avgLng = wgs.reduce((s, p) => s + p[0], 0) / wgs.length;
      const avgLat = wgs.reduce((s, p) => s + p[1], 0) / wgs.length;
      return [avgLat, avgLng];
    }
    return [33.9, -5.5];
  }, [boundary]);

  const geoJsonStyle = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      if (feature?.geometry?.type === 'Point') return {};
      const className = zoneClassFromProps(feature?.properties ?? null);
      const color = zoneColorMap.get(className) ?? '#888888';
      return { fillColor: color, fillOpacity: 0.58, color, weight: 0, opacity: 0.92 };
    },
    [zoneColorMap],
  );

  if (!heatmap.available) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          3. {t('calibrationReview.zones.title')}
        </h2>
        <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-gray-400">
          <Info className="h-5 w-5 mr-2" />
          <span className="text-sm">{heatmap.blocked_message}</span>
        </div>
      </div>
    );
  }

  const showMap = renderConfig.mode !== 'none' || (wgs84Boundary && renderConfig.points.length > 0);
  const needsBoundary = !wgs84Boundary && renderConfig.mode === 'none';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          3. {t('calibrationReview.zones.title')}
        </h2>

        {/* Filter controls */}
        {renderConfig.mode === 'smooth' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={colorScale}
              onChange={(e) => setColorScale(e.target.value as ColorScale)}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {Object.entries(COLOR_SCALES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              type="range"
              min={20}
              max={90}
              value={Math.round(heatmapOpacity * 100)}
              onChange={(e) => setHeatmapOpacity(Number(e.target.value) / 100)}
              className="w-16 h-1 accent-blue-600"
              title="Opacité"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Map */}
        <div className="relative rounded-lg overflow-hidden min-h-[280px]">
          {needsBoundary && (
            <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[280px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 text-center">
              <Info className="h-6 w-6 text-amber-600" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {t('calibrationReview.zones.needsBoundary')}
              </p>
            </div>
          )}

          {showMap && (
            <MapContainer
              center={defaultCenter}
              zoom={15}
              className="h-full w-full min-h-[280px] z-0"
              zoomControl={false}
              attributionControl={false}
              scrollWheelZoom={false}
              dragging
              doubleClickZoom={false}
              touchZoom
              preferCanvas
            >
              <LeafletBaseTileLayers variant="satellite" />

              {/* Smooth IDW heatmap */}
              {renderConfig.mode === 'smooth' && wgs84Boundary && (
                <IDWHeatmapLayer
                  points={renderConfig.points}
                  boundary={wgs84Boundary}
                  colorScale={colorScale}
                  opacity={heatmapOpacity}
                />
              )}

              {/* Legacy polygon grid */}
              {renderConfig.mode === 'legacy' && renderConfig.fallbackGeoJson && (
                <GeoJSON
                  key={`legacy-${(renderConfig.fallbackGeoJson as FeatureCollection)?.features?.length}`}
                  data={renderConfig.fallbackGeoJson}
                  interactive={false}
                  style={geoJsonStyle}
                />
              )}

              {/* Parcel boundary overlay */}
              {wgs84Boundary && (
                <GeoJSON
                  key="parcel-boundary"
                  data={{
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Polygon', coordinates: [wgs84Boundary] },
                  } as GeoJsonObject}
                  interactive={false}
                  style={{
                    fillOpacity: 0,
                    color: '#2563eb',
                    weight: 3,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              <FitBounds boundary={boundary} />
            </MapContainer>
          )}

          {!showMap && !needsBoundary && (
            <div className="flex items-center justify-center h-full min-h-[280px] bg-gray-50 dark:bg-gray-800/50 text-center text-gray-400 dark:text-gray-500">
              <div>
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm">{t('calibrationReview.zones.mapPlaceholder')}</p>
              </div>
            </div>
          )}

          {spatialPatterns?.detected && (
            <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium">Pattern detected:</span> {spatialPatterns.message}
            </div>
          )}
        </div>

        {/* Right: Legend + details */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('calibrationReview.zones.rasterPixels')}
            </h3>

            {/* Smooth heatmap: continuous gradient legend */}
            {renderConfig.mode === 'smooth' && (
              <div className="mb-4">
                <div
                  className="h-4 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${COLOR_SCALES[colorScale].colors
                      .map(([r, g, b]) => `rgb(${r},${g},${b})`)
                      .join(', ')})`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Faible</span>
                  <span>Moyen</span>
                  <span>Vigoureux</span>
                </div>
              </div>
            )}

            {/* Zone class breakdown */}
            <div className="space-y-2">
              {sortedZones.map((zone) => (
                <div key={zone.class_name} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.color }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    Classe {zone.class_name} ({ZONE_DESCRIPTIONS[zone.class_name] ?? zone.label})
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {Math.round(zone.percent)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {heterogeneityFlag && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                {t('calibrationReview.blockB.heterogeneity', 'Hétérogénéité significative')}
              </span>
            </div>
          )}
        </div>
      </div>

      {sortedZones.length > 0 && totalPercent > 0 && (
        <div className="mt-5">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {sortedZones.map((zone) => (
              <div
                key={zone.class_name}
                className="relative flex items-center justify-center text-white text-xs font-bold"
                style={{
                  width: `${(zone.percent / totalPercent) * 100}%`,
                  backgroundColor: zone.color,
                  minWidth: zone.percent > 0 ? '24px' : '0',
                }}
              >
                {zone.percent >= 8 && `${Math.round(zone.percent)}%`}
              </div>
            ))}
          </div>
        </div>
      )}

      {heatmap.date_image && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {t('calibrationReview.zones.basedOn', 'Basée sur NDVI — image Sentinel-2 du')}{' '}
          {new Date(heatmap.date_image).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}
