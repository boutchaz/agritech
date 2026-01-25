import { apiClient } from '../api-client';

// =====================================================
// TYPES
// =====================================================

export interface LocationDto {
  latitude: number;
  longitude: number;
}

export type PestReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DetectionMethod = 'visual_inspection' | 'trap_monitoring' | 'lab_test' | 'field_scout' | 'automated_sensor' | 'worker_report';
export type PestReportStatus = 'pending' | 'verified' | 'treated' | 'resolved' | 'dismissed';

export interface CreatePestReportDto {
  farm_id: string;
  parcel_id: string;
  pest_disease_id?: string;
  severity: PestReportSeverity;
  affected_area_percentage?: number;
  detection_method?: DetectionMethod;
  photo_urls?: string[];
  location?: LocationDto;
  notes?: string;
}

export interface UpdatePestReportDto {
  status: PestReportStatus;
  treatment_applied?: string;
}

export interface PestDiseaseLibraryItem {
  id: string;
  name: string;
  type: 'pest' | 'disease';
  crop_types: string[];
  symptoms: string;
  treatment: string;
  prevention: string;
  severity: PestReportSeverity;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PestReportResponseDto {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  reporter_id: string;
  pest_disease_id?: string;
  severity: PestReportSeverity;
  affected_area_percentage?: number;
  detection_method?: DetectionMethod;
  photo_urls?: string[];
  location?: {
    type: string;
    coordinates: [number, number];
  };
  notes?: string;
  status: PestReportStatus;
  verified_by?: string;
  verified_at?: string;
  treatment_applied?: string;
  treatment_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  pest_disease?: PestDiseaseLibraryItem;
  farm?: {
    id: string;
    name: string;
  };
  parcel?: {
    id: string;
    name: string;
  };
  reporter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  verifier?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface EscalateToAlertResponse {
  alert_id: string;
  report_id: string;
}

// =====================================================
// API CLIENT
// =====================================================

const API_BASE = '/api/v1/pest-alerts';

export const pestAlertsApi = {
  /**
   * Get pest/disease reference library
   */
  async getPestDiseaseLibrary(organizationId: string): Promise<PestDiseaseLibraryItem[]> {
    return apiClient.get<PestDiseaseLibraryItem[]>(
      `${API_BASE}/library`,
      {},
      organizationId
    );
  },

  /**
   * Get all pest reports for organization
   */
  async getPestReports(organizationId: string): Promise<PestReportResponseDto[]> {
    return apiClient.get<PestReportResponseDto[]>(
      `${API_BASE}/reports`,
      {},
      organizationId
    );
  },

  /**
   * Get single pest report by ID
   */
  async getPestReport(organizationId: string, reportId: string): Promise<PestReportResponseDto> {
    return apiClient.get<PestReportResponseDto>(
      `${API_BASE}/reports/${reportId}`,
      {},
      organizationId
    );
  },

  /**
   * Create new pest report
   */
  async createPestReport(
    organizationId: string,
    data: CreatePestReportDto
  ): Promise<PestReportResponseDto> {
    return apiClient.post<PestReportResponseDto>(
      `${API_BASE}/reports`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Update pest report status
   */
  async updatePestReport(
    organizationId: string,
    reportId: string,
    data: UpdatePestReportDto
  ): Promise<PestReportResponseDto> {
    return apiClient.patch<PestReportResponseDto>(
      `${API_BASE}/reports/${reportId}`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Delete pest report
   */
  async deletePestReport(organizationId: string, reportId: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_BASE}/reports/${reportId}`,
      {},
      organizationId
    );
  },

  /**
   * Escalate pest report to performance alert
   */
  async escalatePestReport(
    organizationId: string,
    reportId: string
  ): Promise<EscalateToAlertResponse> {
    return apiClient.post<EscalateToAlertResponse>(
      `${API_BASE}/reports/${reportId}/escalate`,
      {},
      {},
      organizationId
    );
  },
};
