import { resolveMapProvider, type MapTileProvider } from '../lib/map/tile-providers';
import { useAuth } from './useAuth';

export function useMapProvider(): MapTileProvider {
  const { currentOrganization } = useAuth();
  return resolveMapProvider(currentOrganization?.map_provider ?? null);
}
