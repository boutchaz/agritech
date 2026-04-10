import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

/** Fits the map to the GeoJSON or parcel boundary bounds. */
function FitBounds({ geojson, boundary }: { geojson: Record<string, unknown> | null; boundary?: number[][] }) {
  const map = useMap();

  useEffect(() => {
    try {
      if (geojson) {
        const layer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
          return;
        }
      }
      if (boundary && boundary.length > 2) {
        const latLngs = boundary.map(([lng, lat]) => [lat, lng] as [number, number]);
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    } catch {
      // Silently ignore malformed data
    }
  }, [map, geojson, boundary]);

  return null;
}

export function ZoneMap({ heatmap, spatialPatterns, heterogeneityFlag, boundary }: ZoneMapProps) {
  const { t } = useTranslation('ai');

  const sortedZones = useMemo(
    () => [...heatmap.zone_summary].sort((a, b) => {
      const order = ['A', 'B', 'C', 'D', 'E'];
      return order.indexOf(a.class_name) - order.indexOf(b.class_name);
    }),
    [heatmap.zone_summary],
  );

  const totalPercent = sortedZones.reduce((sum, z) => sum + z.percent, 0);

  /** Build a color lookup from zone_summary for styling GeoJSON features. */
  const zoneColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of heatmap.zone_summary) {
      map.set(z.class_name, z.color);
    }
    return map;
  }, [heatmap.zone_summary]);

  /** Style each GeoJSON feature by its zone class color. */
  const geoJsonStyle = useMemo(() => {
    return (feature: GeoJSON.Feature | undefined) => {
      const className = feature?.properties?.class_name ?? feature?.properties?.class ?? '';
      const color = zoneColorMap.get(className) ?? '#888888';
      return {
        fillColor: color,
        fillOpacity: 0.65,
        color: color,
        weight: 0.5,
        opacity: 0.8,
      };
    };
  }, [zoneColorMap]);

  /** Default map center (Morocco) — overridden by FitBounds. */
  const defaultCenter: [number, number] = useMemo(() => {
    if (boundary && boundary.length > 0) {
      const avgLng = boundary.reduce((s, p) => s + p[0], 0) / boundary.length;
      const avgLat = boundary.reduce((s, p) => s + p[1], 0) / boundary.length;
      return [avgLat, avgLng];
    }
    return [33.9, -5.5];
  }, [boundary]);

  if (!heatmap.available) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          3. {t('calibrationReview.zones.title', 'ZONAGE INTRA-PARCELLAIRE')}
        </h2>
        <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-gray-400">
          <Info className="h-5 w-5 mr-2" />
          <span className="text-sm">{heatmap.blocked_message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" data-block="zones">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        3. {t('calibrationReview.zones.title', 'ZONAGE INTRA-PARCELLAIRE')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Heatmap on Leaflet map */}
        <div className="relative rounded-lg overflow-hidden min-h-[280px]">
          {heatmap.zones_geojson ? (
            <MapContainer
              center={defaultCenter}
              zoom={15}
              className="h-full w-full min-h-[280px]"
              zoomControl={false}
              attributionControl={false}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              touchZoom={false}
            >
              <LeafletBaseTileLayers variant="satellite" />
              <GeoJSON
                data={heatmap.zones_geojson as unknown as GeoJSON.GeoJsonObject}
                style={geoJsonStyle}
              />
              <FitBounds geojson={heatmap.zones_geojson} boundary={boundary} />
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800/50 text-center text-gray-400 dark:text-gray-500">
              <div>
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm">{t('calibrationReview.zones.mapPlaceholder', 'Carte de zonage')}</p>
              </div>
            </div>
          )}

          {/* Pattern detected overlay */}
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
              {t('calibrationReview.zones.rasterPixels', 'Raster pixels :')}
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

          {/* Heterogeneity flag */}
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

      {/* Zone distribution bar */}
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

      {/* Date image info */}
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
