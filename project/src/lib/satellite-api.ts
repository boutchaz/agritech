// Satellite Indices Service API Client
// This client interfaces with the satellite-indices-service for vegetation analysis

const SATELLITE_SERVICE_URL = (import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');

export interface VegetationIndex {
  NIRv: "NIRv";
  EVI: "EVI";
  NDRE: "NDRE";
  NDMI: "NDMI";
  NDVI: "NDVI";
  GCI: "GCI";
  SAVI: "SAVI";
  MSAVI2: "MSAVI2";
  OSAVI: "OSAVI";
  MSI: "MSI";
  MNDWI: "MNDWI";
  MCARI: "MCARI";
  TCARI: "TCARI";
}

export type VegetationIndexType = keyof VegetationIndex;
export type TimeSeriesIndexType = VegetationIndexType | 'NIRvP' | 'TCARI_OSAVI';

export type IndexReliability = 'fiable' | 'utile' | 'prudence' | 'inutile';

export interface IndexMetadata {
  reliability: IndexReliability;
  priority: number;
  description: string;
  shortWarning?: string;
}

export const INDEX_METADATA: Record<TimeSeriesIndexType, IndexMetadata> = {
  NIRv: {
    reliability: 'fiable',
    priority: 1,
    description: 'Verdure fonctionnelle — isole le signal végétation du sol, corrélé au GPP',
  },
  EVI: {
    reliability: 'fiable',
    priority: 2,
    description: 'Végétation améliorée — réduit l\'effet sol/atmosphère, moins de saturation que NDVI',
  },
  NDRE: {
    reliability: 'fiable',
    priority: 3,
    description: 'Chlorophylle/azote (red edge) — détecte le stress azoté avant les symptômes visibles',
  },
  NDMI: {
    reliability: 'utile',
    priority: 4,
    description: 'Contenu en eau foliaire — alerte sécheresse, piloter l\'irrigation',
  },
  NDVI: {
    reliability: 'utile',
    priority: 5,
    description: 'Verdure globale — référence historique, mélange arbres + herbe + sol',
    shortWarning: 'Mélange signal arbres/herbe/sol sur canopée clairsemée',
  },
  NIRvP: {
    reliability: 'utile',
    priority: 6,
    description: 'Productivité photosynthétique (NIRv × PAR) — proxy GPP, limité en semi-aride',
    shortWarning: 'Relation GPP se dégrade sous stress hydrique/thermique',
  },
  GCI: {
    reliability: 'utile',
    priority: 7,
    description: 'Chlorophylle (bande verte) — complément du NDRE',
  },
  SAVI: {
    reliability: 'utile',
    priority: 8,
    description: 'Végétation ajustée au sol (L=0.5) — utile en saison sèche',
    shortWarning: 'Redondant quand couvert herbacé est dense',
  },
  MSAVI2: {
    reliability: 'utile',
    priority: 9,
    description: 'SAVI modifié (L auto) — meilleur quand sol très visible',
    shortWarning: 'Avantage marginal sur SAVI avec herbe entre les rangs',
  },
  OSAVI: {
    reliability: 'utile',
    priority: 10,
    description: 'SAVI optimisé (L=0.16) — surtout utile comme composante du ratio TCARI/OSAVI',
    shortWarning: 'Redondant avec SAVI — préférer TCARI/OSAVI ratio',
  },
  TCARI_OSAVI: {
    reliability: 'fiable',
    priority: 3.5,
    description: 'Ratio TCARI/OSAVI — indicateur de chlorophylle résistant au LAI',
  },
  MSI: {
    reliability: 'prudence',
    priority: 11,
    description: 'Stress hydrique — redondant avec NDMI, variations subtiles sur irrigué',
    shortWarning: 'Redondant avec NDMI, préférer NDMI',
  },
  MNDWI: {
    reliability: 'inutile',
    priority: 12,
    description: 'Détection de surfaces d\'eau — conçu pour plans d\'eau, PAS pour le contenu en eau des plantes',
    shortWarning: 'Hors contexte pour un verger — détecte les plans d\'eau, pas le stress hydrique',
  },
  MCARI: {
    reliability: 'prudence',
    priority: 13,
    description: 'Absorption chlorophylle — courbe non monotone, perturbé par le sol',
    shortWarning: 'DANGEREUX SEUL — même piège que le PRI. Utiliser avec OSAVI ou MTVI2',
  },
  TCARI: {
    reliability: 'prudence',
    priority: 14,
    description: 'Absorption chlorophylle (red edge) — très sensible au sol',
    shortWarning: 'DANGEREUX SEUL — doit être utilisé en ratio TCARI/OSAVI',
  },
};

export const RELIABILITY_CONFIG: Record<IndexReliability, { label: string; color: string; bgColor: string; borderColor: string }> = {
  fiable: { label: 'Fiable', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  utile: { label: 'Utile', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  prudence: { label: 'Prudence', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  inutile: { label: 'Inutile', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

export interface GeoJSONGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  coordinates: number[][] | number[][][];
}

export interface AOIRequest {
  geometry: GeoJSONGeometry;
  name?: string;
}

export interface DateRangeRequest {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
}

export interface IndexCalculationRequest {
  aoi: AOIRequest;
  date_range: DateRangeRequest;
  indices: VegetationIndexType[];
  cloud_coverage?: number; // 0-100, default 10
  scale?: number;          // 10-1000, default 10
  use_aoi_cloud_filter?: boolean; // Calculate cloud coverage within AOI only (default true)
  cloud_buffer_meters?: number;   // Buffer around AOI for cloud calculation (default 300m)
}

export interface TimeSeriesRequest {
  aoi: AOIRequest;
  date_range: DateRangeRequest;
  index: TimeSeriesIndexType;
  interval?: 'day' | 'week' | 'month' | 'year';
  cloud_coverage?: number;
}

export interface IndexValue {
  index: string;
  value: number;
  unit?: string;
  timestamp?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeriesResponse {
  index: string;
  aoi_name?: string;
  start_date: string;
  end_date: string;
  data: TimeSeriesPoint[];
  statistics?: Record<string, number>;
}

export interface IndexCalculationResponse {
  request_id: string;
  timestamp: string;
  aoi_name?: string;
  indices: IndexValue[];
  metadata: Record<string, unknown>;
}

export interface ProcessingJob {
  job_id: string;
  total_tasks: number;
  created_at: string;
  estimated_completion?: string;
}

export interface BatchProcessingRequest {
  organization_id: string;
  farm_id?: string;
  parcel_id?: string;
  indices: VegetationIndexType[];
  date_range: DateRangeRequest;
  cloud_coverage?: number;
  scale?: number;
  check_cloud_coverage?: boolean;
  priority?: number; // 1-10
}

export interface SatelliteData {
  id: string;
  parcel_id: string;
  date: string;
  index_name: string;
  mean_value?: number;
  min_value?: number;
  max_value?: number;
  std_value?: number;
  median_value?: number;
  percentile_25?: number;
  percentile_75?: number;
  percentile_90?: number;
  pixel_count?: number;
  cloud_coverage_percentage?: number;
  geotiff_url?: string;
  geotiff_expires_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ParcelStatisticsRequest {
  parcel_id: string;
  aoi: AOIRequest;
  date_range: DateRangeRequest;
  indices: VegetationIndexType[];
  cloud_coverage?: number;
  save_tiff?: boolean;
  scale?: number;
  use_aoi_cloud_filter?: boolean; // Calculate cloud coverage within AOI only
  cloud_buffer_meters?: number;   // Buffer around AOI for cloud calculation
}

export interface ParcelStatisticsResponse {
  parcel_id: string;
  statistics: Record<VegetationIndexType, {
    mean: number;
    min: number;
    max: number;
    std: number;
    median: number;
    percentile_25: number;
    percentile_75: number;
    percentile_90: number;
    pixel_count: number;
  }>;
  tiff_files?: Record<VegetationIndexType, {
    url: string;
    file_size_mb: number;
    expires_at: string;
  }>;
  cloud_coverage_info: {
    threshold_used: number;
    images_found: number;
    avg_cloud_coverage: number;
    best_date: string;
  };
  metadata: {
    date_range: DateRangeRequest;
    processing_date: string;
    scale: number;
  };
}

export interface TiffExportResponse {
  download_url: string;
  file_size_mb?: number;
  expires_at: string;
  metadata: {
    index: VegetationIndexType;
    date: string;
    scale: number;
    cloud_coverage: number;
  };
}

export interface IndexImageRequest {
  aoi: AOIRequest;
  date_range: DateRangeRequest;
  index: VegetationIndexType;
  cloud_coverage?: number;
}

export interface IndexImageResponse {
  image_url: string;
  index: VegetationIndexType;
  date: string;
  cloud_coverage: number;
  metadata: {
    available_images: number;
    suitable_images: number;
  };
}

// Interactive Visualization Types
export interface VisualizationBounds {
  min_lon: number;
  max_lon: number;
  min_lat: number;
  max_lat: number;
}

export interface PixelData {
  lon: number;
  lat: number;
  value: number;
}

export interface CoordinateSystem {
  lon_step: number;
  lat_step: number;
  x_axis: number[];
  y_axis: number[];
}

export interface VisualizationParams {
  min: number;
  max: number;
  palette: string[];
}

export interface InteractiveDataResponse {
  date: string;
  index: string;
  bounds: VisualizationBounds;
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
  visualization: VisualizationParams;
  metadata: Record<string, unknown>;
}

export interface HeatmapDataResponse {
  date: string;
  index: string;
  bounds: VisualizationBounds;
  pixel_data: PixelData[]; // Real satellite pixel data with lat/lon
  aoi_boundary: [number, number][]; // AOI polygon coordinates
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
  visualization: VisualizationParams;
  metadata: {
    sample_scale: number;
    total_pixels: number;
    data_source: string;
  };
}

export interface InteractiveRequest {
  aoi: AOIRequest;
  date: string;
  index: VegetationIndexType;
  scale?: number;
  max_pixels?: number;
  visualization_type?: 'scatter' | 'heatmap';
}

export interface HeatmapRequest {
  aoi: AOIRequest;
  date: string;
  index: VegetationIndexType;
  grid_size?: number;
}

export interface CloudCoverageCheckRequest {
  geometry: GeoJSONGeometry;
  date_range: DateRangeRequest;
  max_cloud_coverage?: number;
}

export interface CloudCoverageCheckResponse {
  has_suitable_images: boolean;
  available_images_count: number;
  suitable_images_count: number;
  min_cloud_coverage?: number;
  max_cloud_coverage?: number;
  avg_cloud_coverage?: number;
  recommended_date?: string;
  metadata?: {
    max_cloud_threshold: number;
    date_range: DateRangeRequest;
    all_cloud_percentages: number[];
  };
}

class SatelliteAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = SATELLITE_SERVICE_URL) {
    // Remove trailing slash to avoid double slashes in URLs
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SatelliteAPI] Error response:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });

        // Provide more helpful error messages
        if (response.status === 404) {
          throw new Error(`No satellite imagery available: ${errorText || 'No images found for the selected date range.'}`);
        } else if (response.status >= 500) {
          throw new Error('Satellite data service is experiencing issues. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Invalid request: ${errorText}`);
        } else {
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      // Defensive: handle double-encoded JSON (e.g. gateway returns string body)
      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[SatelliteAPI] Request timeout: ${url}`);
        throw new Error('Request timed out. The satellite imagery calculation is taking too long. Try a smaller area or shorter date range.');
      }

      console.error(`[SatelliteAPI] Request failed:`, error);
      throw error;
    }
  }

  // Health check
  async getHealth() {
    return this.request('/health');
  }

  // Calculate vegetation indices for a specific area
  async calculateIndices(request: IndexCalculationRequest): Promise<IndexCalculationResponse> {
    // Set default values for AOI-based cloud filtering
    const requestWithDefaults = {
      use_aoi_cloud_filter: true,  // Default to AOI-based filtering
      cloud_buffer_meters: 300,    // Default 300m buffer
      ...request
    };

    return this.request('/indices/calculate', {
      method: 'POST',
      body: JSON.stringify(requestWithDefaults),
    });
  }

  // Get time series data for vegetation indices
  async getTimeSeries(request: TimeSeriesRequest): Promise<TimeSeriesResponse> {
    return this.request('/indices/timeseries', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Check cloud coverage for date range
  async checkCloudCoverage(request: CloudCoverageCheckRequest): Promise<CloudCoverageCheckResponse> {
    return this.request('/analysis/cloud-coverage', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Start batch processing job
  async startBatchProcessing(request: BatchProcessingRequest): Promise<ProcessingJob> {
    return this.request('/analysis/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Supabase integration endpoints
  async getOrganizationFarms(organizationId: string) {
    return this.request(`/supabase/organizations/${organizationId}/farms`);
  }

  async getFarmParcels(farmId: string) {
    return this.request(`/supabase/farms/${farmId}/parcels`);
  }

  async getParcelSatelliteData(parcelId: string, dateRange?: DateRangeRequest, indices?: VegetationIndexType[]) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('start_date', dateRange.start_date);
      params.append('end_date', dateRange.end_date);
    }
    if (indices) {
      indices.forEach(index => params.append('indices', index));
    }

    const query = params.toString() ? `?${params}` : '';
    return this.request<SatelliteData[]>(`/supabase/parcels/${parcelId}/satellite-data${query}`);
  }

  // Get latest satellite data for a parcel
  async getLatestSatelliteData(parcelId: string, indexName?: string) {
    const params = indexName ? `?index_name=${indexName}` : '';
    return this.request<SatelliteData[]>(`/supabase/parcels/${parcelId}/latest-data${params}`);
  }

  // Get satellite data statistics
  async getSatelliteDataStatistics(
    parcelId: string,
    indexName: string,
    startDate: string,
    endDate: string
  ) {
    return this.request(`/supabase/parcels/${parcelId}/statistics`, {
      method: 'POST',
      body: JSON.stringify({
        index_name: indexName,
        start_date: startDate,
        end_date: endDate
      }),
    });
  }

  // Export data as GeoTIFF or Interactive Data
  async exportGeoTIFF(request: {
    aoi: AOIRequest;
    date: string;
    index: VegetationIndexType;
    scale?: number;
    format?: string;
    interactive?: boolean;
  }): Promise<TiffExportResponse | HeatmapDataResponse> {
    return this.request('/indices/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Calculate comprehensive statistics for a parcel with optional TIFF export
  async calculateParcelStatistics(request: ParcelStatisticsRequest): Promise<ParcelStatisticsResponse> {
    // Set default values for AOI-based cloud filtering
    const requestWithDefaults = {
      use_aoi_cloud_filter: true,  // Default to AOI-based filtering
      cloud_buffer_meters: 300,    // Default 300m buffer
      ...request
    };

    return this.request('/analysis/parcel-statistics', {
      method: 'POST',
      body: JSON.stringify(requestWithDefaults),
    });
  }

  // Enhanced cloud coverage check with detailed recommendations
  async checkCloudCoverageDetailed(request: CloudCoverageCheckRequest): Promise<CloudCoverageCheckResponse> {
    return this.request('/analysis/cloud-coverage', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Bulk export TIFF files for multiple indices
  async bulkExportTiffs(request: {
    aoi: AOIRequest;
    date: string;
    indices: VegetationIndexType[];
    scale?: number;
    cloud_coverage?: number;
  }) {
    return this.request('/indices/bulk-export', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get processing status for batch operations
  async getBatchProcessingStatus(jobId: string) {
    return this.request(`/analysis/batch/${jobId}/status`);
  }

  // Check if cloud-free images are available (quick check)
  async hasCloudFreeImages(
    aoi: AOIRequest,
    dateRange: DateRangeRequest,
    maxCloudCoverage: number = 10
  ): Promise<boolean> {
    try {
      const result = await this.checkCloudCoverage({
        geometry: aoi.geometry,
        date_range: dateRange,
        max_cloud_coverage: maxCloudCoverage,
      });
      return result.has_suitable_images;
    } catch (error) {
      console.warn('Cloud coverage check failed:', error);
      return false;
    }
  }

  async generateIndexImage(request: IndexImageRequest): Promise<IndexImageResponse> {
    return this.request('/analysis/generate-index-image', {
      method: 'POST',
      body: JSON.stringify({
        aoi: request.aoi,
        date_range: request.date_range,
        index: request.index,
        cloud_coverage: request.cloud_coverage || 10
      }),
    });
  }

  // Generate multiple index images for comparison
  async generateMultipleIndexImages(
    aoi: AOIRequest,
    dateRange: DateRangeRequest,
    indices: VegetationIndexType[],
    cloudCoverage: number = 10
  ): Promise<IndexImageResponse[]> {
    const promises = indices.map(index =>
      this.generateIndexImage({
        aoi,
        date_range: dateRange,
        index,
        cloud_coverage: cloudCoverage
      })
    );

    return Promise.all(promises);
  }

  // Get interactive scatter plot data
  async getInteractiveData(request: InteractiveRequest): Promise<InteractiveDataResponse> {
    return this.request('/indices/interactive', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get heatmap data for ECharts
  async getHeatmapData(request: HeatmapRequest): Promise<HeatmapDataResponse> {
    return this.request('/indices/heatmap', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Generate interactive visualization (chooses best method based on data size)
  async generateInteractiveVisualization(
    aoi: AOIRequest,
    date: string,
    index: VegetationIndexType,
    visualizationType: 'scatter' | 'heatmap' = 'heatmap'
  ): Promise<InteractiveDataResponse | HeatmapDataResponse> {
    if (visualizationType === 'heatmap') {
      return this.getHeatmapData({
        aoi,
        date,
        index,
        grid_size: 1000 // Updated default for better visualization
      });
    } else {
      return this.getInteractiveData({
        aoi,
        date,
        index,
        max_pixels: 10000
      });
    }
  }

  // Get available dates with satellite imagery for an AOI
  async getAvailableDates(
    aoi: AOIRequest,
    startDate: string,
    endDate: string,
    cloudCoverage: number = 30
  ): Promise<{
    available_dates: Array<{
      date: string;
      cloud_coverage: number;
      timestamp: number;
      available: boolean;
    }>;
    total_images: number;
    date_range: { start: string; end: string };
    filters: { max_cloud_coverage: number };
  }> {
    return this.request('/indices/available-dates', {
      method: 'POST',
      body: JSON.stringify({
        aoi,
        start_date: startDate,
        end_date: endDate,
        cloud_coverage: cloudCoverage
      }),
    });
  }
}

// Export singleton instance
export const satelliteApi = new SatelliteAPIClient();

// Utility functions
export const convertBoundaryToGeoJSON = (boundary: number[][]): GeoJSONGeometry => {
  if (!boundary || boundary.length < 3) {
    throw new Error('Invalid boundary: must have at least 3 coordinates');
  }

  // Convert boundary coordinates to WGS84 if needed
  const convertedBoundary = boundary.map(coord => {
    const [x, y] = coord;

    // Check if coordinates are in Web Mercator (EPSG:3857) or geographic (WGS84)
    if (Math.abs(x) > 180 || Math.abs(y) > 90) {
      // Coordinates are in Web Mercator (EPSG:3857), need to convert to WGS84
      const lon = (x / 20037508.34) * 180;
      const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
      return [lon, lat];
    } else {
      // Coordinates are already in geographic (WGS84)
      return [x, y];
    }
  });

  // Ensure the polygon is closed (first and last points should be the same)
  if (convertedBoundary.length > 0) {
    const first = convertedBoundary[0];
    const last = convertedBoundary[convertedBoundary.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      convertedBoundary.push([first[0], first[1]]);
    }
  }

  // Validate the converted coordinates
  const firstCoord = convertedBoundary[0];
  if (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90) {
    console.error('[convertBoundaryToGeoJSON] Invalid coordinates after conversion:', {
      original: boundary[0],
      converted: firstCoord
    });
    throw new Error(`Invalid coordinates: [${firstCoord[0]}, ${firstCoord[1]}]. Longitude must be between -180 and 180, latitude between -90 and 90.`);
  }

  return {
    type: 'Polygon',
    coordinates: [convertedBoundary]
  };
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDateRangeLastNDays = (days: number): DateRangeRequest => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    start_date: formatDateForAPI(startDate),
    end_date: formatDateForAPI(endDate)
  };
};

// Ordered by audit priority: fiable → utile → prudence → inutile
export const VEGETATION_INDICES: VegetationIndexType[] = [
  'NIRv', 'EVI', 'NDRE', 'NDMI', 'NDVI', 'GCI', 'SAVI', 'MSAVI2', 'OSAVI', 'MSI', 'MNDWI', 'MCARI', 'TCARI'
];

export const TIME_SERIES_INDICES: TimeSeriesIndexType[] = [...VEGETATION_INDICES, 'TCARI_OSAVI', 'NIRvP'];

export const VEGETATION_INDEX_DESCRIPTIONS: Record<VegetationIndexType, string> = {
  NIRv: 'NIRv — Verdure fonctionnelle (isole végétation du sol)',
  EVI: 'EVI — Végétation améliorée (corrige sol et atmosphère)',
  NDRE: 'NDRE — Chlorophylle/azote (détection précoce stress azoté)',
  NDMI: 'NDMI — Contenu en eau foliaire (alerte sécheresse)',
  NDVI: 'NDVI — Verdure globale (référence historique)',
  GCI: 'GCI — Chlorophylle (complément NDRE)',
  SAVI: 'SAVI — Végétation ajustée au sol (saison sèche)',
  OSAVI: 'OSAVI — SAVI optimisé (composante TCARI/OSAVI)',
  MSAVI2: 'MSAVI2 — SAVI modifié (L automatique)',
  MSI: 'MSI — Stress hydrique (redondant avec NDMI)',
  MNDWI: 'MNDWI — Surfaces d\'eau (hors contexte verger)',
  MCARI: 'MCARI — Chlorophylle (⚠ dangereux seul)',
  TCARI: 'TCARI — Chlorophylle red edge (⚠ dangereux seul)',
};
