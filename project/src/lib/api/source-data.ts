import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/ai-reports';

/**
 * Data freshness levels for visual indicators
 */
export type DataFreshnessLevel = 'fresh' | 'aging' | 'stale';

/**
 * Data sufficiency status
 */
export type DataSufficiencyStatus = 'sufficient' | 'insufficient' | 'minimal';

/**
 * Individual data source metadata
 */
export interface DataSourceInfo {
  name: string;
  available: boolean;
  dataPoints: number;
  dateRange: {
    start: string | null;
    end: string | null;
  } | null;
  lastUpdated: string | null;
  freshnessLevel: DataFreshnessLevel;
  freshnessAgeDays: number | null;
  included: boolean;
  excludeReason?: string;
}

/**
 * Satellite data details
 */
export interface SatelliteDataDetails {
  indices: string[];
  imageCount: number;
  avgCloudCoverage: number | null;
  resolution: string | null;
  provider: string | null;
  timeSeries: Array<{
    date: string;
    ndvi?: number;
    ndwi?: number;
    evi?: number;
    cloudCoverage?: number;
  }>;
}

/**
 * Weather data details
 */
export interface WeatherDataDetails {
  provider: string | null;
  completeness: number;
  temperatureRange: {
    min: number;
    max: number;
    avg: number;
  } | null;
  precipitationTotal: number | null;
  dataPoints: Array<{
    date: string;
    tempMin: number;
    tempMax: number;
    precipitation: number;
  }>;
}

/**
 * Analysis data details (soil, water, plant)
 */
export interface AnalysisDataDetails {
  type: 'soil' | 'water' | 'plant';
  analysisDate: string | null;
  labReference?: string;
  parameters: Array<{
    name: string;
    value: number | string;
    unit?: string;
    status?: 'normal' | 'warning' | 'critical';
  }>;
}

/**
 * Complete source data metadata for a report
 */
export interface SourceDataMetadata {
  reportId: string;
  parcelId: string;
  parcelName: string;

  // Overall metadata
  generatedAt: string;
  dataCollectionPeriod: {
    start: string;
    end: string;
  };

  // Data sources summary
  totalDataPoints: number;
  includedSources: string[];
  excludedSources: string[];

  // Sufficiency assessment
  sufficiencyStatus: DataSufficiencyStatus;
  sufficiencyScore: number; // 0-100
  sufficiencyThresholds: {
    minimum: number;
    recommended: number;
    optimal: number;
  };

  // Individual data sources
  sources: {
    satellite: DataSourceInfo & { details?: SatelliteDataDetails };
    weather: DataSourceInfo & { details?: WeatherDataDetails };
    soil: DataSourceInfo & { details?: AnalysisDataDetails };
    water: DataSourceInfo & { details?: AnalysisDataDetails };
    plant: DataSourceInfo & { details?: AnalysisDataDetails };
  };

  // Warnings and alerts
  warnings: Array<{
    type: 'stale_data' | 'insufficient_data' | 'missing_source' | 'partial_data';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    source?: string;
    recommendation?: string;
  }>;

  // Audit trail
  auditInfo: {
    dataFetchedAt: string;
    processingStartedAt: string;
    processingCompletedAt: string;
    processingDurationMs: number;
    dataVersion: string;
  };
}

/**
 * Freshness thresholds in days
 */
export const FRESHNESS_THRESHOLDS = {
  satellite: { fresh: 7, aging: 30 },
  weather: { fresh: 1, aging: 3 },
  soil: { fresh: 180, aging: 365 },
  water: { fresh: 90, aging: 180 },
  plant: { fresh: 30, aging: 90 },
};

/**
 * Get freshness level based on age and source type
 */
export function getFreshnessLevel(
  ageDays: number | null,
  sourceType: keyof typeof FRESHNESS_THRESHOLDS
): DataFreshnessLevel {
  if (ageDays === null) return 'stale';
  const thresholds = FRESHNESS_THRESHOLDS[sourceType];
  if (ageDays <= thresholds.fresh) return 'fresh';
  if (ageDays <= thresholds.aging) return 'aging';
  return 'stale';
}

/**
 * Get sufficiency status based on score
 */
export function getSufficiencyStatus(score: number): DataSufficiencyStatus {
  if (score >= 70) return 'sufficient';
  if (score >= 40) return 'minimal';
  return 'insufficient';
}

/**
 * API functions for source data metadata
 */
export const sourceDataApi = {
  /**
   * Get source data metadata for a specific report
   */
  async getSourceDataMetadata(
    reportId: string,
    organizationId?: string
  ): Promise<SourceDataMetadata> {
    return apiClient.get(
      `${BASE_URL}/reports/${reportId}/source-data`,
      {},
      organizationId
    );
  },

  /**
   * Get source data preview before generating a report
   */
  async getSourceDataPreview(
    parcelId: string,
    startDate: string,
    endDate: string,
    organizationId?: string
  ): Promise<Omit<SourceDataMetadata, 'reportId' | 'generatedAt' | 'auditInfo'>> {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    return apiClient.get(
      `${BASE_URL}/parcels/${parcelId}/source-data-preview?${params}`,
      {},
      organizationId
    );
  },

  /**
   * Refresh data for a specific source before report generation
   */
  async refreshSourceData(
    parcelId: string,
    sources: Array<'satellite' | 'weather'>,
    organizationId?: string
  ): Promise<{ success: boolean; refreshedSources: string[]; message: string }> {
    return apiClient.post(
      `${BASE_URL}/parcels/${parcelId}/refresh-data`,
      { sources },
      {},
      organizationId
    );
  },
};
