import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection, Feature, GeoJsonObject, Point } from 'geojson';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';
import type { HeatmapData, SpatialPatterns } from '@/types/calibration-review';

interface ZoneMapProps {
  heatmap: HeatmapData;
  spatialPatterns: SpatialPatterns | null;
  heterogeneityFlag: boolean;
  boundary?: number[][];
}

const ZONE_DESCRIPTIONS: Record<string, string> = {
  A: 'très vigoureuse, vert foncé',
  B: 'vigoureuse, vert moyen',
  C: 'normale, vert clair',
  D: 'faible, orange',
  E: 'problématique, rouge',
};

function ringBBox(ring: number[][]): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  if (!ring?.length) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
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

/**
 * Calibration step7 emits raster cells as GeoJSON Points with coordinates [col, row] in pixel space,
 * not WGS84. Leaflet would plot them as lon/lat and use default marker icons (stacked glitches).
 *
 * Heuristic: a single parcel in WGS84 has a small lon/lat span (usually under ~1°). Raster index spans are larger.
 */
function isPixelGridFeatureCollection(fc: FeatureCollection): boolean {
  const { features } = fc;
  if (!features?.length) return false;

  let maxC = 0;
  let maxR = 0;
  let minC = Infinity;
  let minR = Infinity;

  for (const f of features) {
    const g = f.geometry;
    if (g?.type !== 'Point') return false;
    const [a, b] = (g as Point).coordinates;
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    maxC = Math.max(maxC, a);
    maxR = Math.max(maxR, b);
    minC = Math.min(minC, a);
    minR = Math.min(minR, b);
  }

  const spanC = maxC - minC;
  const spanR = maxR - minR;

  const looksLikeGeographicParcel =
    spanC <= 1.25 &&
    spanR <= 1.25 &&
    maxC <= 180 &&
    minC >= -180 &&
    maxR <= 90 &&
    minR >= -90;

  const looksLikeIndexGrid = spanC > 2.5 || spanR > 2.5 || maxC > 24 || maxR > 24;

  return looksLikeIndexGrid && !looksLikeGeographicParcel;
}

function transformPixelGridToWgs84(fc: FeatureCollection, boundaryRing: number[][]): FeatureCollection {
  const bbox = ringBBox(boundaryRing);
  if (!bbox) return fc;

  let maxCol = 0;
  let maxRow = 0;
  for (const f of fc.features) {
    const g = f.geometry;
    if (g?.type === 'Point') {
      const [c, r] = (g as Point).coordinates;
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
    const g = f.geometry;
    if (g?.type !== 'Point') return f;
    const [col, row] = (g as Point).coordinates;
    const lng = minLng + ((Number(col) + 0.5) / cols) * lngSpan;
    const lat = maxLat - ((Number(row) + 0.5) / rows) * latSpan;
    return {
      ...f,
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

function closedRingCoordinates(ring: number[][]): number[][] {
  if (ring.length < 3) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/** Fits the map to the GeoJSON or parcel boundary bounds. */
function FitBounds({ geojson, boundary }: { geojson: GeoJsonObject | null; boundary?: number[][] }) {
  const map = useMap();

  useEffect(() => {
    try {
      if (geojson) {
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 18 });
          return;
        }
      }
      if (boundary && boundary.length > 2) {
        const latLngs = boundary.map(([lng, lat]) => [lat, lng] as [number, number]);
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 18 });
        }
      }
    } catch {
      // Silently ignore malformed data
    }
  }, [map, geojson, boundary]);

  return null;
}

function zoneClassFromProps(properties: GeoJSON.GeoJsonProperties): string {
  if (!properties || typeof properties !== 'object') return '';
  const p = properties as Record<string, unknown>;
  return (
    (typeof p.class_name === 'string' && p.class_name) ||
    (typeof p.zone === 'string' && p.zone) ||
    (typeof p.class === 'string' && p.class) ||
    ''
  );
}

export function ZoneMap({ heatmap, spatialPatterns, heterogeneityFlag, boundary }: ZoneMapProps) {
  const { t } = useTranslation('ai');

  const sortedZones = useMemo(
    () =>
      [...heatmap.zone_summary].sort((a, b) => {
        const order = ['A', 'B', 'C', 'D', 'E'];
        return order.indexOf(a.class_name) - order.indexOf(b.class_name);
      }),
    [heatmap.zone_summary],
  );

  const totalPercent = sortedZones.reduce((sum, z) => sum + z.percent, 0);

  const zoneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of heatmap.zone_summary) {
      map.set(z.class_name, z.color);
    }
    return map;
  }, [heatmap.zone_summary]);

  const mapGeoJson = useMemo((): {
    zones: GeoJsonObject | null;
    boundaryFeature: GeoJsonObject | null;
    needsBoundaryForZoning: boolean;
  } => {
    const raw = heatmap.zones_geojson;
    if (!raw || typeof raw !== 'object') {
      return { zones: null, boundaryFeature: null, needsBoundaryForZoning: false };
    }

    const fc = raw as unknown as FeatureCollection;
    if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
      return { zones: raw as GeoJsonObject, boundaryFeature: null, needsBoundaryForZoning: false };
    }

    if (isPixelGridFeatureCollection(fc)) {
      if (!boundary?.length) {
        return { zones: null, boundaryFeature: null, needsBoundaryForZoning: true };
      }
      const ring = closedRingCoordinates(boundary);
      const transformed = transformPixelGridToWgs84(fc, ring);
      return {
        zones: transformed as GeoJsonObject,
        boundaryFeature: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        } as GeoJsonObject,
        needsBoundaryForZoning: false,
      };
    }

    return { zones: raw as GeoJsonObject, boundaryFeature: null, needsBoundaryForZoning: false };
  }, [heatmap.zones_geojson, boundary]);

  const geoJsonStyle = useMemo(() => {
    return (feature: GeoJSON.Feature | undefined) => {
      const className = zoneClassFromProps(feature?.properties);
      const color = zoneColorMap.get(className) ?? '#888888';
      return {
        fillColor: color,
        fillOpacity: 0.65,
        color,
        weight: 0.5,
        opacity: 0.8,
      };
    };
  }, [zoneColorMap]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (boundary && boundary.length > 0) {
      const avgLng = boundary.reduce((s, p) => s + p[0], 0) / boundary.length;
      const avgLat = boundary.reduce((s, p) => s + p[1], 0) / boundary.length;
      return [avgLat, avgLng];
    }
    return [33.9, -5.5];
  }, [boundary]);

  const pointToLayer = useMemo(
    () => (feature: GeoJSON.Feature, latlng: L.LatLng) => {
      const className = zoneClassFromProps(feature.properties);
      const color = zoneColorMap.get(className) ?? '#888888';
      return L.circleMarker(latlng, {
        radius: 5,
        fillColor: color,
        color: 'rgba(17,24,39,0.35)',
        weight: 0.5,
        opacity: 0.9,
        fillOpacity: 0.82,
      });
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

  const showMap = Boolean(mapGeoJson.zones) && !mapGeoJson.needsBoundaryForZoning;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        3. {t('calibrationReview.zones.title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Heatmap on Leaflet map */}
        <div className="relative rounded-lg overflow-hidden min-h-[280px]">
          {mapGeoJson.needsBoundaryForZoning && (
            <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[280px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 text-center">
              <Info className="h-6 w-6 text-amber-600" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {t('calibrationReview.zones.needsBoundary')}
              </p>
            </div>
          )}

          {showMap && mapGeoJson.zones && (
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
              {mapGeoJson.boundaryFeature && (
                <GeoJSON
                  data={mapGeoJson.boundaryFeature}
                  interactive={false}
                  style={{
                    fillOpacity: 0,
                    color: '#f8fafc',
                    weight: 2,
                    opacity: 0.95,
                  }}
                />
              )}
              <GeoJSON
                data={mapGeoJson.zones}
                style={(f) => {
                  if (f.geometry.type === 'Point') {
                    return {};
                  }
                  return geoJsonStyle(f);
                }}
                pointToLayer={pointToLayer}
              />
              <FitBounds geojson={mapGeoJson.zones} boundary={boundary} />
            </MapContainer>
          )}

          {!heatmap.zones_geojson && !mapGeoJson.needsBoundaryForZoning && (
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
          {t('calibrationReview.blockB.basedOnEVI', 'Basée sur EVI — image Sentinel-2 du')}{' '}
          {new Date(heatmap.date_image).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}
