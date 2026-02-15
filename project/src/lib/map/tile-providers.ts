import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

export type MapTileProvider = 'default' | 'mapbox';

export interface TileLayerSet {
  streets: TileLayer;
  satellite: TileLayer;
  labels: TileLayer;
}

interface TileLayerOptions {
  initialMapType: 'osm' | 'satellite';
  showPlaceNames: boolean;
}

function createDefaultLayers(options: TileLayerOptions): TileLayerSet {
  const streets = new TileLayer({
    source: new OSM(),
    visible: options.initialMapType === 'osm',
    properties: { role: 'streets' },
  });

  const satellite = new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attributions: 'Tiles \u00a9 Esri',
    }),
    visible: options.initialMapType === 'satellite',
    properties: { role: 'satellite' },
  });

  const labels = new TileLayer({
    source: new XYZ({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attributions: 'Labels \u00a9 Esri',
    }),
    visible: options.showPlaceNames,
    properties: { role: 'labels' },
  });

  return { streets, satellite, labels };
}

function createMapboxLayers(options: TileLayerOptions): TileLayerSet {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!token) {
    console.warn('[tile-providers] VITE_MAPBOX_TOKEN is not set, falling back to default tiles');
    return createDefaultLayers(options);
  }

  const streets = new TileLayer({
    source: new XYZ({
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
      tileSize: 512,
      maxZoom: 22,
      attributions: '\u00a9 Mapbox \u00a9 OpenStreetMap',
    }),
    visible: options.initialMapType === 'osm',
    properties: { role: 'streets' },
  });

  const satellite = new TileLayer({
    source: new XYZ({
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${token}`,
      tileSize: 512,
      maxZoom: 22,
      attributions: '\u00a9 Mapbox',
    }),
    visible: options.initialMapType === 'satellite',
    properties: { role: 'satellite' },
  });

  const labels = new TileLayer({
    source: new XYZ({
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
      tileSize: 512,
      maxZoom: 22,
      attributions: '\u00a9 Mapbox \u00a9 OpenStreetMap',
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

export function resolveMapProvider(orgProvider?: string | null): MapTileProvider {
  if (orgProvider === 'mapbox' || orgProvider === 'default') {
    return orgProvider;
  }

  const envProvider = import.meta.env.VITE_MAP_PROVIDER;
  if (envProvider === 'mapbox' || envProvider === 'default') {
    return envProvider;
  }

  return 'default';
}
