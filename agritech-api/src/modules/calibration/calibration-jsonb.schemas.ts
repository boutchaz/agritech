import { Logger } from '@nestjs/common';
import { z } from 'zod';

/**
 * Single source of truth for the shape of every JSONB blob written to or
 * read from the calibration / annual-plan pipeline. Two bugs this session
 * ("calibration_data" → baseline_data split + maturity_phase → phase_age
 * rename) both failed silently because nothing validated the JSONB shape
 * at the boundary — readers just defensively poked at whatever came back.
 *
 * Convention:
 * - `.passthrough()` on every object so unknown fields survive a round
 *   trip (the V2 engine output blob has ~30 keys, we only formalise the
 *   ones we actively read).
 * - Every numeric field is `.nullable()` because the engine legitimately
 *   emits nulls when data is insufficient.
 * - Writes should go through `serializeJsonb(schema, value)` — throws.
 * - Reads should go through `parseJsonb(schema, raw)` — permissive,
 *   logs + falls back to the default so one malformed row can't take
 *   down a whole report.
 */

const logger = new Logger('CalibrationJsonbSchemas');

const NullableNumber = z.number().nullable().optional();

/**
 * `calibrations.baseline_data` — what
 * CalibrationDataService.extractBaselineData persists.
 */
export const PercentileEntrySchema = z
  .object({
    p10: NullableNumber,
    p25: NullableNumber,
    p50: NullableNumber,
    p75: NullableNumber,
    p90: NullableNumber,
  })
  .passthrough();

export const BaselineDataSchema = z
  .object({
    percentiles: z.record(z.string(), PercentileEntrySchema).nullable().optional(),
    phenology: z.record(z.string(), z.unknown()).nullable().optional(),
    zones: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

export type BaselineData = z.infer<typeof BaselineDataSchema>;

/**
 * `calibrations.diagnostic_data` — the raw `diagnostic_explicatif` block
 * from the V2 engine. Free-form; we only peek at a couple of keys
 * (soil_management_mode, etc.) so the schema is mostly passthrough.
 */
export const DiagnosticDataSchema = z.record(z.string(), z.unknown()).nullable();
export type DiagnosticData = z.infer<typeof DiagnosticDataSchema>;

/**
 * `annual_plans.plan_data` — the AI aggregate persisted by
 * enrichPlanFromAI / enrichPlanDataOnlyFromLatestAIReport.
 */
export const AnnualDosesSchema = z
  .object({
    N_kg_ha: NullableNumber,
    P2O5_kg_ha: NullableNumber,
    K2O_kg_ha: NullableNumber,
    MgO_kg_ha: NullableNumber,
    calculationDetails: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

export const HarvestForecastSchema = z
  .object({
    harvestWindow: z
      .object({ start: z.string().optional(), end: z.string().optional() })
      .passthrough()
      .optional(),
    yieldForecast: z
      .object({
        low: NullableNumber,
        central: NullableNumber,
        high: NullableNumber,
      })
      .passthrough()
      .optional(),
    productionTarget: z.string().nullable().optional(),
  })
  .passthrough();

export const EconomicEstimateSchema = z
  .object({
    totalInputCostDhHa: NullableNumber,
    breakdown: z.record(z.string(), z.number()).nullable().optional(),
  })
  .passthrough();

export const PlanDataSchema = z
  .object({
    source: z.literal('ai'),
    generated_at: z.string(),
    ai_version: z.unknown().optional(),
    parameters: z.record(z.string(), z.unknown()).nullable().optional(),
    annualDoses: AnnualDosesSchema.nullable().optional(),
    irrigation: z.record(z.string(), z.unknown()).nullable().optional(),
    pruning: z.record(z.string(), z.unknown()).nullable().optional(),
    harvestForecast: HarvestForecastSchema.nullable().optional(),
    economicEstimate: EconomicEstimateSchema.nullable().optional(),
    planSummary: z.string().nullable().optional(),
  })
  .passthrough();

export type PlanData = z.infer<typeof PlanDataSchema>;

/**
 * Permissive parse. Returns the parsed value or `fallback` on failure
 * (and logs a warning with context). Use on every JSONB read so a
 * single bad row can't take out a report, but the breakage is visible
 * in logs and can be traced back to the column + id.
 */
export function parseJsonb<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  context: string,
  fallback: T | null = null,
): T | null {
  if (raw == null) return fallback;
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn(
    `parseJsonb failed for ${context}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
  );
  return fallback;
}

/**
 * Strict serialize for writes. Throws if the value doesn't match the
 * schema so we never persist JSONB with drifted keys or bad types.
 */
export function serializeJsonb<T>(schema: z.ZodType<T>, value: T, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `serializeJsonb failed for ${context}: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  return result.data;
}

/**
 * Adapter: the ai-reports readers were built against the pre-split V2
 * engine output blob (`calibration_data.output` with `step3`, `step4`,
 * `step7` etc.). The split moved those into baseline_data with flatter
 * keys. Rebuild the legacy shape from a typed BaselineData so we don't
 * have to rewrite ~20 extract* helpers right away.
 */
export function baselineToLegacyOutput(baseline: BaselineData | null): Record<string, unknown> {
  if (!baseline) return {};
  return {
    step3: {
      global_percentiles: baseline.percentiles ?? {},
    },
    step4: baseline.phenology ?? null,
    step7: baseline.zones ?? null,
    // Carry through anything the engine wrote alongside the three
    // canonical fields so passthrough-aware readers still see it.
    ...Object.fromEntries(
      Object.entries(baseline).filter(
        ([key]) => key !== 'percentiles' && key !== 'phenology' && key !== 'zones',
      ),
    ),
  };
}
