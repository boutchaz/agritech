export type CalibrationMaturityPhase =
  | 'juvenile'
  | 'entree_production'
  | 'pleine_production'
  | 'maturite_avancee'
  | 'senescence'
  | 'unknown';

export type NutritionOption = 'A' | 'B' | 'C';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface IndexTimePoint {
  date: string;
  value: number;
  outlier?: boolean;
  interpolated?: boolean;
}

export interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  precip: number;
  et0: number;
}

export interface MonthlyWeatherAggregate {
  month: string;
  precipitation_total: number;
  gdd_total: number;
}

export interface SpectralPercentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
  std: number;
}

export interface PhenologyDates {
  dormancy_exit: string;
  peak: string;
  plateau_start: string;
  decline_start: string;
  dormancy_entry: string;
}

export interface AnomalyRecord {
  date: string;
  anomaly_type: string;
  severity: SeverityLevel;
  index_name: string;
  value: number | null;
  previous_value: number | null;
  deviation: number | null;
  weather_reference?: string | null;
  excluded_from_reference: boolean;
}

export interface YieldPotential {
  minimum: number;
  maximum: number;
  method: string;
  reference_bracket: string;
  historical_average?: number | null;
}

export interface ZoneSummary {
  class_name: 'A' | 'B' | 'C' | 'D' | 'E';
  surface_percent: number;
}

export interface ZoneClassification {
  zones_geojson: FeatureCollection;
  zone_summary: ZoneSummary[];
  spatial_pattern_type: string;
}

export interface HealthScore {
  total: number;
  components: {
    vigor: number;
    temporal_stability: number;
    stability: number;
    hydric: number;
    nutritional: number;
    [key: string]: number;
  };
}

export interface ConfidenceComponent {
  score: number;
  max_score: number;
}

export interface ConfidenceScore {
  total_score: number;
  normalized_score: number;
  components: Record<string, ConfidenceComponent>;
}

export interface ExtremeEvent {
  date: string;
  event_type: string;
  severity: SeverityLevel;
}

export interface Step1Output {
  index_time_series: Record<string, IndexTimePoint[]>;
  cloud_coverage_mean: number;
  filtered_image_count: number;
  outlier_count: number;
  interpolated_dates: string[];
  raster_paths: Record<string, string[]>;
}

export interface Step2Output {
  daily_weather: WeatherDay[];
  monthly_aggregates: MonthlyWeatherAggregate[];
  cumulative_gdd: Record<string, number>;
  chill_hours: number;
  extreme_events: ExtremeEvent[];
}

export interface Step3Output {
  global_percentiles: Record<string, SpectralPercentiles>;
  phenology_period_percentiles: Record<string, Record<string, SpectralPercentiles>>;
}

export interface Step4Output {
  mean_dates: PhenologyDates;
  inter_annual_variability_days: Record<string, number>;
  gdd_correlation: Record<string, number>;
}

export interface Step5Output {
  anomalies: AnomalyRecord[];
}

export interface Step6Output {
  yield_potential: YieldPotential;
  alternance?: {
    detected: boolean;
    current_year_type: 'on' | 'off' | null;
    confidence: number;
    yearly_means: Record<number, number>;
  } | null;
}

export type Step7Output = ZoneClassification;

export interface Step8Output {
  health_score: HealthScore;
}

export interface Recommendation {
  type: string;
  severity: string;
  message: string;
  component: string | null;
}

export interface NutritionOptionSuggestion {
  suggested_option: NutritionOption;
  rationale: Record<string, unknown>;
  alternatives: Array<{
    option: NutritionOption;
    eligible: boolean;
    reason: string;
  }>;
}

export interface CalibrationReport {
  executive: Record<string, unknown>;
  detailed_metrics: Record<string, unknown>;
  anomalies: AnomalyRecord[];
  recommendations_context: Record<string, unknown>;
}

export interface CalibrationMetadata {
  version: string;
  generated_at: string;
  data_quality_flags: string[];
}

export interface CalibrationV2Output {
  parcel_id: string;
  phase_age: CalibrationMaturityPhase;
  nutrition_option_suggestion?: NutritionOption | null;
  step1: Step1Output;
  step2: Step2Output;
  step3: Step3Output;
  step4: Step4Output;
  step5: Step5Output;
  step6: Step6Output;
  step7: Step7Output;
  step8: Step8Output;
  recommendations?: Array<{ type: string; severity: string; message: string; component: string | null }>;
  confidence: ConfidenceScore;
  metadata: CalibrationMetadata;
}

const typeContractExample = {
  parcel_id: 'parcel-id',
  phase_age: 'pleine_production',
  nutrition_option_suggestion: 'A',
  step1: {
    index_time_series: { NDVI: [{ date: '2025-01-01', value: 0.61 }] },
    cloud_coverage_mean: 12,
    filtered_image_count: 3,
    outlier_count: 0,
    interpolated_dates: [],
    raster_paths: { NDVI: ['calibration-rasters/org/parcel/date/ndvi.tif'] },
  },
  step2: {
    daily_weather: [{ date: '2025-01-01', temp_min: 8, temp_max: 20, precip: 1.2, et0: 1.5 }],
    monthly_aggregates: [{ month: '2025-01', precipitation_total: 40, gdd_total: 125 }],
    cumulative_gdd: { '2025-01': 125 },
    chill_hours: 90,
    extreme_events: [{ date: '2025-01-10', event_type: 'late_frost', severity: 'medium' }],
  },
  step3: {
    global_percentiles: {
      NDVI: { p10: 0.3, p25: 0.4, p50: 0.5, p75: 0.6, p90: 0.7, mean: 0.52, std: 0.08 },
    },
    phenology_period_percentiles: {},
  },
  step4: {
    mean_dates: {
      dormancy_exit: '2025-03-10',
      peak: '2025-06-15',
      plateau_start: '2025-07-01',
      decline_start: '2025-09-01',
      dormancy_entry: '2025-12-10',
    },
    inter_annual_variability_days: { peak: 8 },
    gdd_correlation: { peak: 0.82 },
  },
  step5: {
    anomalies: [
      {
        date: '2025-08-10',
        anomaly_type: 'sudden_drop',
        severity: 'high',
        index_name: 'NDVI',
        value: 0.35,
        previous_value: 0.61,
        deviation: 0.4262,
        weather_reference: 'heatwave',
        excluded_from_reference: true,
      },
    ],
  },
  step6: {
    yield_potential: {
      minimum: 18,
      maximum: 25,
      method: 'reference_and_history',
      reference_bracket: '21-40_ans',
      historical_average: 21.5,
    },
  },
  step7: {
    zones_geojson: {
      type: 'FeatureCollection',
      features: [],
    },
    zone_summary: [{ class_name: 'A', surface_percent: 25 }],
    spatial_pattern_type: 'clustered',
  },
  step8: {
    health_score: {
      total: 78,
      components: {
        vigor: 80,
        temporal_stability: 76,
        stability: 75,
        hydric: 79,
        nutritional: 77,
      },
    },
  },
  recommendations: [
    {
      type: 'heat_management',
      severity: 'medium',
      message: 'Heatwave events recorded. Consider shade nets, increased irrigation frequency, or kaolin spray applications.',
      component: null,
    },
  ],
  confidence: {
    total_score: 84,
    normalized_score: 0.84,
    components: {
      satellite: { score: 30, max_score: 30 },
    },
  },
  metadata: {
    version: 'v2',
    generated_at: '2026-03-13T00:00:00Z',
    data_quality_flags: [],
  },
} satisfies CalibrationV2Output;

void typeContractExample;
import type { FeatureCollection } from 'geojson';
