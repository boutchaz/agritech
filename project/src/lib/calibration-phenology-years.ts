import type { PhenologyDates, Step1Output, Step4Output } from '@/types/calibration-output';

/** Parse ISO / date-only strings in local calendar (avoids UTC off-by-one). */
export function parsePhenologyDateValue(raw: unknown): Date | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, mo - 1, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof raw === 'object' && raw !== null && 'year' in raw && 'month' in raw && 'day' in raw) {
    const o = raw as { year: number; month: number; day: number };
    const dt = new Date(o.year, o.month - 1, o.day);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

/** Calendar years that appear in any index time series (satellite availability). */
export function yearsWithSatelliteData(step1: Step1Output | undefined): Set<number> {
  const years = new Set<number>();
  if (!step1?.index_time_series) return years;
  for (const series of Object.values(step1.index_time_series)) {
    if (!Array.isArray(series)) continue;
    for (const p of series) {
      const y = parseInt(String(p.date).slice(0, 4), 10);
      if (!Number.isNaN(y)) years.add(y);
    }
  }
  return years;
}

/**
 * Cycle years that have yearly phenology stages, intersected with satellite years
 * and (when set) planting_year ≤ y. If planting filters everything out, returns
 * unfiltered stage years so the UI still shows per-year data.
 */
export function eligiblePhenologyYears(
  yearlyStages: Record<string, PhenologyDates> | undefined,
  step1: Step1Output | undefined,
  plantingYear: number | null | undefined,
): number[] {
  if (!yearlyStages || Object.keys(yearlyStages).length === 0) return [];
  const sat = yearsWithSatelliteData(step1);
  const stageYears = Object.keys(yearlyStages)
    .map((k) => parseInt(k, 10))
    .filter((y) => !Number.isNaN(y))
    .sort((a, b) => a - b);
  let withSat =
    sat.size > 0 ? stageYears.filter((y) => sat.has(y)) : [...stageYears];
  if (withSat.length === 0) withSat = [...stageYears];
  const py = plantingYear != null && plantingYear > 0 ? plantingYear : null;
  if (py != null) {
    const withPlant = withSat.filter((y) => y >= py);
    if (withPlant.length > 0) return withPlant;
  }
  return withSat;
}

/** Convenience: read yearly_stages from step4. */
export function eligiblePhenologyYearsFromStep4(
  step4: Step4Output | undefined,
  step1: Step1Output | undefined,
  plantingYear: number | null | undefined,
): number[] {
  return eligiblePhenologyYears(step4?.yearly_stages, step1, plantingYear);
}

export function defaultPhenologyYear(years: number[]): number | null {
  if (years.length === 0) return null;
  return years[years.length - 1];
}
