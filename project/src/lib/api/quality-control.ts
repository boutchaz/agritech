import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';
import type { PaginatedQuery, PaginatedResponse } from './types';

export type InspectionType = 'pre_harvest' | 'post_harvest' | 'storage' | 'transport' | 'processing';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface QualityInspection {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id?: string | null;
  crop_cycle_id?: string | null;
  type: InspectionType;
  inspection_date: string;
  inspector_id?: string | null;
  results: Record<string, unknown>;
  status: InspectionStatus;
  overall_score?: number | null;
  notes?: string | null;
  attachments?: string[] | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  parcel?: {
    id: string;
    name: string;
    farm?: {
      id: string;
      name: string;
    };
  };
  farm?: {
    id: string;
    name: string;
  };
  inspector?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export interface QualityInspectionFilters extends PaginatedQuery {
  type?: InspectionType;
  status?: InspectionStatus;
  farm_id?: string;
  parcel_id?: string;
  crop_cycle_id?: string;
  inspector_id?: string;
  inspection_date_from?: string;
  inspection_date_to?: string;
  min_overall_score?: number;
  max_overall_score?: number;
}

export interface QualityControlStats {
  total: number;
  averageScore: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export const qualityControlApi = {
  getAll(organizationId: string, filters?: QualityInspectionFilters): Promise<PaginatedResponse<QualityInspection>> {
    requireOrganizationId(organizationId, 'qualityControlApi.getAll');
    const url = buildQueryUrl(`/api/v1/quality-control`, filters as Record<string, unknown>);
    return apiClient.get<PaginatedResponse<QualityInspection>>(url);
  },

  getById(organizationId: string, id: string): Promise<QualityInspection> {
    requireOrganizationId(organizationId, 'qualityControlApi.getById');
    return apiClient.get<QualityInspection>(`/api/v1/quality-control/${id}`);
  },

  getStatistics(organizationId: string): Promise<QualityControlStats> {
    requireOrganizationId(organizationId, 'qualityControlApi.getStatistics');
    return apiClient.get<QualityControlStats>(`/api/v1/quality-control/statistics`);
  },

  create(organizationId: string, data: Partial<QualityInspection>): Promise<QualityInspection> {
    requireOrganizationId(organizationId, 'qualityControlApi.create');
    return apiClient.post<QualityInspection>(`/api/v1/quality-control`, data);
  },

  update(organizationId: string, id: string, data: Partial<QualityInspection>): Promise<QualityInspection> {
    requireOrganizationId(organizationId, 'qualityControlApi.update');
    return apiClient.patch<QualityInspection>(`/api/v1/quality-control/${id}`, data);
  },

  updateStatus(organizationId: string, id: string, status: InspectionStatus): Promise<QualityInspection> {
    requireOrganizationId(organizationId, 'qualityControlApi.updateStatus');
    return apiClient.patch<QualityInspection>(`/api/v1/quality-control/${id}/status`, { status });
  },

  delete(organizationId: string, id: string): Promise<void> {
    requireOrganizationId(organizationId, 'qualityControlApi.delete');
    return apiClient.delete(`/api/v1/quality-control/${id}`);
  },
};
