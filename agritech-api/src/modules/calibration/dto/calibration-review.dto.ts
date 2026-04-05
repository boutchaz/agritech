/**
 * CalibrationReviewView — 5-Level Review DTO
 *
 * This DTO restructures the flat CalibrationOutput (step1-8) into 5 review levels
 * as specified in docs/docs/specs/calibration-review-export-plan.md (v1.6).
 *
 * It is a PRESENTATION layer built by CalibrationReviewAdapter on top of the
 * immutable CalibrationOutput. It does NOT modify the computation pipeline.
 */

// === Level 1: Décisionnelles (QUE FAIRE) ===

export interface DetectedSignal {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  date: string;
  source: "anomaly" | "extreme_event";
}

export interface OperationalAlert {
  code: string;
  category:
    | "hydrique"
    | "climatique"
    | "nutritionnel"
    | "sanitaire"
    | "phenologique"
    | "structurel";
  severity: string;
  message: string;
  hysteresis: { entry_threshold: string; exit_threshold: string };
}

export interface Level1Decision {
  current_phase: {
    name: string;
    method: "heuristic" | "protocol";
    confidence: string;
    date_start: string | null;
    estimated_date_end: string | null;
  };
  next_phase: {
    name: string | null;
    timing_estimate: string | null;
    condition: string | null;
  };
  detected_signals: DetectedSignal[];
  /** ALWAYS null in Phase 1 — operational alerts (OLI-01 to OLI-18) not yet implemented */
  operational_alerts: OperationalAlert[] | null;
}

// === Level 2: Diagnostiques (POURQUOI) ===

export interface Level2Diagnostic {
  signal_state: "SIGNAL_PUR" | "MIXTE_MODERE" | "DOMINE_ADVENTICES" | "NON_DISPONIBLE";
  signal_state_note?: string;
  mode: "NORMAL" | "AMORCAGE" | "OBSERVATION";
  mode_detail: string;
  annotations: string[];
  phase_diagnostics: Record<
    string,
    { status: "detected" | "estimated" | "not_applicable"; detail: string }
  >;
  health_components: {
    vigor: number;
    temporal_stability: number;
    stability: number;
    hydric: number;
    nutritional: number;
  };
  alternance: {
    detected: boolean;
    current_year_type: "on" | "off" | null;
    confidence: number;
  } | null;
}

// === Level 3: Biophysiques (SUR QUOI JE ME BASE) ===

export interface IndexTimePoint {
  date: string;
  value: number;
  outlier: boolean;
}

export interface Level3Biophysical {
  indices: {
    NIRv: IndexTimePoint[];
    /** null in Phase 1 — PAR not extracted */
    NIRvP: IndexTimePoint[] | null;
    NDVI: IndexTimePoint[];
    NDMI: IndexTimePoint[];
    NDRE: IndexTimePoint[];
    EVI: IndexTimePoint[];
    GCI: IndexTimePoint[];
  };
  gdd: {
    cumulative: Record<string, number>;
    daily: Array<{ date: string; gdd_day: number; tmean: number }>;
    base_temperature_used: number;
    base_temperature_protocol: number;
    chill_hours: number;
  };
  percentiles: Record<
    string,
    {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      mean: number;
      std: number;
    }
  >;
}

// === Level 4: Temporelles (EST-CE FIABLE) ===

export interface Level4Temporal {
  phenology_timeline: {
    dormancy_exit: string;
    peak: string;
    plateau_start: string;
    decline_start: string;
    dormancy_entry: string;
    inter_annual_variability: Record<string, number>;
  };
  calibration_history: Array<{
    id: string;
    date: string;
    health_score: number | null;
    confidence_score: number | null;
    phase_age: string;
    status: string;
  }>;
  confidence: {
    total_score: number;
    normalized_score: number;
    components: Record<string, { score: number; max_score: number }>;
  };
}

// === Level 5: Qualité données (AUDIT) ===

export interface Level5QualityAudit {
  filtering: {
    total_images_input: number;
    images_retained: number;
    images_rejected_cloud: number;
    average_cloud_coverage: number;
    outliers_removed: number;
    interpolated_dates: string[];
  };
  /** Empty in Phase 1 — cycle exclusion not implemented */
  excluded_cycles: string[];
  data_quality_flags: string[];
  notes: string[];
}

// === Expert Audit (Lecture Expert) ===

export interface ExpertAuditRule {
  rule_id: string;
  name: string;
  status: "applied" | "skipped" | "not_implemented" | "partial";
  detail: string;
}

export interface ExpertAuditMissingData {
  field: string;
  impact: string;
  workaround: string | null;
}

export interface ExpertAuditNote {
  severity: "info" | "warning" | "critical";
  category: "methodology" | "data_gap" | "reliability";
  note: string;
}

export interface ExpertAudit {
  rules_applied: ExpertAuditRule[];
  missing_data: ExpertAuditMissingData[];
  expert_notes: ExpertAuditNote[];
  protocol_compliance: {
    section_1_filtering: "partial" | "full" | "none";
    section_2_classification: "none";
    section_3_diagnostic: "none";
    section_4_alerts: "none";
    overall: "partial" | "minimal" | "none";
  };
}

// === Top-level DTO ===

export interface CalibrationReviewView {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  schema_version: "calibration-review/v1";

  /** Raw CalibrationOutput (step1-8) — available for export and expert */
  output: Record<string, unknown>;

  level1_decision: Level1Decision;
  level2_diagnostic: Level2Diagnostic;
  level3_biophysical: Level3Biophysical;
  level4_temporal: Level4Temporal;
  level5_quality_audit: Level5QualityAudit;

  expert_audit: ExpertAudit;

  export: {
    available_formats: ("json" | "csv" | "zip")[];
    calibration_id: string;
  };
}

// === Adapter input (snapshot from DB + context) ===

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
