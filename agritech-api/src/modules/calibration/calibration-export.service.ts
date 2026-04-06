import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { DatabaseService } from "../database/database.service";
import {
  CalibrationReviewAdapter,
  CalibrationReviewView,
  CalibrationSnapshotInput,
} from "./calibration-review.adapter";

type JsonObject = Record<string, unknown>;

interface CalibrationExportRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  status: string;
  confidence_score: number | string | null;
  phenology_stage: string | null;
  profile_snapshot: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface CalibrationHistoryRow {
  id: string;
  status: string;
  health_score: number | null;
  confidence_score: number | null;
  phase_age: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CalibrationExportData {
  calibration: {
    id: string;
    parcel_id: string;
    organization_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    confidence_score: number | null;
    phenology_stage: string | null;
  };
  inputs: JsonObject;
  output: JsonObject;
  review: CalibrationReviewView;
}

@Injectable()
export class CalibrationExportService {
  private readonly logger = new Logger(CalibrationExportService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly calibrationReviewAdapter: CalibrationReviewAdapter,
  ) {}

  async getExportData(
    calibrationId: string,
    organizationId: string,
  ): Promise<CalibrationExportData> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, parcel_id, organization_id, status, confidence_score, phenology_stage, profile_snapshot, created_at, updated_at, completed_at",
      )
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch calibration: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Calibration ${calibrationId} not found`);
    }

    const record = data as CalibrationExportRecord;
    const calibrationData = this.toJsonObject(record.profile_snapshot);
    const output = this.toJsonObject(calibrationData.output);

    const { data: historyRows, error: historyError } = await supabase
      .from("calibrations")
      .select("id, status, health_score, confidence_score, phase_age, created_at, completed_at")
      .eq("parcel_id", record.parcel_id)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (historyError) {
      throw new BadRequestException(
        `Failed to fetch calibration history: ${historyError.message}`,
      );
    }

    const history = (historyRows ?? []) as CalibrationHistoryRow[];

    const { data: parcelRow, error: parcelError } = await supabase
      .from("parcels")
      .select("planting_year")
      .eq("id", record.parcel_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (parcelError) {
      this.logger.warn(
        `Failed to fetch parcel planting_year for export review: ${parcelError.message}`,
      );
    }

    const plantingYear =
      parcelRow && typeof (parcelRow as { planting_year?: unknown }).planting_year === "number"
        ? (parcelRow as { planting_year: number }).planting_year
        : null;

    const snapshotInput: CalibrationSnapshotInput = {
      calibration_id: record.id,
      parcel_id: record.parcel_id,
      generated_at: record.completed_at ?? record.updated_at ?? record.created_at,
      output,
      inputs: this.toJsonObject(calibrationData.inputs),
      confidence_score: this.toNumber(record.confidence_score),
      status: record.status,
      parcel_phase:
        record.phenology_stage ??
        (typeof output.phase_age === "string" ? output.phase_age : "unknown"),
      organization_id: record.organization_id,
      planting_year: plantingYear,
      calibration_history: history.map((item) => ({
        id: item.id,
        date: item.completed_at ?? item.created_at,
        health_score: item.health_score,
        confidence_score: item.confidence_score,
        phase_age: item.phase_age ?? "unknown",
        status: item.status,
      })),
    };

    const review = this.calibrationReviewAdapter.transform(snapshotInput);

    return {
      calibration: {
        id: record.id,
        parcel_id: record.parcel_id,
        organization_id: record.organization_id,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
        completed_at: record.completed_at,
        confidence_score: this.toNumber(record.confidence_score),
        phenology_stage: record.phenology_stage,
      },
      inputs: this.toJsonObject(calibrationData.inputs),
      output,
      review,
    };
  }

  generateJsonExport(data: CalibrationExportData) {
    return {
      output: data.output,
      review: data.review,
      meta: {
        calibration_id: data.calibration.id,
        parcel_id: data.calibration.parcel_id,
        organization_id: data.calibration.organization_id,
        status: data.calibration.status,
        generated_at: data.review.generated_at,
      },
    };
  }

  generateCsvExport(data: CalibrationExportData): string {
    const summaryRows: Array<[string, string | number | null]> = [
      ["calibration_id", data.calibration.id],
      ["parcel_id", data.calibration.parcel_id],
      ["organization_id", data.calibration.organization_id],
      ["status", data.calibration.status],
      ["generated_at", data.review.generated_at],
      ["phase", data.review.level1_decision.current_phase.name],
      ["confidence_label", data.review.level1_decision.current_phase.confidence],
      ["confidence_total_score", data.review.level4_temporal.confidence.total_score],
      [
        "confidence_normalized_score",
        data.review.level4_temporal.confidence.normalized_score,
      ],
      ["health_vigor", data.review.level2_diagnostic.health_components.vigor],
      [
        "health_temporal_stability",
        data.review.level2_diagnostic.health_components.temporal_stability,
      ],
      ["health_stability", data.review.level2_diagnostic.health_components.stability],
      ["health_hydric", data.review.level2_diagnostic.health_components.hydric],
      ["health_nutritional", data.review.level2_diagnostic.health_components.nutritional],
      ["detected_signals", data.review.level1_decision.detected_signals.length],
      ["data_quality_flags", data.review.level5_quality_audit.data_quality_flags.length],
    ];

    const header = "metric,value";
    const lines = summaryRows.map(([metric, value]) => {
      return `${this.escapeCsv(metric)},${this.escapeCsv(value === null ? "" : String(value))}`;
    });

    return [header, ...lines].join("\n");
  }

  generateZipExport(data: CalibrationExportData): Readable {
    const outputStream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (error) => {
      outputStream.destroy(error);
    });

    archive.pipe(outputStream);

    // Stable epoch timestamp for deterministic ZIP output
    const epoch = new Date(0);

    const outputStep2 = this.toJsonObject(data.output.step2);
    const outputStep4 = this.toJsonObject(data.output.step4);
    const outputStep5 = this.toJsonObject(data.output.step5);
    const outputStep7 = this.toJsonObject(data.output.step7);

    const manifest = {
      calibration_id: data.calibration.id,
      parcel_id: data.calibration.parcel_id,
      organization_id: data.calibration.organization_id,
      status: data.calibration.status,
      generated_at: data.review.generated_at,
      files: [
        "manifest.json",
        "inputs/calibration_input.json",
        "output.json",
        "review.json",
        "csv/satellite_indices.csv",
        "csv/weather_daily.csv",
        "csv/weather_monthly.csv",
        "csv/extreme_events.csv",
        "csv/anomalies.csv",
        "csv/zones.csv",
        "csv/phenology.csv",
        "csv/gdd_accumulation.csv",
        "quality/excluded_cycles.json",
        "quality/confidence.json",
        "quality/filtering.json",
        "quality/data_quality_flags.json",
        "audit/rules_applied.json",
        "audit/protocol_compliance.json",
      ],
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json", date: epoch });
    archive.append(JSON.stringify(data.inputs, null, 2), { name: "inputs/calibration_input.json", date: epoch });
    archive.append(JSON.stringify(data.output, null, 2), { name: "output.json", date: epoch });
    archive.append(JSON.stringify(data.review, null, 2), { name: "review.json", date: epoch });

    archive.append(this.buildSatelliteIndicesCsv(data.review), { name: "csv/satellite_indices.csv", date: epoch });
    archive.append(this.buildWeatherDailyCsv(this.asArray(outputStep2.daily_weather)), { name: "csv/weather_daily.csv", date: epoch });
    archive.append(this.buildWeatherMonthlyCsv(this.asArray(outputStep2.monthly_aggregates)), { name: "csv/weather_monthly.csv", date: epoch });
    archive.append(this.buildExtremeEventsCsv(this.asArray(outputStep2.extreme_events)), { name: "csv/extreme_events.csv", date: epoch });
    archive.append(this.buildAnomaliesCsv(this.asArray(outputStep5.anomalies)), { name: "csv/anomalies.csv", date: epoch });
    archive.append(this.buildZonesCsv(this.asArray(outputStep7.zone_summary)), { name: "csv/zones.csv", date: epoch });
    archive.append(this.buildPhenologyCsv(outputStep4, data.review), { name: "csv/phenology.csv", date: epoch });
    archive.append(this.buildGddAccumulationCsv(data.review), { name: "csv/gdd_accumulation.csv", date: epoch });

    archive.append(JSON.stringify(data.review.level4_temporal.confidence, null, 2), { name: "quality/confidence.json", date: epoch });
    archive.append(JSON.stringify([], null, 2), { name: "quality/excluded_cycles.json", date: epoch });
    archive.append(JSON.stringify(data.review.level5_quality_audit.filtering, null, 2), { name: "quality/filtering.json", date: epoch });
    archive.append(JSON.stringify(
      {
        data_quality_flags: data.review.level5_quality_audit.data_quality_flags,
        notes: data.review.level5_quality_audit.notes,
      },
      null,
      2,
    ), { name: "quality/data_quality_flags.json", date: epoch });
    archive.append(JSON.stringify(data.review.expert_audit.rules_applied ?? [], null, 2), { name: "audit/rules_applied.json", date: epoch });
    archive.append(JSON.stringify(data.review.expert_audit.protocol_compliance ?? {}, null, 2), { name: "audit/protocol_compliance.json", date: epoch });

    void archive.finalize();
    return outputStream;
  }

  private buildSatelliteIndicesCsv(review: CalibrationReviewView): string {
    const rows = ["date,index,value,outlier"];
    const entries = Object.entries(review.level3_biophysical.indices);

    entries.forEach(([indexName, points]) => {
      if (!Array.isArray(points)) {
        return;
      }

      points.forEach((point) => {
        rows.push(
          [
            this.escapeCsv(point.date),
            this.escapeCsv(indexName),
            this.escapeCsv(String(point.value)),
            this.escapeCsv(String(point.outlier)),
          ].join(","),
        );
      });
    });

    return rows.join("\n");
  }

  private buildWeatherDailyCsv(weatherRows: unknown[]): string {
    const header = ["date", "temp_min", "temp_max", "precip", "et0"];
    const rows = [header.join(",")];

    weatherRows.forEach((row) => {
      const record = this.toJsonObject(row);
      rows.push(
        [
          this.escapeCsv(String(record.date ?? "")),
          this.escapeCsv(String(record.temp_min ?? "")),
          this.escapeCsv(String(record.temp_max ?? "")),
          this.escapeCsv(String(record.precip ?? "")),
          this.escapeCsv(String(record.et0 ?? "")),
        ].join(","),
      );
    });

    return rows.join("\n");
  }

  private buildAnomaliesCsv(anomalies: unknown[]): string {
    const header = [
      "date",
      "anomaly_type",
      "severity",
      "index_name",
      "value",
      "previous_value",
      "deviation",
      "weather_reference",
      "excluded_from_reference",
    ];
    const rows = [header.join(",")];

    anomalies.forEach((anomaly) => {
      const record = this.toJsonObject(anomaly);
      rows.push(
        [
          this.escapeCsv(String(record.date ?? "")),
          this.escapeCsv(String(record.anomaly_type ?? "")),
          this.escapeCsv(String(record.severity ?? "")),
          this.escapeCsv(String(record.index_name ?? "")),
          this.escapeCsv(String(record.value ?? "")),
          this.escapeCsv(String(record.previous_value ?? "")),
          this.escapeCsv(String(record.deviation ?? "")),
          this.escapeCsv(String(record.weather_reference ?? "")),
          this.escapeCsv(String(record.excluded_from_reference ?? "")),
        ].join(","),
      );
    });

    return rows.join("\n");
  }

  private buildZonesCsv(zones: unknown[]): string {
    const header = ["class_name", "surface_percent"];
    const rows = [header.join(",")];

    zones.forEach((zone) => {
      const record = this.toJsonObject(zone);
      rows.push(
        [
          this.escapeCsv(String(record.class_name ?? "")),
          this.escapeCsv(String(record.surface_percent ?? "")),
        ].join(","),
      );
    });

    return rows.join("\n");
  }

  private buildPhenologyCsv(
    step4: JsonObject,
    review: CalibrationReviewView,
  ): string {
    const meanDates = this.toJsonObject(step4.mean_dates);
    const rows = ["metric,value"];

    const data: Array<[string, string]> = [
      ["dormancy_exit", String(meanDates.dormancy_exit ?? "")],
      ["peak", String(meanDates.peak ?? "")],
      ["plateau_start", String(meanDates.plateau_start ?? "")],
      ["decline_start", String(meanDates.decline_start ?? "")],
      ["dormancy_entry", String(meanDates.dormancy_entry ?? "")],
      ["current_phase", review.level1_decision.current_phase.name],
      ["next_phase", review.level1_decision.next_phase.name ?? ""],
    ];

    data.forEach(([metric, value]) => {
      rows.push(`${this.escapeCsv(metric)},${this.escapeCsv(value)}`);
    });

    return rows.join("\n");
  }

  private buildGddAccumulationCsv(review: CalibrationReviewView): string {
    const rows = ["month,gdd_cumulative,base_temperature_used,base_temperature_protocol,chill_hours"];
    const gdd = review.level3_biophysical.gdd;

    Object.entries(gdd.cumulative).forEach(([month, value]) => {
      rows.push(
        [
          this.escapeCsv(month),
          this.escapeCsv(String(value)),
          this.escapeCsv(String(gdd.base_temperature_used)),
          this.escapeCsv(String(gdd.base_temperature_protocol)),
          this.escapeCsv(String(gdd.chill_hours)),
        ].join(","),
      );
    });

    return rows.join("\n");
  }

  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
      return `"${value.replace(/\"/g, '""')}"`;
    }
    return value;
  }

  private toJsonObject(value: unknown): JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as JsonObject)
      : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private buildExtremeEventsCsv(extremeEvents: unknown[]): string {
    const rows = ["date,event_type,severity"];

    extremeEvents.forEach((event) => {
      const record = this.toJsonObject(event);
      rows.push(
        [
          this.escapeCsv(String(record.date ?? "")),
          this.escapeCsv(String(record.event_type ?? "")),
          this.escapeCsv(String(record.severity ?? "")),
        ].join(","),
      );
    });

    return rows.join("\n");
  }

  private buildWeatherMonthlyCsv(aggregates: unknown[]): string {
    const rows = ["month,precipitation_total,gdd_total"];

    aggregates.forEach((aggregate) => {
      const record = this.toJsonObject(aggregate);
      rows.push(
        [
          this.escapeCsv(String(record.month ?? "")),
          this.escapeCsv(String(record.precipitation_total ?? "")),
          this.escapeCsv(String(record.gdd_total ?? "")),
        ].join(","),
      );
    });

    return rows.join("\n");
  }
}
