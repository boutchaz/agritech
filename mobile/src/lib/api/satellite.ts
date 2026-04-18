// Satellite API Client for Mobile App
import { api } from '../api';

// Direct database endpoint (no proxy needed)
const BASE = '/satellite-indices';

export type VegetationIndex = 'NIRv' | 'EVI' | 'NDRE' | 'NDMI' | 'NDVI' | 'GCI' | 'SAVI' | 'MSAVI2' | 'OSAVI' | 'MSI' | 'MNDWI' | 'MCARI' | 'TCARI';

export interface SatelliteDataPoint {
  id: string;
  parcel_id: string;
  date: string;
  index_name: VegetationIndex;
  mean_value: number;
  min_value: number | null;
  max_value: number | null;
  std_value: number | null;
  median_value: number | null;
  cloud_coverage_percentage: number | null;
  trend_direction: 'up' | 'down' | 'stable' | null;
}

export interface SyncStatus {
  status: 'no_data' | 'partial' | 'synced';
  total_records: number;
  indices: string[];
  date_range: { start: string | null; end: string | null } | null;
}

export interface TimeSeriesResponse {
  index: string;
  start_date: string;
  end_date: string;
  data: Array<{ date: string; value: number }>;
  statistics?: Record<string, number>;
}

export interface PixelData {
  lon: number;
  lat: number;
  value: number;
}

export interface HeatmapResponse {
  date: string;
  index: string;
  pixel_data: PixelData[];
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p10: number;
    p90: number;
    std: number;
    count: number;
  };
  metadata: {
    sample_scale: number;
    total_pixels: number;
    data_source: string;
  };
}

export const INDEX_COLORS: Record<string, string> = {
  NIRv: '#2196F3',
  EVI: '#4CAF50',
  NDRE: '#FF9800',
  NDMI: '#00BCD4',
  NDVI: '#8BC34A',
  GCI: '#CDDC39',
  SAVI: '#795548',
  MSAVI2: '#9E9E9E',
  OSAVI: '#607D8B',
  MSI: '#E91E63',
  MNDWI: '#03A9F4',
  MCARI: '#FF5722',
  TCARI: '#9C27B0',
};

export const INDEX_LABELS: Record<string, string> = {
  NIRv: 'NIRv — Functional greenness',
  EVI: 'EVI — Enhanced vegetation',
  NDRE: 'NDRE — Chlorophyll/nitrogen',
  NDMI: 'NDMI — Water content',
  NDVI: 'NDVI — Global greenness',
  GCI: 'GCI — Chlorophyll (green)',
  SAVI: 'SAVI — Soil-adjusted',
};

// Core reliable indices to show by default on mobile
export const DEFAULT_INDICES: VegetationIndex[] = ['NIRv', 'EVI', 'NDRE', 'NDMI'];

export const satelliteApi = {
  /**
   * Get satellite data for a parcel directly from database.
   * Uses GET /satellite-indices?parcel_id=xxx&date_from=xxx
   * This queries the satellite_indices_data table via the API — no proxy needed.
   */
  async getParcelData(
    parcelId: string,
    params?: { start_date?: string; end_date?: string; indices?: string[] },
  ): Promise<SatelliteDataPoint[]> {
    const query = new URLSearchParams();
    query.append('parcel_id', parcelId);
    if (params?.start_date) query.append('date_from', params.start_date);
    if (params?.end_date) query.append('date_to', params.end_date);
    if (params?.indices?.length === 1) {
      query.append('index_name', params.indices[0]);
    }
    const qs = query.toString();
    const res = await api.get<SatelliteDataPoint[]>(`${BASE}?${qs}`);
    return Array.isArray(res) ? res : [];
  },

  /**
   * Get latest satellite data for a parcel (most recent entries).
   * Uses the same endpoint with limit=1 per concept, but we just fetch
   * recent data and let the caller pick the latest per index.
   */
  async getLatestData(
    parcelId: string,
    indexName?: string,
  ): Promise<SatelliteDataPoint[]> {
    const query = new URLSearchParams();
    query.append('parcel_id', parcelId);
    query.append('limit', '50');
    if (indexName) query.append('index_name', indexName);
    const res = await api.get<SatelliteDataPoint[]>(`${BASE}?${query.toString()}`);
    return Array.isArray(res) ? res : [];
  },

  /**
   * Get heatmap pixel data for a parcel.
   * Calls POST /satellite-proxy/indices/heatmap (cache-first via proxy).
   * Requires boundary coordinates to define the AOI.
   */
  async getHeatmap(
    parcelId: string,
    boundary: number[][],
    indexName: VegetationIndex,
    date: string,
  ): Promise<HeatmapResponse | null> {
    try {
      // Convert boundary to GeoJSON, handling Web Mercator if needed
      const coords = boundary.map((c) => {
        const [x, y] = c;
        if (Math.abs(x) > 180 || Math.abs(y) > 90) {
          const lon = (x / 20037508.34) * 180;
          const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
          return [lon, lat];
        }
        return [x, y];
      });
      // Close polygon
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([first[0], first[1]]);
      }

      const res = await api.post<HeatmapResponse>('/satellite-proxy/indices/heatmap', {
        aoi: {
          geometry: { type: 'Polygon', coordinates: [coords] },
          name: 'parcel',
        },
        date,
        index: indexName,
        grid_size: 1000,
        parcel_id: parcelId,
        cloud_coverage: 10,
      });
      return res;
    } catch {
      return null;
    }
  },

  /**
   * Derive sync status from actual data count.
   * No proxy needed — just count what's in the database.
   */
  async getSyncStatus(parcelId: string): Promise<SyncStatus> {
    try {
      const data = await satelliteApi.getParcelData(parcelId, { start_date: '2020-01-01' });
      if (!data || data.length === 0) {
        return { status: 'no_data', total_records: 0, indices: [], date_range: null };
      }
      const indices = [...new Set(data.map((d) => d.index_name))];
      const dates = data.map((d) => d.date).sort();
      return {
        status: indices.length >= 3 ? 'synced' : 'partial',
        total_records: data.length,
        indices,
        date_range: { start: dates[0], end: dates[dates.length - 1] },
      };
    } catch {
      return { status: 'no_data', total_records: 0, indices: [], date_range: null };
    }
  },
};
