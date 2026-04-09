import { getMapboxAccessToken, MAPBOX_RASTER_MAX_ZOOM, type MapTileProvider } from './tile-providers';

export type LeafletRasterVariant = 'streets' | 'satellite';

export interface LeafletRasterLayerSpec {
  url: string;
  attribution: string;
  /** Default 256 (OSM/Esri). Mapbox raster uses 512. */
  tileSize?: number;
  zoomOffset?: number;
  maxZoom?: number;
}

const ESRI_REFERENCE =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Google Satellite — no labels, most up-to-date imagery. */
const GOOGLE_SATELLITE = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

/**
 * Leaflet base stack aligned with OpenLayers tile-providers: Mapbox only when enabled,
 * otherwise OSM + Esri. Satellite "labels" use Esri reference — not Mapbox satellite-streets — to avoid doubling Mapbox raster traffic.
 */
export function getLeafletRasterLayerSpecs(
  provider: MapTileProvider,
  variant: LeafletRasterVariant,
  options?: { satelliteWithReferenceLabels?: boolean },
): LeafletRasterLayerSpec[] {
  const token = getMapboxAccessToken();
  const withLabels = options?.satelliteWithReferenceLabels ?? false;

  if (provider !== 'mapbox' || !token) {
    if (variant === 'streets') {
      return [{ url: OSM, attribution: '\u00a9 OpenStreetMap contributors', maxZoom: 19 }];
    }
    const layers: LeafletRasterLayerSpec[] = [
      {
        url: GOOGLE_SATELLITE,
        attribution: 'Imagery \u00a9 Google',
        maxZoom: 20,
      },
    ];
    // Google Hybrid already includes labels, skip Esri reference
    return layers;
  }

  const common = { tileSize: 512 as const, zoomOffset: -1 as const, maxZoom: MAPBOX_RASTER_MAX_ZOOM };

  if (variant === 'streets') {
    return [
      {
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
        attribution: '\u00a9 Mapbox \u00a9 OpenStreetMap',
        ...common,
      },
    ];
  }

  const layers: LeafletRasterLayerSpec[] = [
    {
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${token}`,
      attribution: '\u00a9 Mapbox',
      ...common,
    },
  ];
  if (withLabels) {
    layers.push({
      url: ESRI_REFERENCE,
      attribution: 'Labels \u00a9 Esri',
      maxZoom: 19,
    });
  }
  return layers;
}
