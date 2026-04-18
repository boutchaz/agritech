import { useMemo } from 'react';
import { TileLayer } from 'react-leaflet';
import { useMapProvider } from '@/hooks/useMapProvider';
import {
  getLeafletRasterLayerSpecs,
  type LeafletRasterVariant,
} from '@/lib/map/leaflet-raster-specs';

export interface LeafletBaseTileLayersProps {
  variant: LeafletRasterVariant;
  /** When variant is satellite, overlay boundary/place names via Esri (no extra Mapbox stack). */
  withSatelliteReferenceLabels?: boolean;
}

/**
 * Shared Leaflet raster base maps: Mapbox only when {@link resolveMapProvider} returns mapbox;
 * otherwise OSM / Esri. Keeps live dashboard and satellite views aligned with the OpenLayers parcel map.
 */
export function LeafletBaseTileLayers({
  variant,
  withSatelliteReferenceLabels = true,
}: LeafletBaseTileLayersProps) {
  const provider = useMapProvider();
  const specs = useMemo(
    () =>
      getLeafletRasterLayerSpecs(provider, variant, {
        satelliteWithReferenceLabels:
          variant === 'satellite' ? withSatelliteReferenceLabels : false,
      }),
    [provider, variant, withSatelliteReferenceLabels],
  );

  return (
    <>
      {specs.map((s, tileIdx) => (
        <TileLayer
          key={`${s.url.slice(0, 80)}-${tileIdx}`}
          url={s.url}
          attribution={s.attribution}
          tileSize={s.tileSize ?? 256}
          zoomOffset={s.zoomOffset ?? 0}
          maxZoom={s.maxZoom ?? 19}
        />
      ))}
    </>
  );
}
