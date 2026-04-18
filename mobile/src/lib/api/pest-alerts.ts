// Pest Alerts API Client for Mobile App
import { api } from '../api';
import type {
  PestReport,
  PestDiseaseLibraryItem,
  PestReportFilters,
  CreatePestReportInput,
  UpdatePestReportInput,
  DiseaseRiskResponse,
} from '@/types/pest-alerts';

const BASE_URL = '/pest-alerts';

export const pestAlertsApi = {
  // Reports
  async getReports(filters?: PestReportFilters): Promise<PestReport[]> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString();
    const res = await api.get<PestReport[]>(`${BASE_URL}/reports${query ? `?${query}` : ''}`);
    return res || [];
  },

  async getReport(reportId: string): Promise<PestReport> {
    return api.get<PestReport>(`${BASE_URL}/reports/${reportId}`);
  },

  async createReport(data: CreatePestReportInput): Promise<PestReport> {
    return api.post<PestReport>(`${BASE_URL}/reports`, data);
  },

  async updateReport(reportId: string, data: UpdatePestReportInput): Promise<PestReport> {
    return api.patch<PestReport>(`${BASE_URL}/reports/${reportId}`, data);
  },

  async deleteReport(reportId: string): Promise<void> {
    return api.delete<void>(`${BASE_URL}/reports/${reportId}`);
  },

  // Library
  async getLibrary(): Promise<PestDiseaseLibraryItem[]> {
    const res = await api.get<PestDiseaseLibraryItem[]>(`${BASE_URL}/library`);
    return res || [];
  },

  // Disease Risk
  async getDiseaseRisk(parcelId: string): Promise<DiseaseRiskResponse> {
    return api.get<DiseaseRiskResponse>(`${BASE_URL}/disease-risk/${parcelId}`);
  },

  // Escalation
  async escalateReport(reportId: string): Promise<{ alert_id: string; report_id: string }> {
    return api.post<{ alert_id: string; report_id: string }>(`${BASE_URL}/reports/${reportId}/escalate`, {});
  },
};
