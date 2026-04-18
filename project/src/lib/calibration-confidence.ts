/**
 * Confidence is stored or returned in two shapes:
 * - 0–1 fraction (e.g. pipeline `normalized_score`)
 * - 0–100 integer (`calibrations.confidence_score` from API / Supabase)
 *
 * Never multiply a 0–100 value by 100 for display.
 */
export function confidenceToFraction(score: number | null | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score > 1) {
    return Math.min(1, Math.max(0, score / 100));
  }
  return Math.min(1, Math.max(0, score));
}

export function confidenceValueToPercent(score: number | null | undefined): number | null {
  const frac = confidenceToFraction(score);
  return frac === null ? null : Math.round(frac * 100);
}

export function formatConfidencePercent(
  score: number | null | undefined,
  empty = '—',
): string {
  const pct = confidenceValueToPercent(score);
  return pct === null ? empty : `${pct}%`;
}
