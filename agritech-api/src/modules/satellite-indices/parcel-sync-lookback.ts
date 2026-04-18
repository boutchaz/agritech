import { getLocalCropReference } from "../calibration/crop-reference-loader";

/**
 * Must stay within FastAPI weather / pipeline limits (~3y). Mirrors calibration.service.
 */
const MAX_LOOKBACK_DAYS = 1090;

/** Defaults when referential is missing or has no phases_maturite_ans (matches DATA_*.json). */
const DEFAULT_JUVENILE_END = 5;
const DEFAULT_PLEINE_START = 10;

function parsePhaseHalfOpenEnd(raw: unknown): number | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const end = Number(raw[1]);
  return Number.isFinite(end) ? end : null;
}

function parsePhaseHalfOpenStart(raw: unknown): number | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const start = Number(raw[0]);
  return Number.isFinite(start) ? start : null;
}

/**
 * First sync start date when there is no satellite_indices_data yet.
 * Uses ``phases_maturite_ans`` from the crop referential (e.g. DATA_OLIVIER.json):
 * - Calendar age in **[0, juvenile_end)** → from Jan 1 of planting year
 * - **[juvenile_end, pleine_start)** → 24 rolling months
 * - **≥ pleine_start** → 36 rolling months
 * Then clamped to MAX_LOOKBACK_DAYS before today.
 */
export function resolveParcelSyncLookbackStartDate(
  plantingYear: number | null | undefined,
  cropType: string | null | undefined,
): string {
  const now = new Date();

  const clampToMaxLookback = (start: Date): Date => {
    const maxStart = new Date();
    maxStart.setDate(maxStart.getDate() - MAX_LOOKBACK_DAYS);
    return start < maxStart ? maxStart : start;
  };

  const toYmd = (d: Date) => d.toISOString().split("T")[0];

  let juvenileEndExclusive = DEFAULT_JUVENILE_END;
  let pleineStartInclusive = DEFAULT_PLEINE_START;

  const ref = cropType ? getLocalCropReference(cropType) : null;
  const phases = ref?.phases_maturite_ans;
  if (phases && typeof phases === "object" && !Array.isArray(phases)) {
    const rec = phases as Record<string, unknown>;
    const jEnd = parsePhaseHalfOpenEnd(rec.juvenile);
    if (jEnd != null) juvenileEndExclusive = jEnd;
    const pStart = parsePhaseHalfOpenStart(rec.pleine_production);
    if (pStart != null) pleineStartInclusive = pStart;
  }

  if (plantingYear == null || plantingYear <= 0) {
    const start = new Date();
    start.setMonth(start.getMonth() - 24);
    return toYmd(clampToMaxLookback(start));
  }

  const parcelAgeYears = now.getFullYear() - plantingYear;

  if (parcelAgeYears < juvenileEndExclusive) {
    const fromPlanting = new Date(`${plantingYear}-01-01`);
    return toYmd(clampToMaxLookback(fromPlanting));
  }

  if (parcelAgeYears < pleineStartInclusive) {
    const start = new Date();
    start.setMonth(start.getMonth() - 24);
    return toYmd(clampToMaxLookback(start));
  }

  const start = new Date();
  start.setMonth(start.getMonth() - 36);
  return toYmd(clampToMaxLookback(start));
}
