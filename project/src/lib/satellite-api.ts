// Satellite Indices Service API Client
// This client interfaces with the satellite-indices-service for vegetation analysis

const SATELLITE_SERVICE_URL = import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001';

export interface VegetationIndex {
  NDVI: "NDVI";
  NDRE: "NDRE";
  NDMI: "NDMI";
  MNDWI: "MNDWI";
  GCI: "GCI";
  SAVI: "SAVI";
  OSAVI: "OSAVI";
  MSAVI2: "MSAVI2";
  PRI: "PRI";
  MSI: "MSI";
  MCARI: "MCARI";
  TCARI: "TCARI";
}

export type VegetationIndexType = keyof VegetationIndex;

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
}

export interface TimeSeriesRequest {
  aoi: AOIRequest;
  date_range: DateRangeRequest;
  index: VegetationIndexType;
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
  metadata: Record<string, any>;
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

export interface CloudCoverageCheckRequest {
  geometry: GeoJSONGeometry;
  date_range: DateRangeRequest;
  max_cloud_coverage?: number;
}

export interface CloudCoverageCheckResponse {
  has_suitable_images: boolean;
  available_images_count: number;
  min_cloud_coverage?: number;
  max_cloud_coverage?: number;
  recommended_date?: string;
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
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

class SatelliteAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = SATELLITE_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Health check
  async getHealth() {
    return this.request('/health');
  }

  // Calculate vegetation indices for a specific area
  async calculateIndices(request: IndexCalculationRequest): Promise<IndexCalculationResponse> {
    return this.request('/indices/calculate', {
      method: 'POST',
      body: JSON.stringify(request),
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

  // Export data as GeoTIFF
  async exportGeoTIFF(request: {
    aoi: AOIRequest;
    date: string;
    index: VegetationIndexType;
    scale?: number;
    format?: string;
  }): Promise<TiffExportResponse> {
    return this.request('/indices/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Calculate comprehensive statistics for a parcel with optional TIFF export
  async calculateParcelStatistics(request: ParcelStatisticsRequest): Promise<ParcelStatisticsResponse> {
    return this.request('/analysis/parcel-statistics', {
      method: 'POST',
      body: JSON.stringify(request),
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

  // Generate vegetation index image
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
}

// Export singleton instance
export const satelliteApi = new SatelliteAPIClient();

// Utility functions
export const convertBoundaryToGeoJSON = (boundary: number[][]): GeoJSONGeometry => {
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

export const VEGETATION_INDICES: VegetationIndexType[] = [
  'NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI'
];

export const VEGETATION_INDEX_DESCRIPTIONS: Record<VegetationIndexType, string> = {
  NDVI: 'Normalized Difference Vegetation Index - General vegetation health',
  NDRE: 'Normalized Difference Red Edge - Nitrogen content',
  NDMI: 'Normalized Difference Moisture Index - Plant water stress',
  MNDWI: 'Modified Normalized Difference Water Index - Surface water',
  GCI: 'Green Chlorophyll Index - Chlorophyll content',
  SAVI: 'Soil Adjusted Vegetation Index - Vegetation with soil background',
  OSAVI: 'Optimized Soil Adjusted Vegetation Index - Enhanced SAVI',
  MSAVI2: 'Modified Soil Adjusted Vegetation Index - Version 2',
  PRI: 'Photochemical Reflectance Index - Light use efficiency',
  MSI: 'Moisture Stress Index - Plant water stress',
  MCARI: 'Modified Chlorophyll Absorption Ratio Index - Chlorophyll',
  TCARI: 'Transformed Chlorophyll Absorption Reflectance Index - Chlorophyll'
};