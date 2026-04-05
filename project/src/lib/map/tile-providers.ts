import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

export type MapTileProvider = 'default' | 'mapbox';

/** Limits Mapbox Raster Tiles API usage; deep zoom multiplies requests quickly. */
export const MAPBOX_RASTER_MAX_ZOOM = 18;

export interface TileLayerSet {
  streets: TileLayer;
  satellite: TileLayer;
  labels: TileLayer;
}

interface TileLayerOptions {
  initialMapType: 'osm' | 'satellite';
  showPlaceNames: boolean;
}

const ESRI_REFERENCE_LABELS =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function createDefaultLayers(options: TileLayerOptions): TileLayerSet {
  const streets = new TileLayer({
    preload: 0,
    source: new OSM(),
    visible: options.initialMapType === 'osm',
    properties: { role: 'streets' },
  });

  const satellite = new TileLayer({
    preload: 0,
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attributions: 'Tiles \u00a9 Esri',
    }),
    visible: options.initialMapType === 'satellite',
    properties: { role: 'satellite' },
  });

  const labels = new TileLayer({
    preload: 0,
    source: new XYZ({
      url: ESRI_REFERENCE_LABELS,
      maxZoom: 19,
      attributions: 'Labels \u00a9 Esri',
    }),
    visible: options.showPlaceNames,
    properties: { role: 'labels' },
  });

  return { streets, satellite, labels };
}

export function getMapboxAccessToken(): string | undefined {
  const raw = import.meta.env.VITE_MAPBOX_TOKEN;
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim();
  return t.length > 0 ? t : undefined;
}

function createMapboxLayers(options: TileLayerOptions): TileLayerSet {
  const token = getMapboxAccessToken();

  if (!token) {
    console.warn('[tile-providers] VITE_MAPBOX_TOKEN is not set, falling back to default tiles');
    return createDefaultLayers(options);
  }

  const streets = new TileLayer({
    preload: 0,
    source: new XYZ({
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
      tileSize: 512,
      maxZoom: MAPBOX_RASTER_MAX_ZOOM,
      attributions: '\u00a9 Mapbox \u00a9 OpenStreetMap',
    }),
    visible: options.initialMapType === 'osm',
    properties: { role: 'streets' },
  });

  const satellite = new TileLayer({
    preload: 0,
    source: new XYZ({
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${token}`,
      tileSize: 512,
      maxZoom: MAPBOX_RASTER_MAX_ZOOM,
      attributions: '\u00a9 Mapbox',
    }),
    visible: options.initialMapType === 'satellite',
    properties: { role: 'satellite' },
  });

  // Use Esri reference for labels — avoids a full second Mapbox raster stack (satellite-streets).
  const labels = new TileLayer({
    preload: 0,
    source: new XYZ({
      url: ESRI_REFERENCE_LABELS,
      maxZoom: 19,
      attributions: 'Labels \u00a9 Esri',
    }),
    visible: options.showPlaceNames,
    properties: { role: 'labels' },
  });

  return { streets, satellite, labels };
}

export function createTileLayers(provider: MapTileProvider, options: TileLayerOptions): TileLayerSet {
  switch (provider) {
    case 'mapbox':
      return createMapboxLayers(options);
    case 'default':
    default:
      return createDefaultLayers(options);
  }
}

/**
 * Resolves which raster stack to use.
 * - VITE_MAP_PROVIDER=default → always free tiles (OSM/Esri), even if VITE_MAPBOX_TOKEN is set — saves Mapbox Raster/Static tile quota.
 * - VITE_MAP_PROVIDER=mapbox → Mapbox when token is set, else default.
 * - Unset VITE_MAP_PROVIDER → org preference if provided, else Mapbox when token is set (legacy).
 */
export function resolveMapProvider(orgMapProvider?: 'default' | 'mapbox' | null): MapTileProvider {
  const envRaw = import.meta.env.VITE_MAP_PROVIDER;
  const env = typeof envRaw === 'string' ? envRaw.trim().toLowerCase() : '';
  const token = getMapboxAccessToken();

  if (env === 'default') {
    return 'default';
  }

  if (env === 'mapbox') {
    if (!token) {
      console.warn('[tile-providers] VITE_MAP_PROVIDER=mapbox but VITE_MAPBOX_TOKEN is missing; using default tiles');
    }
    return token ? 'mapbox' : 'default';
  }

  if (orgMapProvider === 'default') {
    return 'default';
  }
  if (orgMapProvider === 'mapbox') {
    return token ? 'mapbox' : 'default';
  }

  return token ? 'mapbox' : 'default';
}
