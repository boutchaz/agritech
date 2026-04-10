/**
 * CalibrationBlocksReviewView — Blocks A-H Review DTO (v2)
 *
 * Mirrors the backend CalibrationBlocksReviewView from
 * agritech-api/src/modules/calibration/dto/calibration-blocks-review.dto.ts
 */

// ── Block A — Synthese executive ──

export type HealthLabel = 'excellent' | 'bon' | 'moyen' | 'faible' | 'critique';
export type ConfidenceLevel = 'eleve' | 'moyen' | 'faible' | 'minimal';
export type ConcernSeverity = 'critique' | 'vigilance';

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
}

// ── Block B — Analyse detaillee ──

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

export interface HeatmapData {
  available: boolean;
  zone_summary: ZoneSummaryItem[];
  date_image: string | null;
  blocked_message: string | null;
}

export interface SpatialPatterns {
  detected: boolean;
  confidence: number;
  message: string;
}

export interface TemporalStability {
  label: 'stable' | 'moderee' | 'forte';
  variance_percent: number;
  phrase: string;
}

export interface HistoryDepth {
  months: number;
  date_start: string;
  date_end: string;
}

export interface BlockBAnalyse {
  vigor: IndexCard;
  hydric: CrossDiagnosisCard;
  nutritional: CrossDiagnosisCard;
  heatmap: HeatmapData;
  spatial_patterns: SpatialPatterns | null;
  heterogeneity_flag: boolean;
  temporal_stability: TemporalStability;
  history_depth: HistoryDepth;
}

// ── Block C — Anomalies (Phase 2) ──

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

// ── Block D — Ameliorer la precision ──

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

// ── Block F — Alternance (Phase 2) ──

export type AlternanceLabel = 'faible' | 'moderee' | 'marquee' | 'forte';
export type SeasonBadge = 'on_probable' | 'stable' | 'off_probable' | 'indetermine';

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

// ── Block G — Metadonnees ──

export interface BlockGMetadonnees {
  generated_at_formatted: string;
  calibration_version: string;
}

// ── Top-level ──

export interface CalibrationBlocksReviewView {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  schema_version: 'calibration-review/v2';
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
    available_formats: ('json' | 'csv' | 'zip')[];
    calibration_id: string;
  };
}
