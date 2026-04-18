// Analyses API Client for Mobile App
// Adapted from web: project/src/lib/api/analyses.ts

import { api } from '../api';
import type {
  Analysis,
  AnalysisFilters,
  AnalysesResponse,
  CreateAnalysisInput,
  UpdateAnalysisInput,
  AnalysisRecommendation,
} from '@/types/analysis';

const BASE_URL = '/analyses';

export const analysesApi = {
  /**
   * Get all analyses with optional filters
   */
  async getAll(filters?: AnalysisFilters): Promise<AnalysesResponse> {
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
    return api.get<AnalysesResponse>(url);
  },

  /**
   * Get a single analysis by ID
   */
  async getOne(id: string): Promise<Analysis> {
    return api.get<Analysis>(`${BASE_URL}/${id}`);
  },

  /**
   * Create a new analysis
   */
  async create(data: CreateAnalysisInput): Promise<Analysis> {
    return api.post<Analysis>(BASE_URL, data);
  },

  /**
   * Update an analysis
   */
  async update(id: string, data: UpdateAnalysisInput): Promise<Analysis> {
    return api.patch<Analysis>(`${BASE_URL}/${id}`, data);
  },

  /**
   * Delete an analysis
   */
  async deleteAnalysis(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${BASE_URL}/${id}`);
  },

  /**
   * Get recommendations for an analysis
   */
  async getRecommendations(analysisId: string): Promise<AnalysisRecommendation[]> {
    return api.get<AnalysisRecommendation[]>(`${BASE_URL}/${analysisId}/recommendations`);
  },

  /**
   * Create a recommendation for an analysis
   */
  async createRecommendation(
    analysisId: string,
    data: Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>,
  ): Promise<AnalysisRecommendation> {
    return api.post<AnalysisRecommendation>(
      `${BASE_URL}/${analysisId}/recommendations`,
      data,
    );
  },

  /**
   * Update a recommendation
   */
  async updateRecommendation(
    recommendationId: string,
    data: Partial<Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>>,
  ): Promise<AnalysisRecommendation> {
    return api.patch<AnalysisRecommendation>(
      `${BASE_URL}/recommendations/${recommendationId}`,
      data,
    );
  },

  /**
   * Delete a recommendation
   */
  async deleteRecommendation(recommendationId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `${BASE_URL}/recommendations/${recommendationId}`,
    );
  },
};
