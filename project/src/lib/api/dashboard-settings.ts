import { apiClient } from '../api-client';

export interface DashboardSettings {
  show_soil_data: boolean;
  show_climate_data: boolean;
  show_irrigation_data: boolean;
  show_maintenance_data: boolean;
  show_production_data: boolean;
  show_financial_data: boolean;
  show_stock_alerts: boolean;
  show_task_alerts: boolean;
  layout: {
    topRow: string[];
    middleRow: string[];
    bottomRow: string[];
  };
}

export const dashboardSettingsApi = {
  async getSettings(organizationId: string): Promise<DashboardSettings | null> {
    const url = `/api/v1/dashboard/settings?organization_id=${organizationId}`;
    return apiClient.get<DashboardSettings | null>(url, {}, organizationId);
  },

  async upsertSettings(organizationId: string, settings: Partial<DashboardSettings>): Promise<DashboardSettings> {
    const url = `/api/v1/dashboard/settings?organization_id=${organizationId}`;
    return apiClient.put<DashboardSettings>(url, settings, organizationId);
  },
};
