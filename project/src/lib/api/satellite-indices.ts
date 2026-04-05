import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/satellite-indices';

export interface SatelliteIndex {
  id: string;
  organization_id: string;
  parcel_id: string;
  farm_id?: string;
  processing_job_id?: string;
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
  image_source?: string;
  geotiff_url?: string;
  geotiff_expires_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  index_value?: number;
  cloud_coverage?: number;
  image_url?: string;
}

export interface SatelliteIndexFilters {
  parcel_id?: string;
  farm_id?: string;
  index_name?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateSatelliteIndexInput {
  parcel_id: string;
  farm_id?: string;
  index_name: string;
  date: string;
  // Statistics values
  mean_value?: number;
  min_value?: number;
  max_value?: number;
  std_value?: number;
  median_value?: number;
  percentile_25?: number;
  percentile_75?: number;
  percentile_90?: number;
  pixel_count?: number;
  // Metadata
  cloud_coverage_percentage?: number;
  image_source?: string;
  geotiff_url?: string;
  geotiff_expires_at?: string;
  processing_job_id?: string;
  metadata?: Record<string, any>;
  // Legacy single value field
  index_value?: number;
}

export type UpdateSatelliteIndexInput = Partial<Omit<CreateSatelliteIndexInput, 'parcel_id' | 'farm_id'>>;

export const satelliteIndicesApi = {
  /**
   * Get all satellite indices with optional filters
   */
  async getAll(filters?: SatelliteIndexFilters, organizationId?: string): Promise<SatelliteIndex[]> {
    const params = new URLSearchParams();
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.index_name) params.append('index_name', filters.index_name);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<SatelliteIndex[] | { data: SatelliteIndex[] }>(url, {}, organizationId);

    // Handle both array and { data: [...] } response formats
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  },

  /**
   * Get a single satellite index by ID
   */
  async getOne(id: string, organizationId?: string): Promise<SatelliteIndex> {
    return apiClient.get<SatelliteIndex>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new satellite index record
   */
  async create(data: CreateSatelliteIndexInput, organizationId?: string): Promise<SatelliteIndex> {
    return apiClient.post<SatelliteIndex>(BASE_URL, data, {}, organizationId);
  },

  /**
   * Create multiple satellite index records in bulk
   */
  async createBulk(data: CreateSatelliteIndexInput[], organizationId?: string): Promise<SatelliteIndex[]> {
    const results: SatelliteIndex[] = [];
    for (const item of data) {
      try {
        const result = await this.create(item, organizationId);
        results.push(result);
      } catch (err) {
        // Log but continue with other items
        console.warn('Failed to create satellite index:', err);
      }
    }
    return results;
  },

  /**
   * Update a satellite index record
   */
  async update(id: string, data: UpdateSatelliteIndexInput, organizationId?: string): Promise<SatelliteIndex> {
    return apiClient.patch<SatelliteIndex>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a satellite index record
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Check if data exists for a specific parcel, index, and date
   */
  async exists(
    parcelId: string,
    vegIndex: string,
    date: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      const data = await this.getAll(
        {
          parcel_id: parcelId,
          index_name: vegIndex,
          date_from: date,
          date_to: date,
        },
        organizationId
      );
      return data.length > 0;
    } catch {
      return false;
    }
  },

  /**
   * Get the latest data date for a parcel
   */
  async getLatestDate(parcelId: string, organizationId?: string): Promise<string | null> {
    try {
      const data = await this.getAll(
        {
          parcel_id: parcelId,
          limit: 1,
        },
        organizationId
      );
      return data.length > 0 ? data[0].date : null;
    } catch {
      return null;
    }
  },
};
