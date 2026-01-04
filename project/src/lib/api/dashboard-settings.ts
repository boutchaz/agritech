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
    return apiClient.get<DashboardSettings | null>('/api/v1/dashboard/settings', {}, organizationId);
  },

  async upsertSettings(organizationId: string, settings: Partial<DashboardSettings>): Promise<DashboardSettings> {
    return apiClient.put<DashboardSettings>('/api/v1/dashboard/settings', settings, {}, organizationId);
  },
};
