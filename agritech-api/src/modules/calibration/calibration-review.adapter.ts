import { Injectable, Logger } from "@nestjs/common";
import type {
  CalibrationReviewView,
  CalibrationSnapshotInput,
  DetectedSignal,
  ExpertAudit,
  ExpertAuditNote,
  ExpertAuditRule,
  IndexTimePoint,
  Level1Decision,
  Level2Diagnostic,
  Level3Biophysical,
  Level4Temporal,
  Level5QualityAudit,
  PhenologyYearStages,
} from "./dto/calibration-review.dto";

export * from "./dto/calibration-review.dto";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class CalibrationReviewAdapter {
  private readonly logger = new Logger(CalibrationReviewAdapter.name);

  transform(input: CalibrationSnapshotInput): CalibrationReviewView {
    this.logger.debug(`Transforming calibration snapshot ${input.calibration_id}`);

    return {
      calibration_id: input.calibration_id,
      parcel_id: input.parcel_id,
      generated_at: input.generated_at,
      schema_version: "calibration-review/v1",
      planting_year: input.planting_year ?? null,
      output: this.asRecord(input.output),
      level1_decision: this.buildLevel1Decision(input),
      level2_diagnostic: this.buildLevel2Diagnostic(input),
      level3_biophysical: this.buildLevel3Biophysical(input),
      level4_temporal: this.buildLevel4Temporal(input),
      level5_quality_audit: this.buildLevel5QualityAudit(input),
      expert_audit: this.buildExpertAudit(input),
      export: {
        available_formats: ["json", "csv", "zip"],
        calibration_id: input.calibration_id,
      },
    };
  }

  buildLevel1Decision(input: CalibrationSnapshotInput): Level1Decision {
    const output = this.getOutput(input);
    const step2 = this.getStep(output, "step2");
    const step4 = this.getStep(output, "step4");
    const step5 = this.getStep(output, "step5");

    const maturityPhase = this.asString(output.phase_age) ?? input.parcel_phase;
    const confidenceLabel = this.mapConfidenceLabel(input.confidence_score);
    const meanDates = this.asRecord(step4.mean_dates);
    const generatedAtTime = Date.parse(input.generated_at);
    const phaseCandidates = [
      "dormancy_exit",
      "peak",
      "plateau_start",
      "decline_start",
      "dormancy_entry",
    ]
      .map((phaseKey) => {
        const dateValue = this.asString(meanDates[phaseKey]);
        const timestamp = dateValue ? Date.parse(dateValue) : Number.NaN;
        return { phaseKey, dateValue, timestamp };
      })
      .filter(({ timestamp }) => Number.isFinite(timestamp) && Number.isFinite(generatedAtTime) && timestamp <= generatedAtTime)
      .sort((a, b) => b.timestamp - a.timestamp);

    const currentPhaseKey = phaseCandidates[0]?.phaseKey ?? null;
    const currentStart = phaseCandidates[0]?.dateValue ?? null;
    const currentPhaseName = currentPhaseKey ? this.formatPhaseName(currentPhaseKey) : "Phase indéterminée";

    const anomalies = this.asArray(step5.anomalies).map((item) => {
      const record = this.asRecord(item);
      return {
        type: this.asString(record.anomaly_type) ?? "anomaly",
        severity: this.mapSeverity(record.severity),
        message: this.asString(record.message) ?? "Anomalie spectrale détectée",
        date: this.asString(record.date) ?? input.generated_at,
        source: "anomaly",
      } as DetectedSignal;
    });

    const extremeEvents = this.asArray(step2.extreme_events).map((item) => {
      const record = this.asRecord(item);
      const eventType = this.asString(record.event_type) ?? "extreme_event";
      return {
        type: eventType,
        severity: this.mapSeverity(record.severity),
        message: this.asString(record.message) ?? `Événement météo extrême: ${eventType}`,
        date: this.asString(record.date) ?? input.generated_at,
        source: "extreme_event",
      } as DetectedSignal;
    });

    return {
      current_phase: {
        name: currentPhaseName,
        method: "heuristic",
        confidence: confidenceLabel,
        date_start: currentStart,
        estimated_date_end: null,
      },
      next_phase: {
        name: this.estimateNextPhase(currentPhaseKey ?? maturityPhase),
        timing_estimate: null,
        condition: `Transition estimée (heuristique) — machine à états protocole non implémentée. Maturité de l'arbre : ${maturityPhase ?? "unknown"}`,
      },
      detected_signals: [...anomalies, ...extremeEvents],
      operational_alerts: null,
    };
  }

  buildLevel2Diagnostic(input: CalibrationSnapshotInput): Level2Diagnostic {
    const output = this.getOutput(input);
    const step6 = this.getStep(output, "step6");
    const step8 = this.getStep(output, "step8");
    const healthScore = this.asRecord(step8.health_score);
    const healthComponents = this.asRecord(healthScore.components);

    const signalClassification = this.asRecord(output.signal_classification);
    const signalState = this.asString(signalClassification?.signal_state) || "NON_DISPONIBLE";
    const signalNote = this.asString(signalClassification?.note) || (
      signalState === "NON_DISPONIBLE"
        ? "Classification du signal non disponible"
        : undefined
    );

    const cyclesAvailable = this.asNumber(signalClassification?.cycles_available, input.calibration_history?.length ?? 0);
    const mode = (this.asString(signalClassification?.mode) ?? (cyclesAvailable < 3 ? "AMORCAGE" : "NORMAL")) as "NORMAL" | "AMORCAGE" | "OBSERVATION";
    const modeDetail =
      mode === "AMORCAGE"
        ? `${cyclesAvailable} cycles disponibles, minimum 3 recommandé`
        : `${cyclesAvailable} cycles disponibles`;

    const currentPhase =
      this.formatPhaseName(this.asString(output.phase_age) ?? input.parcel_phase) || "Phase non disponible";

    const annotations: string[] = [];
    if (mode === "AMORCAGE") {
      annotations.push("Mode observation pure: aucune recommandation d'action en phase calibrage");
    }
    if (signalNote) {
      annotations.push(signalNote);
    }

    return {
      signal_state: signalState as Level2Diagnostic["signal_state"],
      signal_state_note: signalNote,
      mode,
      mode_detail: modeDetail,
      annotations,
      phase_diagnostics: {
        [currentPhase]: {
          status: "estimated",
          detail: "Phase estimée heuristiquement depuis phase_age",
        },
      },
      health_components: {
        vigor: this.asNumber(healthComponents.vigor, 0),
        temporal_stability: this.asNumber(
          healthComponents.temporal_stability,
          this.asNumber(healthComponents.homogeneity, 0),
        ),
        stability: this.asNumber(healthComponents.stability, 0),
        hydric: this.asNumber(healthComponents.hydric, 0),
        nutritional: this.asNumber(healthComponents.nutritional, 0),
      },
      alternance: this.mapAlternance(step6.alternance),
    };
  }

  buildLevel3Biophysical(input: CalibrationSnapshotInput): Level3Biophysical {
    const output = this.getOutput(input);
    const step1 = this.getStep(output, "step1");
    const step2 = this.getStep(output, "step2");
    const step3 = this.getStep(output, "step3");

    const indexSeries = this.asRecord(step1.index_time_series);
    const dailyWeather = this.asArray(step2.daily_weather);

    return {
      indices: {
        NIRv: this.mapIndexSeries(indexSeries.NIRv),
        NIRvP: null,
        NDVI: this.mapIndexSeries(indexSeries.NDVI),
        NDMI: this.mapIndexSeries(indexSeries.NDMI),
        NDRE: this.mapIndexSeries(indexSeries.NDRE),
        EVI: this.mapIndexSeries(indexSeries.EVI),
        GCI: this.mapIndexSeries(indexSeries.GCI),
      },
      gdd: {
        cumulative: this.mapNumericRecord(step2.cumulative_gdd),
        daily: [],
        base_temperature_used: 10.0,
        base_temperature_protocol: 7.5,
        chill_hours: this.asNumber(step2.chill_hours, 0),
      },
      percentiles: this.mapPercentiles(step3.global_percentiles),
    };
  }

  buildLevel4Temporal(input: CalibrationSnapshotInput): Level4Temporal {
    const output = this.getOutput(input);
    const step4 = this.getStep(output, "step4");
    const meanDates = this.asRecord(step4.mean_dates);
    const confidence = this.asRecord(output.confidence);

    return {
      phenology_timeline: {
        dormancy_exit: this.asString(meanDates.dormancy_exit) ?? "",
        peak: this.asString(meanDates.peak) ?? "",
        plateau_start: this.asString(meanDates.plateau_start) ?? "",
        decline_start: this.asString(meanDates.decline_start) ?? "",
        dormancy_entry: this.asString(meanDates.dormancy_entry) ?? "",
        inter_annual_variability: this.mapNumericRecord(
          step4.inter_annual_variability_days ?? step4.inter_annual_variability,
        ),
        yearly_stages: this.mapPhenologyYearlyStages(step4),
      },
      calibration_history: Array.isArray(input.calibration_history)
        ? input.calibration_history.map((item) => ({
            id: item.id,
            date: item.date,
            health_score: item.health_score,
            confidence_score: item.confidence_score,
            phase_age: item.phase_age,
            status: item.status,
          }))
        : [],
      confidence: {
        total_score: this.asNumber(confidence.total_score, 0),
        normalized_score: this.asNumber(confidence.normalized_score, 0),
        components: this.mapConfidenceComponents(confidence.components),
      },
    };
  }

  buildLevel5QualityAudit(input: CalibrationSnapshotInput): Level5QualityAudit {
    const output = this.getOutput(input);
    const step1 = this.getStep(output, "step1");
    const metadata = this.asRecord(output.metadata);

    const indexSeries = this.asRecord(step1.index_time_series);
    const imagesRetained = this.asArray(indexSeries.NDVI).length;
    const imagesRejectedCloud = this.asNumber(step1.filtered_image_count, 0);

    return {
      filtering: {
        total_images_input: imagesRetained + imagesRejectedCloud,
        images_retained: imagesRetained,
        images_rejected_cloud: imagesRejectedCloud,
        average_cloud_coverage: this.asNumber(step1.cloud_coverage_mean, 0),
        outliers_removed: this.asNumber(step1.outlier_count, 0),
        interpolated_dates: this.asArray(step1.interpolated_dates).map((date) => this.asString(date) ?? ""),
      },
      excluded_cycles: [],
      data_quality_flags: this.asArray(metadata.data_quality_flags)
        .map((flag) => this.asString(flag))
        .filter((flag): flag is string => Boolean(flag)),
      notes: [
        "NIRvP non disponible — PAR non extrait dans le pipeline actuel",
        "Classification de signal (Section 2 protocole) non implémentée",
      ],
    };
  }

  buildExpertAudit(input: CalibrationSnapshotInput): ExpertAudit {
    const output = this.getOutput(input);
    const step1 = this.getStep(output, "step1");
    const signalClassification = this.asRecord(output.signal_classification);
    const signalState = this.asString(signalClassification?.signal_state) || "NON_DISPONIBLE";

    const indexSeries = this.asRecord(step1.index_time_series);
    const retained = this.asArray(indexSeries.NDVI).length;
    const rejectedCloud = this.asNumber(step1.filtered_image_count, 0);
    const cloudMean = this.asNumber(step1.cloud_coverage_mean, 0);

    const rulesApplied: ExpertAuditRule[] = [
      {
        rule_id: "REGLE_1_1",
        name: "Masque nuageux",
        status: "partial",
        detail: `Filtrage nuageux partiel appliqué (${retained} images retenues, ${rejectedCloud} rejetées nuage, couverture moyenne ${cloudMean.toFixed(1)}%)`,
      },
      {
        rule_id: "REGLE_1_2",
        name: "Plausibilité temporelle",
        status: "not_implemented",
        detail: "Non implémentée dans le pipeline actuel",
      },
      {
        rule_id: "REGLE_1_5",
        name: "Exclusion cycles extrêmes",
        status: "not_implemented",
        detail: "Aucun cycle exclu automatiquement en Phase 1",
      },
      {
        rule_id: "REGLE_1_6",
        name: "Lissage Whittaker/Savitzky-Golay",
        status: "applied",
        detail: "Savitzky-Golay appliqué (window=7, polyorder=2)",
      },
      {
        rule_id: "REGLE_2_X",
        name: "Classification du signal",
        status: signalState !== "NON_DISPONIBLE" ? "applied" : "not_implemented",
        detail: signalState !== "NON_DISPONIBLE"
          ? `Signal classifié: ${signalState}`
          : "signal_state renvoyé à NON_DISPONIBLE",
      },
      {
        rule_id: "REGLE_3_X",
        name: "Machine à états phénologique",
        status: "not_implemented",
        detail: "Phase actuelle estimée heuristiquement",
      },
      {
        rule_id: "REGLE_4_X",
        name: "Alertes phénologiques",
        status: "not_implemented",
        detail: "operational_alerts est null en Phase 1",
      },
    ];

    const expertNotes: ExpertAuditNote[] = [
      {
        severity: "warning",
        category: "methodology",
        note: "La phase actuelle est estimée heuristiquement depuis les dates phénologiques (step4.mean_dates), pas par la machine à états du protocole.",
      },
      {
        severity: "info",
        category: "reliability",
        note: "Le GDD exposé inclut la base pipeline 10.0°C et la base protocole 7.5°C pour transparence.",
      },
    ];

    return {
      rules_applied: rulesApplied,
      missing_data: [
        {
          field: "NIRvP",
          impact: "Diagnostic biophysique floraison limité",
          workaround: "Utiliser NIRv seul comme proxy",
        },
        {
          field: "signal_state",
          impact: "Niveau diagnostique incomplet",
          workaround: null,
        },
      ],
      expert_notes: expertNotes,
      protocol_compliance: {
        section_1_filtering: "partial",
        section_2_classification: "none",
        section_3_diagnostic: "none",
        section_4_alerts: "none",
        overall: "partial",
      },
    };
  }

  private mapPhenologyYearlyStages(step4: JsonRecord): Record<string, PhenologyYearStages> | undefined {
    const raw = step4.yearly_stages;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return undefined;
    }
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length === 0) {
      return undefined;
    }
    const out: Record<string, PhenologyYearStages> = {};
    for (const [yearKey, val] of entries) {
      const d = this.asRecord(val);
      out[yearKey] = {
        dormancy_exit: this.asString(d.dormancy_exit) ?? "",
        peak: this.asString(d.peak) ?? "",
        plateau_start: this.asString(d.plateau_start) ?? "",
        decline_start: this.asString(d.decline_start) ?? "",
        dormancy_entry: this.asString(d.dormancy_entry) ?? "",
      };
    }
    return out;
  }

  private getOutput(input: CalibrationSnapshotInput): JsonRecord {
    return this.asRecord(input.output);
  }

  private getStep(output: JsonRecord, stepName: string): JsonRecord {
    return this.asRecord(output[stepName]);
  }

  private mapIndexSeries(value: unknown): IndexTimePoint[] {
    return this.asArray(value).map((point) => {
      const record = this.asRecord(point);
      return {
        date: this.asString(record.date) ?? "",
        value: this.asNumber(record.value, 0),
        outlier: this.asBoolean(record.outlier, false),
      };
    });
  }

  private mapPercentiles(value: unknown): Level3Biophysical["percentiles"] {
    const records = this.asRecord(value);
    const mapped: Level3Biophysical["percentiles"] = {};

    Object.entries(records).forEach(([key, raw]) => {
      const set = this.asRecord(raw);
      mapped[key] = {
        p10: this.asNumber(set.p10, 0),
        p25: this.asNumber(set.p25, 0),
        p50: this.asNumber(set.p50, 0),
        p75: this.asNumber(set.p75, 0),
        p90: this.asNumber(set.p90, 0),
        mean: this.asNumber(set.mean, 0),
        std: this.asNumber(set.std, 0),
      };
    });

    return mapped;
  }

  private mapConfidenceComponents(value: unknown): Record<string, { score: number; max_score: number }> {
    const records = this.asRecord(value);
    const mapped: Record<string, { score: number; max_score: number }> = {};

    Object.entries(records).forEach(([key, component]) => {
      const record = this.asRecord(component);
      mapped[key] = {
        score: this.asNumber(record.score, 0),
        max_score: this.asNumber(record.max_score, 0),
      };
    });

    return mapped;
  }

  private mapAlternance(value: unknown): Level2Diagnostic["alternance"] {
    if (!value || typeof value !== "object") {
      return null;
    }

    const alternance = this.asRecord(value);
    const currentYearType = this.asString(alternance.current_year_type);

    return {
      detected: this.asBoolean(alternance.detected, false),
      current_year_type: currentYearType === "on" || currentYearType === "off" ? currentYearType : null,
      confidence: this.asNumber(alternance.confidence, 0),
    };
  }

  private mapNumericRecord(value: unknown): Record<string, number> {
    const record = this.asRecord(value);
    const mapped: Record<string, number> = {};

    Object.entries(record).forEach(([key, raw]) => {
      mapped[key] = this.asNumber(raw, 0);
    });

    return mapped;
  }

  private mapSeverity(value: unknown): "low" | "medium" | "high" | "critical" {
    const severity = this.asString(value)?.toLowerCase();
    if (severity === "low" || severity === "medium" || severity === "high" || severity === "critical") {
      return severity;
    }
    return "medium";
  }

  private mapConfidenceLabel(value: number | null): string {
    if (!value || value < 0.4) {
      return "FAIBLE";
    }
    if (value >= 0.75) {
      return "ELEVEE";
    }
    return "MODEREE";
  }

  private formatPhaseName(phase: string | null): string {
    if (!phase) {
      return "Phase estimée indisponible";
    }

    const label = phase
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return `${label} (estimé)`;
  }

  private estimateNextPhase(phase: string | null): string | null {
    if (!phase) {
      return null;
    }

    const sequence = [
      "dormancy",
      "dormancy_exit",
      "flowering",
      "fruit_set",
      "summer_stress",
      "autumn_recovery",
    ];

    const normalized = phase.toLowerCase();
    const index = sequence.findIndex((item) => normalized.includes(item));
    if (index === -1 || index === sequence.length - 1) {
      return null;
    }

    return this.formatPhaseName(sequence[index + 1]);
  }

  private pickPhaseStartDate(phase: string | null, meanDates: JsonRecord): string | null {
    if (!phase) {
      return null;
    }

    const normalized = phase.toLowerCase();
    if (normalized.includes("dormancy_exit")) {
      return this.asString(meanDates.dormancy_exit) ?? null;
    }
    if (normalized.includes("peak") || normalized.includes("flower")) {
      return this.asString(meanDates.peak) ?? null;
    }
    if (normalized.includes("plateau") || normalized.includes("fruit")) {
      return this.asString(meanDates.plateau_start) ?? null;
    }
    if (normalized.includes("decline") || normalized.includes("stress")) {
      return this.asString(meanDates.decline_start) ?? null;
    }
    if (normalized.includes("dormancy_entry") || normalized.includes("dormancy")) {
      return this.asString(meanDates.dormancy_entry) ?? null;
    }
    return null;
  }

  private asRecord(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
  }

  private asNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  private asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
  }
}
