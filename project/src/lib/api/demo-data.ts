import { apiClient } from '../api-client';

export interface DataStats {
  organizationId: string;
  stats: Record<string, number>;
  total: number;
}

export interface SeedResult {
  message: string;
  organizationId: string;
  stats: Record<string, number>;
}

export interface ClearResult {
  message: string;
  organizationId: string;
  deletedCounts: Record<string, number>;
  totalDeleted: number;
}

export interface ExportData {
  metadata: Array<{
    exportDate: string;
    organizationId: string;
    version: string;
  }>;
  [key: string]: any[];
}

export interface ImportResult {
  message: string;
  organizationId: string;
  importedCounts: Record<string, number>;
  totalImported: number;
}

export const demoDataApi = {
  /**
   * Get data statistics for an organization
   */
  async getStats(organizationId: string): Promise<DataStats> {
    return apiClient.get<DataStats>(`/api/v1/organizations/${organizationId}/demo-data/stats`);
  },

  /**
   * Seed demo data for an organization
   */
  async seedDemoData(organizationId: string): Promise<SeedResult> {
    return apiClient.post<SeedResult>(`/api/v1/organizations/${organizationId}/demo-data/seed`, {});
  },

  /**
   * Clear all data for an organization
   */
  async clearData(organizationId: string): Promise<ClearResult> {
    return apiClient.delete<ClearResult>(`/api/v1/organizations/${organizationId}/demo-data/clear`);
  },

  async clearDemoDataOnly(organizationId: string): Promise<ClearResult> {
    return apiClient.delete<ClearResult>(`/api/v1/organizations/${organizationId}/demo-data/clear-demo-only`);
  },

  /**
   * Export all organization data as JSON
   */
  async exportData(organizationId: string): Promise<ExportData> {
    return apiClient.get<ExportData>(`/api/v1/organizations/${organizationId}/demo-data/export`);
  },

  /**
   * Import organization data from JSON
   */
  async importData(organizationId: string, data: ExportData): Promise<ImportResult> {
    return apiClient.post<ImportResult>(`/api/v1/organizations/${organizationId}/demo-data/import`, data);
  },
};
