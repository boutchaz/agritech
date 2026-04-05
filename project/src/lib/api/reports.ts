import { apiClient } from '../api-client';

export enum ReportType {
  // Base reports
  ANALYSES_COMPLETE = 'analyses-complete',
  ANALYSES_SOIL_ONLY = 'analyses-soil-only',
  STOCK_INVENTORY = 'stock-inventory',
  STOCK_MOVEMENTS = 'stock-movements',
  INFRASTRUCTURE_COMPLETE = 'infrastructure-complete',
  EMPLOYEES = 'employees',
  DAY_LABORERS = 'day-laborers',

  // Module-specific reports
  FRUIT_TREES_FERTILIZATION = 'fruit-trees-fertilization',
  FRUIT_TREES_PRUNING = 'fruit-trees-pruning',
  MUSHROOMS_PRODUCTION = 'mushrooms-production',
  GREENHOUSE_CLIMATE = 'greenhouse-climate',
  HYDROPONICS_NUTRIENTS = 'hydroponics-nutrients',
  MARKET_GARDENING_PRODUCTION = 'market-gardening-production',
  AQUACULTURE_WATER_QUALITY = 'aquaculture-water-quality',
  BEEKEEPING_PRODUCTION = 'beekeeping-production',
  CATTLE_PRODUCTION = 'cattle-production',
  CAMEL_PRODUCTION = 'camel-production',
  GOAT_PRODUCTION = 'goat-production',
  LAYING_HENS_PRODUCTION = 'laying-hens-production',
}

export interface ReportTypeInfo {
  id: ReportType;
  name: string;
  description: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  types: ReportTypeInfo[];
}

export interface AvailableReportsResponse {
  baseReports: ReportCategory[];
  moduleReports: ReportCategory[];
}

export interface ReportFilters {
  report_type: ReportType;
  start_date?: string;
  end_date?: string;
  parcel_id?: string;
  farm_id?: string;
}

export interface ReportData {
  columns: string[];
  data: Record<string, unknown>[];
}

export const reportsApi = {
  /**
   * Get available report types for the organization
   */
  async getAvailableReports(organizationId: string): Promise<AvailableReportsResponse> {
    return apiClient.get<AvailableReportsResponse>(
      `/api/v1/organizations/${organizationId}/reports/available`
    );
  },

  /**
   * Generate a report
   */
  async generateReport(
    organizationId: string,
    filters: ReportFilters
  ): Promise<ReportData> {
    const params = new URLSearchParams();
    params.append('report_type', filters.report_type);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters.farm_id) params.append('farm_id', filters.farm_id);

    const queryString = params.toString();
    return apiClient.get<ReportData>(
      `/api/v1/organizations/${organizationId}/reports/generate?${queryString}`
    );
  },
};
