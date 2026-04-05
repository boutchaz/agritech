// Calibration Types for Mobile App
// Adapted from web: project/src/types/calibration-output.ts

export type CalibrationMaturityPhase =
  | 'juvenile'
  | 'entree_production'
  | 'pleine_production'
  | 'maturite_avancee'
  | 'senescence'
  | 'unknown';

export type NutritionOption = 'A' | 'B' | 'C';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type CalibrationPhase =
  | 'disabled'
  | 'pret_calibrage'
  | 'calibrating'
  | 'awaiting_validation'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'paused'
  | 'unknown';

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
  zones_geojson: { type: string; features: unknown[] };
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

export interface CalibrationMetadata {
  version: string;
  generated_at: string;
  data_quality_flags: string[];
}

export interface CalibrationOutput {
  parcel_id: string;
  maturity_phase: CalibrationMaturityPhase;
  nutrition_option_suggestion?: NutritionOption | null;
  step1: Step1Output;
  step2: Step2Output;
  step3: Step3Output;
  step4: Step4Output;
  step5: Step5Output;
  step6: Step6Output;
  step7: Step7Output;
  step8: Step8Output;
  recommendations?: Recommendation[];
  confidence: ConfidenceScore;
  metadata: CalibrationMetadata;
}

// API Response Types
export interface CalibrationStatusRecord {
  id: string;
  parcel_id: string;
  status: 'pending' | 'provisioning' | 'in_progress' | 'completed' | 'failed';
  calibration_version?: string | null;
  confidence_score?: number | null;
}

export interface NutritionSuggestionResponse {
  suggested_option: NutritionOption;
  rationale: Record<string, unknown>;
  alternatives: Array<{
    option: NutritionOption;
    eligible: boolean;
    reason: string;
  }>;
}

export interface NutritionConfirmationResponse {
  calibration_id: string;
  parcel_id: string;
  option: NutritionOption;
  ai_phase: 'active';
}

export interface CalibrationHistoryRecord {
  id: string;
  status: string;
  health_score: number | null;
  confidence_score: number | null;
  maturity_phase: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CalibrationReportResponse {
  calibration: CalibrationStatusRecord;
  report: {
    output?: CalibrationOutput;
    [key: string]: unknown;
  } | null;
}

export interface CalibrationReadinessResponse {
  ready: boolean;
  confidence_preview: number;
  checks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
  improvements: string[];
}

// Annual Recalibration Types
export interface AnnualEligibilityResponse {
  eligible: boolean;
  trigger_reason: 'harvest_completed' | 'date_reached' | 'manual';
  harvest_date?: string;
  days_since_harvest?: number;
}

export interface AnnualMissingTask {
  task_type: string;
  period: string;
  message: string;
  action: 'quick_entry' | 'confirm_not_done' | 'ignore';
}

export interface AnnualNewAnalysesResponse {
  new_soil: boolean;
  new_water: boolean;
  new_foliar: boolean;
}

export interface AnnualCampaignBilanResponse {
  predicted_yield: { min: number; max: number };
  actual_yield: number | null;
  yield_deviation_pct: number | null;
  alternance_status_next: string;
  alerts_summary: Array<{ code: string; count: number }>;
  interventions_planned: number;
  interventions_executed: number;
  health_score_evolution: { start: number; end: number };
}

// Partial Recalibration
export interface PartialRecalibrationDto {
  recalibration_motif: string;
  recalibration_motif_detail?: string;
  updates: Record<string, unknown>;
  impact_preview?: {
    modified_parameters?: Array<{
      path: string;
      label: string;
      oldValue: string;
      newValue: string;
    }>;
    modules_to_recalculate?: string[];
    confidence_preview?: number;
    ai_recommendation?: 'partial' | 'full';
  };
}
