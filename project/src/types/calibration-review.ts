import type { IndexTimePoint, SeverityLevel } from './calibration-output';

export type OperationalAlertCategory =
  | 'hydrique'
  | 'climatique'
  | 'nutritionnel'
  | 'sanitaire'
  | 'phenologique'
  | 'structurel';

export type ExpertAuditRuleStatus = 'applied' | 'skipped' | 'not_implemented' | 'partial';

export type ExpertAuditNoteSeverity = 'info' | 'warning' | 'critical';

export type ExpertAuditNoteCategory = 'methodology' | 'data_gap' | 'reliability';

export type ProtocolComplianceLevel = 'partial' | 'full' | 'none';

export interface DetectedSignal {
  type: string;
  severity: SeverityLevel;
  message: string;
  date: string;
  source: 'anomaly' | 'extreme_event';
}

export interface OperationalAlert {
  code: string;
  category: OperationalAlertCategory;
  severity: string;
  message: string;
  hysteresis: {
    entry_threshold: string;
    exit_threshold: string;
  };
}

export interface Level1Decision {
  current_phase: {
    name: string;
    method: 'heuristic' | 'protocol';
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
  operational_alerts: OperationalAlert[] | null;
}

export interface Level2Diagnostic {
  signal_state: 'SIGNAL_PUR' | 'MIXTE_MODERE' | 'DOMINE_ADVENTICES' | 'NON_DISPONIBLE';
  signal_state_note?: string;
  mode: 'NORMAL' | 'AMORCAGE' | 'OBSERVATION';
  mode_detail: string;
  annotations: string[];
  phase_diagnostics: Record<
    string,
    {
      status: 'detected' | 'estimated' | 'not_applicable';
      detail: string;
    }
  >;
  health_components: {
    vigor: number;
    temporal_stability: number;
    stability: number;
    hydric: number;
    nutritional: number;
  };
  alternance:
    | {
        detected: boolean;
        current_year_type: 'on' | 'off' | null;
        confidence: number;
      }
    | null;
}

export interface Level3Biophysical {
  indices: {
    NIRv: IndexTimePoint[];
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

export interface Level5QualityAudit {
  filtering: {
    total_images_input: number;
    images_retained: number;
    images_rejected_cloud: number;
    average_cloud_coverage: number;
    outliers_removed: number;
    interpolated_dates: string[];
  };
  excluded_cycles: string[];
  data_quality_flags: string[];
  notes: string[];
}

export interface ExpertAuditRule {
  rule_id: string;
  name: string;
  status: ExpertAuditRuleStatus;
  detail: string;
}

export interface ExpertAuditMissingData {
  field: string;
  impact: string;
  workaround: string | null;
}

export interface ExpertAuditNote {
  severity: ExpertAuditNoteSeverity;
  category: ExpertAuditNoteCategory;
  note: string;
}

export interface ExpertAudit {
  rules_applied: ExpertAuditRule[];
  missing_data: ExpertAuditMissingData[];
  expert_notes: ExpertAuditNote[];
  protocol_compliance: {
    section_1_filtering: ProtocolComplianceLevel;
    section_2_classification: 'none';
    section_3_diagnostic: 'none';
    section_4_alerts: 'none';
    overall: 'partial' | 'minimal' | 'none';
  };
}

export interface CalibrationReviewView {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  schema_version: 'calibration-review/v1';
  output: Record<string, unknown>;
  level1_decision: Level1Decision;
  level2_diagnostic: Level2Diagnostic;
  level3_biophysical: Level3Biophysical;
  level4_temporal: Level4Temporal;
  level5_quality_audit: Level5QualityAudit;
  expert_audit: ExpertAudit;
  export: {
    available_formats: Array<'json' | 'csv' | 'zip'>;
    calibration_id: string;
  };
}

export interface CalibrationSnapshotInput {
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  output: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  confidence_score: number | null;
  status: string;
  parcel_phase: string;
  organization_id: string;
  calibration_history: Array<{
    id: string;
    date: string;
    health_score: number | null;
    confidence_score: number | null;
    phase_age: string;
    status: string;
  }>;
}
