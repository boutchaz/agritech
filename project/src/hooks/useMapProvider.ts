import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { resolveMapProvider, type MapTileProvider } from '../lib/map/tile-providers';

export function useMapProvider(): MapTileProvider {
  const { currentOrganization } = useAuth();
  return useMemo(
    () => resolveMapProvider(currentOrganization?.map_provider),
    [currentOrganization?.map_provider]
  );
}
