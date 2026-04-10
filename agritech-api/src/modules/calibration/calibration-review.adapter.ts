import { Injectable, Logger } from "@nestjs/common";
import type {
  CalibrationSnapshotInput,
  CalibrationReviewView,
  BlockASynthese,
  BlockBAnalyse,
  BlockCAnomalies,
  BlockDAmeliorer,
  BlockFAlternance,
  BlockGMetadonnees,
  HealthLabel,
  ConfidenceLevel,
  ConcernSeverity,
  StrengthItem,
  ConcernItem,
  IndexCard,
  CrossDiagnosisCard,
  ZoneSummaryItem,
  TemporalStability,
  AvailableDataItem,
  MissingDataItem,
  AlternanceLabel,
  SeasonBadge,
} from "./dto/calibration-review.dto";

type JsonRecord = Record<string, unknown>;

// Spec §7.2 — health score label thresholds
const HEALTH_LABELS: Array<{ min: number; label: HealthLabel; narrative: string }> = [
  { min: 80, label: "excellent", narrative: "La parcelle est en très bon état général." },
  { min: 60, label: "bon", narrative: "La parcelle est en bon état avec quelques points d'attention." },
  { min: 40, label: "moyen", narrative: "La parcelle présente des faiblesses à investiguer." },
  { min: 20, label: "faible", narrative: "La parcelle montre des signes de stress significatifs." },
  { min: 0, label: "critique", narrative: "La parcelle nécessite une attention urgente." },
];

// Spec §8.2 — confidence level thresholds
const CONFIDENCE_LEVELS: Array<{ min: number; level: ConfidenceLevel; narrative: string }> = [
  { min: 75, level: "eleve", narrative: "Recommandations avec haute confiance" },
  { min: 50, level: "moyen", narrative: "Recommandations actives avec prudence, vérification terrain suggérée" },
  { min: 25, level: "faible", narrative: "Recommandations limitées, nombreuses vérifications requises" },
  { min: 0, level: "minimal", narrative: "Mode observation, pas de recommandations actives" },
];

// Spec §7.4 — prescribed missing data messages and gain points
const MISSING_DATA_CONFIG: Array<{
  type: string;
  label: string;
  gain_points: number;
  message: string;
  check_field: string;
}> = [
  {
    type: "eau",
    label: "Analyse eau",
    gain_points: 23,
    message: "Une analyse eau est essentielle pour le calcul de la fraction de lessivage et la gestion de la salinité.",
    check_field: "water_analysis",
  },
  {
    type: "sol",
    label: "Analyse sol",
    gain_points: 20,
    message: "Une analyse sol permettrait d'ajuster les doses au pH réel et de détecter les blocages.",
    check_field: "soil_analysis",
  },
  {
    type: "foliaire",
    label: "Analyse foliaire",
    gain_points: 15,
    message: "Une analyse foliaire améliorerait le diagnostic nutritionnel.",
    check_field: "foliar_analysis",
  },
  {
    type: "rendements",
    label: "Historique rendements",
    gain_points: 11,
    message: "Les rendements passés permettraient d'affiner le modèle prédictif et de détecter l'alternance.",
    check_field: "harvest_history",
  },
];

// Spec B4 — zone classification colors
const ZONE_COLORS: Record<string, { color: string; label: string }> = {
  A: { color: "#0d6a2e", label: "Zone très vigoureuse" },
  B: { color: "#4caf50", label: "Zone vigoureuse" },
  C: { color: "#ffc107", label: "Zone normale" },
  D: { color: "#ff9800", label: "Zone faible" },
  E: { color: "#e53935", label: "Zone problématique" },
};

// Spec — health component to block mapping for concerns
const COMPONENT_TARGET_BLOCK: Record<string, string> = {
  vigor: "B",
  hydric: "B",
  nutritional: "B",
  temporal_stability: "B",
  stability: "C",
};

// Spec F4 — alternance index thresholds
const ALTERNANCE_THRESHOLDS: Array<{ max: number; label: AlternanceLabel; interpretation: string }> = [
  { max: 0.15, label: "faible", interpretation: "Parcelle régulière, peu d'alternance observée." },
  { max: 0.25, label: "moderee", interpretation: "Léger pattern ON/OFF entre les saisons." },
  { max: 0.35, label: "marquee", interpretation: "Alternance visible, à prendre en compte dans la gestion." },
  { max: Infinity, label: "forte", interpretation: "Alternance sévère, années ON et OFF bien distinctes." },
];

@Injectable()
export class CalibrationReviewAdapter {
  private readonly logger = new Logger(CalibrationReviewAdapter.name);

  transform(input: CalibrationSnapshotInput): CalibrationReviewView {
    this.logger.debug(`Transforming calibration snapshot ${input.calibration_id}`);

    return {
      calibration_id: input.calibration_id,
      parcel_id: input.parcel_id,
      generated_at: input.generated_at,
      planting_year: input.planting_year ?? null,
      status: input.status,
      block_a: this.buildBlockA(input),
      block_b: this.buildBlockB(input),
      block_c: this.buildBlockC(input),
      block_d: this.buildBlockD(input),
      block_f: this.buildBlockF(input),
      block_g: this.buildBlockG(input),
      block_h_enabled: this.isValidationEnabled(input),
      export: {
        available_formats: ["json", "csv", "zip"],
        calibration_id: input.calibration_id,
      },
    };
  }

  // ─── Block A: Synthese executive ────────────────────────────

  private buildBlockA(input: CalibrationSnapshotInput): BlockASynthese {
    const output = this.getOutput(input);
    const step6 = this.getStep(output, "step6");
    const step8 = this.getStep(output, "step8");
    const confidence = this.asRecord(output.confidence);

    // Health score
    const healthScoreObj = this.asRecord(step8.health_score);
    const healthTotal = this.asNumber(healthScoreObj.total, 0);
    const healthMatch = HEALTH_LABELS.find((h) => healthTotal >= h.min) ?? HEALTH_LABELS[HEALTH_LABELS.length - 1];

    // Confidence score
    const confidenceNormalized = this.asNumber(confidence.normalized_score, 0);
    const confidenceMatch = CONFIDENCE_LEVELS.find((c) => confidenceNormalized >= c.min) ?? CONFIDENCE_LEVELS[CONFIDENCE_LEVELS.length - 1];

    // Yield potential
    const yieldPotential = this.asRecord(step6.yield_potential);
    const yieldMin = this.asNumber(yieldPotential.minimum ?? yieldPotential.min, 0);
    const yieldMax = this.asNumber(yieldPotential.maximum ?? yieldPotential.max, 0);
    const hasYield = yieldMin > 0 || yieldMax > 0;
    const wideRange = hasYield && yieldMax > 2.5 * yieldMin;

    // Strengths and concerns from health components
    const healthComponents = this.asRecord(healthScoreObj.components);
    const { strengths, concerns } = this.deriveStrengthsAndConcerns(healthComponents, confidenceNormalized);

    return {
      health_score: Math.round(healthTotal),
      health_label: healthMatch.label,
      health_narrative: healthMatch.narrative,
      confidence_score: Math.round(confidenceNormalized),
      confidence_level: confidenceMatch.level,
      confidence_narrative: confidenceMatch.narrative,
      yield_range: hasYield
        ? {
            min: Math.round(yieldMin * 10) / 10,
            max: Math.round(yieldMax * 10) / 10,
            unit: "t/ha",
            wide_range_warning: wideRange,
          }
        : null,
      strengths,
      concerns,
    };
  }

  private deriveStrengthsAndConcerns(
    healthComponents: JsonRecord,
    confidenceScore: number,
  ): { strengths: StrengthItem[]; concerns: ConcernItem[] } {
    const strengths: StrengthItem[] = [];
    const concerns: ConcernItem[] = [];

    const componentLabels: Record<string, { name: string; strengthPhrase: string; concernPhrase: string }> = {
      vigor: {
        name: "Vigueur végétative",
        strengthPhrase: "Bonne vigueur végétative observée.",
        concernPhrase: "Vigueur végétative en retrait.",
      },
      hydric: {
        name: "État hydrique",
        strengthPhrase: "État hydrique satisfaisant.",
        concernPhrase: "Stress hydrique détecté.",
      },
      nutritional: {
        name: "État nutritionnel",
        strengthPhrase: "Nutrition équilibrée.",
        concernPhrase: "Signes de carence nutritionnelle.",
      },
      temporal_stability: {
        name: "Stabilité temporelle",
        strengthPhrase: "Comportement régulier dans le temps.",
        concernPhrase: "Variations temporelles importantes.",
      },
      stability: {
        name: "Homogénéité spatiale",
        strengthPhrase: "Parcelle homogène.",
        concernPhrase: "Hétérogénéité spatiale significative.",
      },
    };

    for (const [key, meta] of Object.entries(componentLabels)) {
      const value = this.asNumber(healthComponents[key], -1);
      if (value < 0) continue;

      // Spec: strength if component > P75 (≈75), concern if < P25 (≈25), critical if < P10 (≈10)
      if (value >= 75 && strengths.length < 3) {
        strengths.push({ component: meta.name, phrase: meta.strengthPhrase });
      } else if (value < 25 && concerns.length < 3) {
        const severity: ConcernSeverity = value < 10 ? "critique" : "vigilance";
        concerns.push({
          component: meta.name,
          phrase: meta.concernPhrase,
          severity,
          target_block: COMPONENT_TARGET_BLOCK[key] ?? "B",
        });
      }
    }

    // Add confidence concern if low
    if (confidenceScore < 50 && concerns.length < 3) {
      concerns.push({
        component: "Confiance",
        phrase: "Score de confiance insuffisant — complétez vos données.",
        severity: confidenceScore < 25 ? "critique" : "vigilance",
        target_block: "D",
      });
    }

    return { strengths, concerns };
  }

  // ─── Block B: Analyse detaillee ────────────────────────────

  private buildBlockB(input: CalibrationSnapshotInput): BlockBAnalyse {
    const output = this.getOutput(input);
    const step1 = this.getStep(output, "step1");
    const step3 = this.getStep(output, "step3");
    const step4 = this.getStep(output, "step4");
    const step7 = this.getStep(output, "step7");
    const inputs = this.asRecord(input.inputs);

    const percentiles = this.asRecord(step3.global_percentiles);

    const step5 = this.getStep(output, "step5");

    return {
      vigor: this.buildVigorCard(percentiles),
      hydric: this.buildHydricCard(percentiles, inputs),
      nutritional: this.buildNutritionalCard(percentiles, inputs),
      spectral: this.buildSpectralData(step1, step3, step4, step5),
      heatmap: this.buildHeatmap(step7, step1),
      spatial_patterns: this.buildSpatialPatterns(step7),
      heterogeneity_flag: this.checkHeterogeneity(step7),
      temporal_stability: this.buildTemporalStability(step4),
      history_depth: this.buildHistoryDepth(step1),
    };
  }

  private buildVigorCard(percentiles: JsonRecord): IndexCard {
    const nirv = this.asRecord(percentiles.NIRv);
    const p50 = this.asNumber(nirv.p50, 0);
    const p10 = this.asNumber(nirv.p10, 0);
    const p90 = this.asNumber(nirv.p90, 0);
    const range = p90 - p10;
    const position = range > 0 ? Math.round(((p50 - p10) / range) * 100) : 50;

    let color = "#ffc107";
    if (position >= 75) color = "#0d6a2e";
    else if (position >= 50) color = "#4caf50";
    else if (position < 25) color = "#e53935";

    const posLabel = `P${position}`;

    return {
      indice: "NIRv",
      valeur_mediane: Math.round(p50 * 10000) / 10000,
      position_referentiel: posLabel,
      gauge: { min: 0, max: 100, value: position, color },
      phrase: `NIRv médian au ${posLabel} du référentiel : ${position >= 50 ? "conforme" : "en retrait par rapport"} à l'âge et la variété.`,
    };
  }

  private buildHydricCard(percentiles: JsonRecord, inputs: JsonRecord): CrossDiagnosisCard {
    const ndmi = this.asRecord(percentiles.NDMI);
    const p50 = this.asNumber(ndmi.p50, 0);
    const p25 = this.asNumber(ndmi.p25, 0);

    const sources: string[] = ["NDMI satellite"];
    let diagnosis: string;

    const irrigationData = this.asRecord(inputs.irrigation);
    const hasIrrigation = !!irrigationData.frequency || !!irrigationData.volume;
    if (hasIrrigation) sources.push("Données irrigation");

    if (p50 < p25 && !hasIrrigation) {
      diagnosis = "Diagnostic partiel : ajoutez les données d'irrigation pour un diagnostic complet";
    } else if (p50 < p25 && hasIrrigation) {
      diagnosis = "Stress hydrique malgré irrigation adéquate — vérifier le sol et les pertes";
    } else {
      diagnosis = "État hydrique satisfaisant";
    }

    return {
      indice: "NDMI",
      valeur_mediane: Math.round(p50 * 10000) / 10000,
      cross_diagnosis_text: diagnosis,
      sources_used: sources,
    };
  }

  private buildNutritionalCard(percentiles: JsonRecord, inputs: JsonRecord): CrossDiagnosisCard {
    const ndre = this.asRecord(percentiles.NDRE);
    const p50 = this.asNumber(ndre.p50, 0);
    const p25 = this.asNumber(ndre.p25, 0);

    const sources: string[] = ["NDRE satellite"];
    let diagnosis: string;

    const foliarData = this.asRecord(inputs.foliar_analysis);
    const hasFoliar = Object.keys(foliarData).length > 0;
    if (hasFoliar) sources.push("Analyse foliaire");

    const soilData = this.asRecord(inputs.soil_analysis);
    const hasSoilpH = this.asNumber(soilData.pH, 0) > 0;
    if (hasSoilpH) sources.push("pH sol");

    if (p50 < p25 && hasFoliar) {
      diagnosis = "Carences confirmées par l'analyse foliaire.";
    } else if (p50 < p25 && !hasFoliar) {
      diagnosis = "Diagnostic limité — ajoutez une analyse foliaire pour confirmer";
    } else if (p50 >= p25 && hasSoilpH) {
      const pH = this.asNumber(soilData.pH, 7);
      if (pH < 5.5 || pH > 8.5) {
        diagnosis = "Visuellement satisfaisant mais pH sol défavorable — blocages possibles";
      } else {
        diagnosis = "Satisfaisant selon NDRE et pH sol favorable.";
      }
    } else {
      diagnosis = "Satisfaisant selon NDRE — à confirmer par analyse foliaire";
    }

    return {
      indice: "NDRE",
      valeur_mediane: Math.round(p50 * 10000) / 10000,
      cross_diagnosis_text: diagnosis,
      sources_used: sources,
    };
  }

  private buildSpectralData(
    step1: JsonRecord,
    step3: JsonRecord,
    step4: JsonRecord,
    step5: JsonRecord,
  ): BlockBAnalyse["spectral"] {
    const indexSeries = this.asRecord(step1.index_time_series);
    const globalPercentiles = this.asRecord(step3.global_percentiles);
    const meanDates = this.asRecord(step4.mean_dates);

    // Build indices map
    const indices: Record<string, Array<{ date: string; value: number; outlier: boolean }>> = {};
    for (const [name, series] of Object.entries(indexSeries)) {
      if (!Array.isArray(series)) continue;
      indices[name] = series.map((p: unknown) => {
        const rec = this.asRecord(p);
        return {
          date: this.asString(rec.date) ?? "",
          value: this.asNumber(rec.value, 0),
          outlier: this.asBoolean(rec.outlier, false),
        };
      });
    }

    // Build percentile bands
    const percentiles: Record<string, { p10: number; p25: number; p50: number; p75: number; p90: number }> = {};
    for (const [name, raw] of Object.entries(globalPercentiles)) {
      const rec = this.asRecord(raw);
      percentiles[name] = {
        p10: this.asNumber(rec.p10, 0),
        p25: this.asNumber(rec.p25, 0),
        p50: this.asNumber(rec.p50, 0),
        p75: this.asNumber(rec.p75, 0),
        p90: this.asNumber(rec.p90, 0),
      };
    }

    // Build phenology phases
    const phaseOrder = ["dormancy_exit", "peak", "plateau_start", "decline_start", "dormancy_entry"];
    const phaseLabels: Record<string, string> = {
      dormancy_exit: "Débourrement",
      peak: "Floraison",
      plateau_start: "Nouaison",
      decline_start: "Stress estival",
      dormancy_entry: "Récolte",
    };
    const phenologyPhases = phaseOrder.map((key, i) => ({
      name: phaseLabels[key] ?? key,
      start_date: this.asString(meanDates[key]) ?? "",
      end_date: i < phaseOrder.length - 1 ? this.asString(meanDates[phaseOrder[i + 1]]) ?? null : null,
    })).filter((p) => p.start_date);

    // Build excluded periods from anomalies
    const anomalyIconLabels: Record<string, string> = {
      frost: "Gel", heatwave: "Canicule", drought: "Sécheresse",
      hail: "Grêle", wind: "Chergui", sudden_drop: "Chute",
    };
    const excludedPeriods = this.asArray(step5.anomalies).map((a) => {
      const rec = this.asRecord(a);
      const type = this.asString(rec.anomaly_type) ?? "anomaly";
      return {
        date: this.asString(rec.date) ?? "",
        type,
        label: `Exclu — ${anomalyIconLabels[type] ?? type}`,
      };
    });

    return { indices, percentiles, phenology_phases: phenologyPhases, excluded_periods: excludedPeriods };
  }

  private buildSpatialPatterns(step7: JsonRecord): BlockBAnalyse["spatial_patterns"] {
    const patternType = this.asString(step7.spatial_pattern_type);
    if (!patternType || patternType === "uniform") return null;

    const patternMessages: Record<string, string> = {
      clustered: "Pattern détecté : taches localisées, problème focal probable (sol, maladie ou arbres morts).",
      gradient: "Pattern détecté : gradient, possible problème de pente ou drainage.",
      linear: "Pattern détecté : lignes régulières, problème d'irrigation (rampe défaillante ou colmatage).",
      mixed: "Pattern détecté : hétérogénéité mixte.",
    };

    return {
      detected: true,
      confidence: 0.8,
      message: patternMessages[patternType] ?? `Pattern détecté : ${patternType}`,
    };
  }

  private buildHeatmap(step7: JsonRecord, step1: JsonRecord): BlockBAnalyse["heatmap"] {
    const zoneSummary = this.asArray(step7.zone_summary);
    const zonesGeojson = step7.zones_geojson && typeof step7.zones_geojson === "object"
      ? (step7.zones_geojson as Record<string, unknown>)
      : null;

    // Check EVI availability in July 10 - Aug 30 window
    const eviSeries = this.asArray(this.asRecord(step1.index_time_series).EVI);
    const hasValidSummerImage = eviSeries.some((point) => {
      const d = this.asString(this.asRecord(point).date);
      if (!d) return false;
      const month = new Date(d).getMonth();
      const day = new Date(d).getDate();
      return (month === 6 && day >= 10) || (month === 7 && day <= 30);
    });

    if (!hasValidSummerImage && zoneSummary.length === 0 && !zonesGeojson) {
      return {
        available: false,
        zone_summary: [],
        zones_geojson: null,
        date_image: null,
        blocked_message: "Disponible après le premier été",
      };
    }

    const zones: ZoneSummaryItem[] = zoneSummary.map((z) => {
      const record = this.asRecord(z);
      const className = this.asString(record.class_name) ?? this.asString(record.zone) ?? "C";
      const info = ZONE_COLORS[className] ?? ZONE_COLORS.C;
      return {
        class_name: className,
        label: info.label,
        percent: this.asNumber(record.surface_percent ?? record.percent, 0),
        color: info.color,
      };
    });

    const summerDates = eviSeries
      .map((p) => this.asString(this.asRecord(p).date))
      .filter((d): d is string => {
        if (!d) return false;
        const dt = new Date(d);
        const m = dt.getMonth();
        const day = dt.getDate();
        return (m === 6 && day >= 10) || (m === 7 && day <= 30);
      });

    return {
      available: true,
      zone_summary: zones,
      zones_geojson: zonesGeojson,
      date_image: summerDates[summerDates.length - 1] ?? null,
      blocked_message: null,
    };
  }

  private checkHeterogeneity(step7: JsonRecord): boolean {
    const zoneSummary = this.asArray(step7.zone_summary);
    let dePercent = 0;
    for (const z of zoneSummary) {
      const record = this.asRecord(z);
      const className = this.asString(record.class_name) ?? this.asString(record.zone) ?? "";
      if (className === "D" || className === "E") {
        dePercent += this.asNumber(record.surface_percent ?? record.percent, 0);
      }
    }
    return dePercent > 20;
  }

  private buildTemporalStability(step4: JsonRecord): TemporalStability {
    const variability = this.asRecord(step4.inter_annual_variability_days ?? step4.inter_annual_variability);
    const values = Object.values(variability)
      .map((v) => this.asNumber(v, 0))
      .filter((v) => v > 0);

    const avgVariance = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;

    // Normalize to percentage-like scale (variance in days mapped to %)
    const variancePercent = Math.round(avgVariance);

    let label: TemporalStability["label"];
    let phrase: string;

    if (variancePercent < 10) {
      label = "stable";
      phrase = "Comportement régulier sur l'historique disponible.";
    } else if (variancePercent <= 25) {
      label = "moderee";
      phrase = "Légères variations inter-annuelles, normales pour l'olivier.";
    } else {
      label = "forte";
      phrase = "Variations importantes — alternance marquée ou événements climatiques.";
    }

    return { label, variance_percent: variancePercent, phrase };
  }

  private buildHistoryDepth(step1: JsonRecord): BlockBAnalyse["history_depth"] {
    const indexSeries = this.asRecord(step1.index_time_series);
    const ndviSeries = this.asArray(indexSeries.NDVI);

    if (ndviSeries.length === 0) {
      return { months: 0, date_start: "", date_end: "" };
    }

    const dates = ndviSeries
      .map((p) => this.asString(this.asRecord(p).date))
      .filter((d): d is string => !!d)
      .sort();

    const dateStart = dates[0] ?? "";
    const dateEnd = dates[dates.length - 1] ?? "";

    let months = 0;
    if (dateStart && dateEnd) {
      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }

    return { months, date_start: dateStart, date_end: dateEnd };
  }

  // ─── Block C: Anomalies et ruptures (Phase 2 — minimal) ───

  private buildBlockC(input: CalibrationSnapshotInput): BlockCAnomalies | null {
    const output = this.getOutput(input);
    const step5 = this.getStep(output, "step5");
    const anomalies = this.asArray(step5.anomalies);

    if (anomalies.length === 0) return null;

    return {
      anomalies: anomalies.map((item) => {
        const record = this.asRecord(item);
        return {
          period: this.asString(record.date) ?? "",
          type: this.asString(record.anomaly_type) ?? "anomaly",
          icon: this.getAnomalyIcon(this.asString(record.anomaly_type) ?? ""),
          impact: "Exclue du calcul",
          sources: [],
        };
      }),
      ruptures: [],
      total_excluded_percent: 0,
      calibrage_limite: false,
    };
  }

  private getAnomalyIcon(type: string): string {
    const lower = type.toLowerCase();
    if (lower.includes("gel") || lower.includes("frost")) return "frost";
    if (lower.includes("canic") || lower.includes("heat")) return "heatwave";
    if (lower.includes("chergui") || lower.includes("wind")) return "wind";
    if (lower.includes("sech") || lower.includes("drought")) return "drought";
    if (lower.includes("grele") || lower.includes("hail")) return "hail";
    if (lower.includes("pluv") || lower.includes("rain")) return "rain";
    return "anomaly";
  }

  // ─── Block D: Ameliorer la precision ───────────────────────

  private buildBlockD(input: CalibrationSnapshotInput): BlockDAmeliorer {
    const output = this.getOutput(input);
    const confidence = this.asRecord(output.confidence);
    const currentConfidence = Math.round(this.asNumber(confidence.normalized_score, 0));
    const inputs = this.asRecord(input.inputs);

    const available: AvailableDataItem[] = [];
    const missing: MissingDataItem[] = [];

    for (const config of MISSING_DATA_CONFIG) {
      const fieldData = this.asRecord(inputs[config.check_field]);
      const hasData = Object.keys(fieldData).length > 0;

      if (hasData) {
        available.push({ type: config.type, label: config.label });
      } else {
        missing.push({
          type: config.type,
          label: config.label,
          gain_points: config.gain_points,
          message: config.message,
        });
      }
    }

    const totalGain = missing.reduce((sum, m) => sum + m.gain_points, 0);
    const projected = Math.min(100, currentConfidence + totalGain);

    return {
      current_confidence: currentConfidence,
      projected_confidence: projected,
      available_data: available,
      missing_data: missing,
    };
  }

  // ─── Block F: Prevision alternance ─────────────────────────

  private buildBlockF(input: CalibrationSnapshotInput): BlockFAlternance | null {
    const output = this.getOutput(input);
    const step6 = this.getStep(output, "step6");
    const alternance = this.asRecord(step6.alternance);

    const detected = this.asBoolean(alternance.detected, false);
    if (!detected) return null;

    const indice = this.asNumber(alternance.alternance_index ?? alternance.index, 0);
    const altMatch = ALTERNANCE_THRESHOLDS.find((a) => indice < a.max) ?? ALTERNANCE_THRESHOLDS[ALTERNANCE_THRESHOLDS.length - 1];

    const currentYearType = this.asString(alternance.current_year_type);
    let badge: SeasonBadge;
    let badgeColor: string;
    let badgePhrase: string;

    const historyDepth = this.buildHistoryDepth(this.getStep(output, "step1"));
    if (historyDepth.months < 24) {
      badge = "indetermine";
      badgeColor = "#9e9e9e";
      badgePhrase = "Indice non calculable — historique insuffisant.";
    } else if (currentYearType === "off") {
      badge = "on_probable";
      badgeColor = "#1565c0";
      badgePhrase = "Après une année OFF, une forte production est attendue.";
    } else if (currentYearType === "on") {
      badge = "off_probable";
      badgeColor = "#795548";
      badgePhrase = "Après une année ON, un repli est attendu.";
    } else {
      badge = "stable";
      badgeColor = "#ffc107";
      badgePhrase = "Pas de signal d'alternance marqué pour cette saison.";
    }

    // Variety reference from inputs
    const profile = this.asRecord(input.inputs);
    const variety = this.asString(profile.variety) ?? this.asString(this.asRecord(profile.cultural_profile).variety);

    return {
      indice: Math.round(indice * 100) / 100,
      label: altMatch.label,
      interpretation: altMatch.interpretation,
      next_season: {
        badge,
        color: badgeColor,
        phrase: badgePhrase,
      },
      variety_reference: variety
        ? { variety, indice_ref: this.getVarietyReferenceIndex(variety) }
        : null,
    };
  }

  private getVarietyReferenceIndex(variety: string): number {
    const refs: Record<string, number> = {
      "picholine marocaine": 0.35,
      haouzia: 0.22,
      menara: 0.28,
      arbequina: 0.35,
      arbosana: 0.18,
      koroneiki: 0.15,
      picual: 0.30,
    };
    return refs[variety.toLowerCase()] ?? 0.25;
  }

  // ─── Block G: Metadonnees baseline ─────────────────────────

  private buildBlockG(input: CalibrationSnapshotInput): BlockGMetadonnees {
    const date = new Date(input.generated_at);
    const formatted = date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      generated_at_formatted: `Calibrage généré le ${formatted}`,
      calibration_version: "v3",
    };
  }

  // ─── Block H: Validation ───────────────────────────────────

  private isValidationEnabled(input: CalibrationSnapshotInput): boolean {
    return ["awaiting_validation", "calibrated", "completed"].includes(input.status);
  }

  // ─── Utility methods ───────────────────────────────────────

  private getOutput(input: CalibrationSnapshotInput): JsonRecord {
    return this.asRecord(input.output);
  }

  private getStep(output: JsonRecord, stepName: string): JsonRecord {
    const step = this.asRecord(output[stepName]);
    if (Object.keys(step).length > 0) return step;

    // Fallback: baseline_data spreads step7 under the key "zones"
    if (stepName === "step7") return this.asRecord(output.zones);
    // Fallback: baseline_data spreads step3.global_percentiles under "percentiles"
    if (stepName === "step3") {
      const percentiles = output.percentiles;
      if (percentiles && typeof percentiles === "object") {
        return { global_percentiles: percentiles } as JsonRecord;
      }
    }
    // Fallback: baseline_data spreads step4 under "phenology"
    if (stepName === "step4") return this.asRecord(output.phenology);

    return step;
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
