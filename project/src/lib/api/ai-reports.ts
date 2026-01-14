import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/ai-reports';

export type AIProvider = 'openai' | 'gemini' | 'groq' | 'zai';

export interface DataAvailabilityResponse {
  parcel: {
    id: string;
    name: string;
    hasBoundary: boolean;
  };
  satellite: {
    available: boolean;
    dataPoints: number;
    indices: string[];
    dateRange: { earliest: string; latest: string } | null;
  };
  soil: {
    available: boolean;
    lastAnalysisDate: string | null;
  };
  water: {
    available: boolean;
    lastAnalysisDate: string | null;
  };
  plant: {
    available: boolean;
    lastAnalysisDate: string | null;
  };
  weather: {
    available: boolean;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface AIProviderInfo {
  provider: AIProvider;
  available: boolean;
  name: string;
}

export interface GenerateAIReportDto {
  parcel_id: string;
  provider: AIProvider;
  model?: string;
  data_start_date?: string;
  data_end_date?: string;
  language?: 'en' | 'fr' | 'ar';
}

export interface AIHealthAssessment {
  overallScore: number;
  soilHealth: string;
  vegetationHealth: string;
  waterStatus: string;
}

export interface AIRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'fertilization' | 'irrigation' | 'pest-control' | 'soil-amendment' | 'general';
  title: string;
  description: string;
  timing?: string;
}

export interface AIRiskAlert {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  description: string;
  mitigationSteps?: string[];
}

export interface AIActionItem {
  priority: number;
  action: string;
  deadline?: string;
  estimatedImpact: string;
}

export interface AIReportSections {
  executiveSummary: string;
  healthAssessment: AIHealthAssessment;
  recommendations: AIRecommendation[];
  riskAlerts: AIRiskAlert[];
  actionItems: AIActionItem[];
}

export interface AIReportResponse {
  id: string;
  parcel_id: string;
  provider: AIProvider;
  model: string;
  sections: AIReportSections;
  generated_at: string;
  data_range: {
    start: string;
    end: string;
  };
  metadata: {
    token_usage?: number;
    processing_time_ms?: number;
  };
}

// Backend response structure
interface BackendAIReportResponse {
  success: boolean;
  report: {
    id: string;
    parcel_id: string;
    title: string;
    status: string;
    generated_at: string;
    metadata: {
      type: string;
      provider: AIProvider;
      sections: AIReportSections;
      health_score: number;
      recommendations_count: number;
      risk_alerts_count: number;
    };
  };
  sections: AIReportSections;
  metadata: {
    provider: AIProvider;
    model: string;
    tokensUsed?: number;
    generatedAt: string;
    dataRange: {
      start: string;
      end: string;
    };
  };
}

export interface CalibrationStatus {
  status: 'ready' | 'warning' | 'blocked';
  accuracy: number;
  missingData: string[];
  recommendations: string[];
  lastValidated: string;
  nextAutoRefresh?: string;
  satellite: {
    status: 'available' | 'stale' | 'missing';
    imageCount: number;
    latestDate: string | null;
    ageDays: number | null;
    cloudCoverage: number | null;
    isValid: boolean;
  };
  weather: {
    status: 'available' | 'incomplete' | 'missing';
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
}

export interface CalibrateRequest {
  forceRefetch?: boolean;
  autoFetch?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface FetchDataRequest {
  dataSources: ('satellite' | 'weather')[];
}

export const aiReportsApi = {
  async getProviders(organizationId?: string): Promise<AIProviderInfo[]> {
    return apiClient.get(`${BASE_URL}/providers`, {}, organizationId);
  },

  async getDataAvailability(
    parcelId: string,
    startDate?: string,
    endDate?: string,
    organizationId?: string,
  ): Promise<DataAvailabilityResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.get(`${BASE_URL}/data-availability/${parcelId}${query}`, {}, organizationId);
  },

  async getCalibrationStatus(
    parcelId: string,
    startDate?: string,
    endDate?: string,
    organizationId?: string,
  ): Promise<CalibrationStatus> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.get(`${BASE_URL}/parcels/${parcelId}/calibration-status${query}`, {}, organizationId);
  },

  async calibrate(
    parcelId: string,
    request: CalibrateRequest,
    organizationId?: string,
  ): Promise<CalibrationStatus> {
    return apiClient.post(`${BASE_URL}/parcels/${parcelId}/calibrate`, request, {}, organizationId);
  },

  async fetchData(
    parcelId: string,
    request: FetchDataRequest,
    organizationId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${BASE_URL}/parcels/${parcelId}/fetch-data`, request, {}, organizationId);
  },

  async generateReport(data: GenerateAIReportDto, organizationId?: string): Promise<AIReportResponse> {
    const response: BackendAIReportResponse = await apiClient.post(`${BASE_URL}/generate`, data, {}, organizationId);

    // Map backend response to frontend expected format
    return {
      id: response.report.id,
      parcel_id: response.report.parcel_id,
      provider: response.metadata.provider,
      model: response.metadata.model,
      sections: response.sections,
      generated_at: response.metadata.generatedAt,
      data_range: response.metadata.dataRange,
      metadata: {
        token_usage: response.metadata.tokensUsed,
      },
    };
  },
};
