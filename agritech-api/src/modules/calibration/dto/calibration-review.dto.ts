/**
 * Calibration Review DTO — Blocks A through H
 *
 * Restructures the flat CalibrationOutput (step1-8) into the spec-defined
 * post-calibration screen layout described in "output calibrage.docx" (2026-04-09).
 *
 * Built by CalibrationReviewAdapter on top of CalibrationSnapshotInput.
 */

// ──────────────────────────────────────────────
// Adapter input (snapshot from DB + context)
// ──────────────────────────────────────────────

export interface CalibrationSnapshotInput {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  /** The raw CalibrationOutput (step1-8) from calibration_data.output */
  output: Record<string, unknown>;
  /** The raw CalibrationInput from calibration_data.inputs (if persisted) */
  inputs?: Record<string, unknown>;
  confidence_score: number | null;
  status: string;
  /** Current parcel phase from state machine */
  parcel_phase: string;
  organization_id: string;
  /** From parcels.planting_year — phenology year list filter */
  planting_year?: number | null;
  /** Calibration history for this parcel */
  calibration_history: Array<{
    id: string;
    date: string;
    health_score: number | null;
    confidence_score: number | null;
    phase_age: string;
    status: string;
  }>;
}

// ──────────────────────────────────────────────
// Block A — Synthese executive
// ──────────────────────────────────────────────

export type HealthLabel = "excellent" | "bon" | "moyen" | "faible" | "critique";
export type ConfidenceLevel = "eleve" | "moyen" | "faible" | "minimal";
export type ConcernSeverity = "critique" | "vigilance";

export interface StrengthItem {
  component: string;
  phrase: string;
}

export interface ConcernItem {
  component: string;
  phrase: string;
  severity: ConcernSeverity;
  target_block: string;
}

export interface BlockASynthese {
  health_score: number;
  health_label: HealthLabel;
  health_narrative: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  confidence_narrative: string;
  yield_range: {
    min: number;
    max: number;
    unit: string;
    wide_range_warning: boolean;
  } | null;
  strengths: StrengthItem[];
  concerns: ConcernItem[];
  /** AI-generated narrative summary of the calibration results */
  summary_narrative: string | null;
}

// ──────────────────────────────────────────────
// Block B — Analyse detaillee
// ──────────────────────────────────────────────

export interface GaugeData {
  min: number;
  max: number;
  value: number;
  color: string;
}

export interface IndexCard {
  indice: string;
  valeur_mediane: number;
  position_referentiel: string;
  gauge: GaugeData;
  phrase: string;
}

export interface CrossDiagnosisCard {
  indice: string;
  valeur_mediane: number;
  cross_diagnosis_text: string;
  sources_used: string[];
}

export interface ZoneSummaryItem {
  class_name: string;
  label: string;
  percent: number;
  color: string;
}

export interface IndexTimePoint {
  date: string;
  value: number;
  outlier: boolean;
}

export interface PercentileBand {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SpectralData {
  indices: Record<string, IndexTimePoint[]>;
  percentiles: Record<string, PercentileBand>;
  phenology_phases: Array<{
    name: string;
    start_date: string;
    end_date: string | null;
  }>;
  excluded_periods: Array<{
    date: string;
    type: string;
    label: string;
  }>;
}

export interface HeatmapData {
  available: boolean;
  zone_summary: ZoneSummaryItem[];
  zones_geojson: Record<string, unknown> | null;
  date_image: string | null;
  blocked_message: string | null;
}

export interface SpatialPatterns {
  detected: boolean;
  confidence: number;
  message: string;
}

export interface TemporalStability {
  label: "stable" | "moderee" | "forte";
  variance_percent: number;
  phrase: string;
}

export interface HistoryDepth {
  months: number;
  date_start: string;
  date_end: string;
}

export interface PhenologyDashboardData {
  available: boolean;
  mode: string | null;
  year_range: string | null;
  referential_cycle_used: boolean;
  mean_stages: Array<{
    key: string;
    label: string;
    date: string;
    variability_days: number;
    gdd_correlation: number;
  }>;
  timelines: Array<{
    year: number;
    transitions: Array<{
      phase: string;
      start_date: string;
      end_date: string | null;
      gdd_at_entry: number;
      confidence: string;
    }>;
    mode: string;
  }>;
  yearly_stages: Record<string, Record<string, string>>;
}

export interface BlockBAnalyse {
  vigor: IndexCard;
  hydric: CrossDiagnosisCard;
  nutritional: CrossDiagnosisCard;
  spectral: SpectralData;
  heatmap: HeatmapData;
  spatial_patterns: SpatialPatterns | null;
  heterogeneity_flag: boolean;
  temporal_stability: TemporalStability;
  history_depth: HistoryDepth;
  phenology_dashboard: PhenologyDashboardData | null;
}

// ──────────────────────────────────────────────
// Block C — Anomalies et ruptures (Phase 2)
// ──────────────────────────────────────────────

export interface AnomalyItem {
  period: string;
  type: string;
  icon: string;
  impact: string;
  sources: string[];
}

export interface RuptureItem {
  type: string;
  date: string;
  detail: string;
}

export interface BlockCAnomalies {
  anomalies: AnomalyItem[];
  ruptures: RuptureItem[];
  total_excluded_percent: number;
  calibrage_limite: boolean;
}

// ──────────────────────────────────────────────
// Block D — Ameliorer la precision
// ──────────────────────────────────────────────

export interface AvailableDataItem {
  type: string;
  label: string;
}

export interface MissingDataItem {
  type: string;
  label: string;
  gain_points: number;
  message: string;
}

export interface BlockDAmeliorer {
  current_confidence: number;
  projected_confidence: number;
  available_data: AvailableDataItem[];
  missing_data: MissingDataItem[];
}

// ──────────────────────────────────────────────
// Block F — Prevision alternance (Phase 2)
// ──────────────────────────────────────────────

export type AlternanceLabel = "faible" | "moderee" | "marquee" | "forte";
export type SeasonBadge = "on_probable" | "stable" | "off_probable" | "indetermine";

export interface BlockFAlternance {
  indice: number;
  label: AlternanceLabel;
  interpretation: string;
  next_season: {
    badge: SeasonBadge;
    color: string;
    phrase: string;
  };
  variety_reference: {
    variety: string;
    indice_ref: number;
  } | null;
}

// ──────────────────────────────────────────────
// Block G — Metadonnees baseline
// ──────────────────────────────────────────────

export interface BlockGMetadonnees {
  generated_at_formatted: string;
  calibration_version: string;
}

// ──────────────────────────────────────────────
// Top-level DTO
// ──────────────────────────────────────────────

export interface CalibrationReviewView {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  planting_year: number | null;
  status: string;

  block_a: BlockASynthese;
  block_b: BlockBAnalyse;
  block_c: BlockCAnomalies | null;
  block_d: BlockDAmeliorer;
  block_f: BlockFAlternance | null;
  block_g: BlockGMetadonnees;
  block_h_enabled: boolean;

  export: {
    available_formats: ("json" | "csv" | "zip")[];
    calibration_id: string;
  };
}
