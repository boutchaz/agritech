import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { sourceDataApi, getFreshnessLevel, getSufficiencyStatus } from '../lib/api/source-data';
import type { SourceDataMetadata, DataFreshnessLevel, DataSourceInfo } from '../lib/api/source-data';

/**
 * Hook to fetch source data metadata for a specific report
 */
export function useSourceDataMetadata(reportId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['source-data-metadata', reportId, currentOrganization?.id],
    queryFn: async () => {
      if (!reportId || !currentOrganization?.id) {
        throw new Error('Report ID and organization are required');
      }
      return sourceDataApi.getSourceDataMetadata(reportId, currentOrganization.id);
    },
    enabled: !!reportId && !!currentOrganization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - source data doesn't change often
    retry: 1,
  });
}

/**
 * Hook to fetch source data preview before generating a report
 */
export function useSourceDataPreview(
  parcelId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['source-data-preview', parcelId, startDate, endDate, currentOrganization?.id],
    queryFn: async () => {
      if (!parcelId || !startDate || !endDate || !currentOrganization?.id) {
        throw new Error('All parameters are required');
      }
      return sourceDataApi.getSourceDataPreview(parcelId, startDate, endDate, currentOrganization.id);
    },
    enabled: !!parcelId && !!startDate && !!endDate && !!currentOrganization?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

/**
 * Hook to refresh source data before report generation
 */
export function useRefreshSourceData() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parcelId,
      sources,
    }: {
      parcelId: string;
      sources: Array<'satellite' | 'weather'>;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization is required');
      }
      return sourceDataApi.refreshSourceData(parcelId, sources, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries after refresh
      queryClient.invalidateQueries({
        queryKey: ['source-data-preview', variables.parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['calibration-status', variables.parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-report-data-availability', variables.parcelId],
      });
    },
  });
}

/**
 * Helper hook to build source data metadata from existing calibration status
 * This is useful when the backend doesn't have a dedicated endpoint yet
 */
export function useSourceDataFromCalibration(
  parcelId: string,
  parcelName: string,
  startDate: string,
  endDate: string,
  calibrationStatus: {
    accuracy: number;
    status: 'ready' | 'warning' | 'blocked';
    satellite: {
      status: string;
      imageCount: number;
      latestDate: string | null;
      ageDays: number | null;
      isValid: boolean;
    };
    weather: {
      status: string;
      completeness: number;
      latestDate: string | null;
      ageHours: number | null;
      isValid: boolean;
    };
    soil: {
      present: boolean;
      latestDate: string | null;
      ageDays: number | null;
      isValid: boolean;
    };
    water: {
      present: boolean;
      latestDate: string | null;
      ageDays: number | null;
      isValid: boolean;
    };
    plant: {
      present: boolean;
      latestDate: string | null;
      ageDays: number | null;
      isValid: boolean;
    };
    recommendations: string[];
    lastValidated: string;
  } | null,
  reportId?: string
): SourceDataMetadata | null {
  if (!calibrationStatus) return null;

  const now = new Date().toISOString();

  const buildSourceInfo = (
    name: string,
    available: boolean,
    dataPoints: number,
    lastUpdated: string | null,
    ageDays: number | null,
    isValid: boolean
  ): DataSourceInfo => {
    const freshnessLevel = getFreshnessLevel(
      ageDays,
      name as 'satellite' | 'weather' | 'soil' | 'water' | 'plant'
    );
    return {
      name,
      available,
      dataPoints,
      dateRange: lastUpdated
        ? { start: startDate, end: lastUpdated }
        : null,
      lastUpdated,
      freshnessLevel,
      freshnessAgeDays: ageDays,
      included: available && isValid,
      excludeReason: !available
        ? `No ${name} data available`
        : !isValid
        ? `${name} data is outdated or incomplete`
        : undefined,
    };
  };

  const sources = {
    satellite: {
      ...buildSourceInfo(
        'satellite',
        calibrationStatus.satellite.imageCount > 0,
        calibrationStatus.satellite.imageCount,
        calibrationStatus.satellite.latestDate,
        calibrationStatus.satellite.ageDays,
        calibrationStatus.satellite.isValid
      ),
      details: {
        indices: ['NDVI', 'NDWI', 'EVI'],
        imageCount: calibrationStatus.satellite.imageCount,
        avgCloudCoverage: null,
        resolution: null,
        provider: 'Sentinel-2',
        timeSeries: [],
      },
    },
    weather: {
      ...buildSourceInfo(
        'weather',
        calibrationStatus.weather.completeness > 0,
        Math.round(calibrationStatus.weather.completeness),
        calibrationStatus.weather.latestDate,
        calibrationStatus.weather.ageHours
          ? Math.floor(calibrationStatus.weather.ageHours / 24)
          : null,
        calibrationStatus.weather.isValid
      ),
      details: {
        provider: 'OpenWeatherMap',
        completeness: calibrationStatus.weather.completeness,
        temperatureRange: null,
        precipitationTotal: null,
        dataPoints: [],
      },
    },
    soil: {
      ...buildSourceInfo(
        'soil',
        calibrationStatus.soil.present,
        calibrationStatus.soil.present ? 1 : 0,
        calibrationStatus.soil.latestDate,
        calibrationStatus.soil.ageDays,
        calibrationStatus.soil.isValid
      ),
      details: calibrationStatus.soil.present
        ? {
            type: 'soil' as const,
            analysisDate: calibrationStatus.soil.latestDate,
            parameters: [],
          }
        : undefined,
    },
    water: {
      ...buildSourceInfo(
        'water',
        calibrationStatus.water.present,
        calibrationStatus.water.present ? 1 : 0,
        calibrationStatus.water.latestDate,
        calibrationStatus.water.ageDays,
        calibrationStatus.water.isValid
      ),
      details: calibrationStatus.water.present
        ? {
            type: 'water' as const,
            analysisDate: calibrationStatus.water.latestDate,
            parameters: [],
          }
        : undefined,
    },
    plant: {
      ...buildSourceInfo(
        'plant',
        calibrationStatus.plant.present,
        calibrationStatus.plant.present ? 1 : 0,
        calibrationStatus.plant.latestDate,
        calibrationStatus.plant.ageDays,
        calibrationStatus.plant.isValid
      ),
      details: calibrationStatus.plant.present
        ? {
            type: 'plant' as const,
            analysisDate: calibrationStatus.plant.latestDate,
            parameters: [],
          }
        : undefined,
    },
  };

  const includedSources = Object.entries(sources)
    .filter(([_, info]) => info.included)
    .map(([name]) => name);

  const excludedSources = Object.entries(sources)
    .filter(([_, info]) => !info.included)
    .map(([name]) => name);

  const totalDataPoints = Object.values(sources).reduce(
    (sum, source) => sum + (source.included ? source.dataPoints : 0),
    0
  );

  const warnings: SourceDataMetadata['warnings'] = [];

  // Add warnings based on calibration status
  if (calibrationStatus.status === 'blocked') {
    warnings.push({
      type: 'insufficient_data',
      severity: 'critical',
      message: 'Critical data is missing. Report generation may be blocked.',
      recommendation: 'Fetch missing satellite or weather data before generating the report.',
    });
  }

  Object.entries(sources).forEach(([name, source]) => {
    if (source.freshnessLevel === 'stale' && source.available) {
      warnings.push({
        type: 'stale_data',
        severity: 'warning',
        message: `${name.charAt(0).toUpperCase() + name.slice(1)} data is stale and may affect report accuracy.`,
        source: name,
        recommendation: `Consider refreshing ${name} data before generating the report.`,
      });
    }
  });

  calibrationStatus.recommendations.forEach((rec) => {
    warnings.push({
      type: 'partial_data',
      severity: 'info',
      message: rec,
    });
  });

  const sufficiencyScore = calibrationStatus.accuracy;
  const sufficiencyStatus = getSufficiencyStatus(sufficiencyScore);

  return {
    reportId: reportId || 'preview',
    parcelId,
    parcelName,
    generatedAt: now,
    dataCollectionPeriod: {
      start: startDate,
      end: endDate,
    },
    totalDataPoints,
    includedSources,
    excludedSources,
    sufficiencyStatus,
    sufficiencyScore,
    sufficiencyThresholds: {
      minimum: 40,
      recommended: 70,
      optimal: 90,
    },
    sources,
    warnings,
    auditInfo: {
      dataFetchedAt: calibrationStatus.lastValidated,
      processingStartedAt: now,
      processingCompletedAt: now,
      processingDurationMs: 0,
      dataVersion: '1.0.0',
    },
  };
}

export type { SourceDataMetadata, DataFreshnessLevel };
