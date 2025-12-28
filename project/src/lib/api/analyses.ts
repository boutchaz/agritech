import { apiClient } from '../api-client';
import type {
  Analysis,
  AnalysisType,
  SoilAnalysisData,
  PlantAnalysisData,
  WaterAnalysisData,
  AnalysisRecommendation
} from '../../types/analysis';

const BASE_URL = '/api/v1/analyses';

type AnalysisData = SoilAnalysisData | PlantAnalysisData | WaterAnalysisData;

export interface AnalysisFilters {
  parcel_id?: string;
  parcel_ids?: string[];
  farm_id?: string;
  analysis_type?: AnalysisType;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateAnalysisInput {
  parcel_id: string;
  analysis_type: AnalysisType;
  analysis_date: string;
  data: AnalysisData;
  laboratory?: string;
  notes?: string;
}

export interface UpdateAnalysisInput {
  analysis_date?: string;
  laboratory?: string;
  data?: AnalysisData;
  notes?: string;
}

export interface AnalysesResponse {
  data: Analysis[];
  count: number;
}

export const analysesApi = {
  /**
   * Get all analyses with optional filters
   */
  async getAll(filters?: AnalysisFilters, organizationId?: string): Promise<AnalysesResponse> {
    const params = new URLSearchParams();

    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.parcel_ids?.length) params.append('parcel_ids', filters.parcel_ids.join(','));
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.analysis_type) params.append('analysis_type', filters.analysis_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<AnalysesResponse>(url, {}, organizationId);
  },

  /**
   * Get a single analysis by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Analysis> {
    return apiClient.get<Analysis>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new analysis
   */
  async create(data: CreateAnalysisInput, organizationId?: string): Promise<Analysis> {
    return apiClient.post<Analysis>(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update an analysis
   */
  async update(id: string, data: UpdateAnalysisInput, organizationId?: string): Promise<Analysis> {
    return apiClient.patch<Analysis>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete an analysis
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Get recommendations for an analysis
   */
  async getRecommendations(
    analysisId: string,
    organizationId?: string,
  ): Promise<AnalysisRecommendation[]> {
    return apiClient.get<AnalysisRecommendation[]>(
      `${BASE_URL}/${analysisId}/recommendations`,
      {},
      organizationId,
    );
  },

  /**
   * Create a recommendation for an analysis
   */
  async createRecommendation(
    analysisId: string,
    data: Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>,
    organizationId?: string,
  ): Promise<AnalysisRecommendation> {
    return apiClient.post<AnalysisRecommendation>(
      `${BASE_URL}/${analysisId}/recommendations`,
      data,
      {},
      organizationId,
    );
  },

  /**
   * Update a recommendation
   */
  async updateRecommendation(
    recommendationId: string,
    data: Partial<Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>>,
    organizationId?: string,
  ): Promise<AnalysisRecommendation> {
    return apiClient.patch<AnalysisRecommendation>(
      `${BASE_URL}/recommendations/${recommendationId}`,
      data,
      {},
      organizationId,
    );
  },

  /**
   * Delete a recommendation
   */
  async deleteRecommendation(
    recommendationId: string,
    organizationId?: string,
  ): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `${BASE_URL}/recommendations/${recommendationId}`,
      {},
      organizationId,
    );
  },
};
