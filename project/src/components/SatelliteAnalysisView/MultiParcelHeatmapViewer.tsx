import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader, RefreshCw, ZoomIn, Layers, Maximize2, Minimize2 } from 'lucide-react';
import {
  satelliteApi,
  type VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  type HeatmapDataResponse,
  convertBoundariesToMultiPolygon,
  convertBoundaryToGeoJSON,
  DEFAULT_CLOUD_COVERAGE,
  formatDateForAPI,
} from '@/lib/satellite-api';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { LeafletBaseTileLayers } from '@/components/map/LeafletBaseTileLayers';
import { SmoothHeatmapLayer } from './LeafletHeatmapViewer';
import { type ColorPalette } from './InteractiveIndexViewer';

export interface MultiParcelHeatmapInput {
  id: string;
  name: string;
  boundary: number[][];
}

interface MultiParcelHeatmapViewerProps {
  parcels: MultiParcelHeatmapInput[];
  farmName?: string;
  initialIndex?: VegetationIndexType;
  initialDate?: string;
  colorPalette?: ColorPalette;
}

// Convert one parcel boundary to Leaflet [lat, lon] polygon positions.
// Detects Web Mercator vs WGS84 (same logic as LeafletHeatmapViewer.clipBoundary).
const toLeafletPositions = (boundary: number[][]): [number, number][] =>
  boundary.map((coord) => {
    const [x, y] = coord;
    if (Math.abs(x) > 180 || Math.abs(y) > 90) {
      const lon = (x / 20037508.34) * 180;
      const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
      return [lat, lon];
    }
    return [y, x];
  });

const MultiParcelHeatmapViewer = ({
  parcels,
  farmName,
  initialIndex = 'NIRv',
  initialDate,
  colorPalette = 'red-green',
}: MultiParcelHeatmapViewerProps) => {
  const { t } = useTranslation('satellite');
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>(initialIndex);
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [availableDates, setAvailableDates] = useState<
    Array<{ date: string; cloud_coverage: number }>
  >([]);
  const [isCheckingDates, setIsCheckingDates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HeatmapDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter to parcels that actually have a boundary
  const usableParcels = useMemo(
    () => parcels.filter((p) => p.boundary && p.boundary.length >= 3),
    [parcels],
  );

  // Build the union geometry once
  const multiGeometry = useMemo(() => {
    if (usableParcels.length === 0) return null;
    try {
      return convertBoundariesToMultiPolygon(usableParcels.map((p) => p.boundary));
    } catch {
      return null;
    }
  }, [usableParcels]);

  // Map center: average of all parcel centroids
  const mapCenter: [number, number] = useMemo(() => {
    if (usableParcels.length === 0) return [46.2276, 2.2137];
    let totalLat = 0;
    let totalLon = 0;
    let count = 0;
    usableParcels.forEach((p) => {
      const positions = toLeafletPositions(p.boundary);
      positions.forEach(([lat, lon]) => {
        totalLat += lat;
        totalLon += lon;
        count++;
      });
    });
    return count > 0 ? [totalLat / count, totalLon / count] : [46.2276, 2.2137];
  }, [usableParcels]);

  // Combined boundary for clipping the heatmap to the union of all parcels.
  // Format expected by SmoothHeatmapLayer is [lon, lat][] of an outer ring;
  // since clip is best-effort visual, we pass the bounding hull (concat of all rings).
  const clipBoundary: [number, number][] | undefined = useMemo(() => {
    if (usableParcels.length === 0) return undefined;
    const all: [number, number][] = [];
    usableParcels.forEach((p) => {
      const positions = toLeafletPositions(p.boundary);
      positions.forEach(([lat, lon]) => all.push([lon, lat]));
    });
    return all.length ? all : undefined;
  }, [usableParcels]);

  // Probe ONE parcel for available dates rather than the union of all parcels.
  // Union geometry can span UTM zones / cover too large an area, making the GEE
  // ImageCollection filter slow or empty. A single parcel's bbox is a tighter,
  // representative AOI — every Sentinel-2 acquisition that covers one parcel
  // also covers its neighbours within the same farm in practice.
  const probeParcel = usableParcels[0];

  const checkAvailableDates = useCallback(async () => {
    if (!probeParcel) return;
    setIsCheckingDates(true);
    setError(null);
    try {
      const endDate = formatDateForAPI(new Date());
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const startDateStr = formatDateForAPI(startDate);

      const probeGeometry = convertBoundaryToGeoJSON(probeParcel.boundary);

      // Use /indices/available-dates: returns the actual list of dates that
      // have Sentinel-2 imagery (under the cloud-coverage threshold) for the
      // probe parcel. Avoids picking a date that has no acquisition.
      const result = await satelliteApi.getAvailableDates(
        { geometry: probeGeometry, name: probeParcel.name },
        startDateStr,
        endDate,
        DEFAULT_CLOUD_COVERAGE,
        probeParcel.id,
      );

      const dates = (result.available_dates || [])
        .filter((d) => d.available !== false)
        .map((d) => ({ date: d.date, cloud_coverage: d.cloud_coverage }))
        // newest → oldest so the picker shows recent dates first
        .sort((a, b) => b.date.localeCompare(a.date));

      setAvailableDates(dates);
      if (dates.length > 0) {
        setSelectedDate((prev) => prev || dates[0].date);
      }
    } catch (err) {
      console.error('checkAvailableDates failed:', err);
      setError(t('satellite:heatmap.warnings.failedToCheckDates', 'Failed to check available dates'));
    } finally {
      setIsCheckingDates(false);
    }
  }, [probeParcel, t]);

  useEffect(() => {
    if (probeParcel && !selectedDate) {
      void checkAvailableDates();
    }
  }, [probeParcel, selectedDate, checkAvailableDates]);

  const generate = useCallback(async () => {
    if (!multiGeometry || !selectedDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await satelliteApi.getHeatmapData({
        aoi: { geometry: multiGeometry, name: farmName || 'Farm parcels' },
        date: selectedDate,
        index: selectedIndex,
        grid_size: 10000,
      });
      setData(result);
    } catch (err) {
      const detail = (err as Error & { detail?: { code?: string } })?.detail;
      if (detail?.code === 'no_satellite_imagery') {
        setError(
          t(
            'satellite:heatmap.warnings.noImageryForDate',
            'Aucune image Sentinel-2 disponible pour cette date. Le satellite repasse environ tous les 5 jours et les jours nuageux sont filtrés.',
          ),
        );
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate heatmap');
      }
    } finally {
      setIsLoading(false);
    }
  }, [multiGeometry, selectedDate, selectedIndex, farmName, t]);

  if (usableParcels.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        {t(
          'satellite:heatmap.noParcelsWithBoundary',
          'No parcels with boundaries available for this farm.',
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">
            Date
            {isCheckingDates && (
              <span className="ml-2 text-xs text-gray-500">
                <RefreshCw className="mr-1 inline h-3 w-3 animate-spin" />
                {t('satellite:heatmap.leafletViewer.checkingAvailability', 'Checking availability…')}
              </span>
            )}
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={availableDates.length === 0}
            className="w-full rounded-md border border-gray-300 p-2 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {availableDates.length === 0 ? (
              <option value="">
                {isCheckingDates
                  ? t('satellite:heatmap.leafletViewer.checkingAvailability', 'Checking availability…')
                  : t('satellite:heatmap.warnings.noAvailableDates', 'No imagery in last 6 months')}
              </option>
            ) : (
              availableDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} — {Math.round(d.cloud_coverage)}% cloud
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">
            {t('satellite:heatmap.labels.vegetationIndex', 'Vegetation index')}
          </label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
            className="w-full rounded-md border border-gray-300 p-2"
          >
            {VEGETATION_INDICES.map((vi) => (
              <option key={vi} value={vi}>
                {vi}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Button
            variant="green"
            onClick={generate}
            disabled={isLoading || !multiGeometry || !selectedDate}
            className="flex items-center gap-2 rounded-md px-6 py-3 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <ZoomIn className="h-4 w-4" />}
            {isLoading
              ? t('satellite:heatmap.actions.loading', 'Loading…')
              : data
                ? t('satellite:heatmap.actions.regenerate', 'Regenerate')
                : t('satellite:heatmap.actions.generate', 'Generate')}
          </Button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <strong>
          {t('satellite:heatmap.labels.indexDescription', 'Index')}:
        </strong>{' '}
        {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex as keyof typeof VEGETATION_INDEX_DESCRIPTIONS] || selectedIndex}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <Layers className="h-4 w-4" />
        {t('satellite:heatmap.parcelCount', '{{count}} parcels', { count: usableParcels.length })}
        {farmName && <span className="text-gray-500">— {farmName}</span>}
      </div>

      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-50 overflow-hidden rounded-none border bg-white dark:bg-slate-900'
            : 'relative h-[600px] overflow-hidden rounded-lg border'
        }
      >
        <Button
          onClick={() => setIsFullscreen((v) => !v)}
          className="absolute right-4 top-4 z-[1000] rounded-lg border-2 border-gray-300 bg-white p-2 shadow-lg transition-colors hover:bg-gray-100"
          title={isFullscreen ? t('satellite:heatmap.fullscreen.exit', 'Exit fullscreen') : t('satellite:heatmap.fullscreen.enter', 'Fullscreen')}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container"
        >
          <LeafletBaseTileLayers variant="satellite" withSatelliteReferenceLabels />

          <SmoothHeatmapLayer
            data={data}
            colorPalette={colorPalette}
            valueDisplay="interactive"
            boundary={clipBoundary}
          />

          {usableParcels.map((p) => (
            <Polygon
              key={p.id}
              positions={toLeafletPositions(p.boundary)}
              pathOptions={{
                color: '#00FF00',
                weight: 2,
                fillOpacity: 0,
                opacity: 0.9,
              }}
            >
              <Tooltip sticky>{p.name}</Tooltip>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MultiParcelHeatmapViewer;
