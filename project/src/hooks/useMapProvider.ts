import { resolveMapProvider, type MapTileProvider } from '../lib/map/tile-providers';

export function useMapProvider(): MapTileProvider {
  return resolveMapProvider();
}
