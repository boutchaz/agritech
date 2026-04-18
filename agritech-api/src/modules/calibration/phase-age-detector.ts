/**
 * Phase age detection based on referentiel systeme thresholds.
 *
 * Uses referentiel.systemes[system]:
 *   entree_production_annee: [min, max]
 *   pleine_production_annee: [min, max]
 *   duree_vie_economique_ans: [min, max]
 *
 * Phase mapping:
 *   age < entree_production[0]           → juvenile
 *   entree_production[0] ≤ age < pleine[0] → entree_production
 *   pleine_production[0] ≤ age < vie[0]    → pleine_production
 *   age ≥ vie_economique[0]              → senescence
 */

export type PhaseAge = 'juvenile' | 'entree_production' | 'pleine_production' | 'senescence';

/**
 * Map frontend/DB plantation system names to referentiel keys.
 *
 * DB values: "Traditional", "Intensive", "Super-Intensive (4x2)", "Semi-Intensive"
 * Frontend: "Super intensif", "Intensif", "Semi-intensif", "Traditionnel", etc.
 * Referentiel keys: "traditionnel", "intensif", "super_intensif"
 */
export function normalizeSystemToReferentielKey(system: string): string {
  const s = system.toLowerCase().trim();

  if (s.includes('super')) return 'super_intensif';
  if (s.includes('tradition')) return 'traditionnel';
  if (s.includes('semi')) return 'intensif'; // semi-intensive maps to intensif thresholds
  if (s.includes('intensi')) return 'intensif';

  // Already a referentiel key
  if (['traditionnel', 'intensif', 'super_intensif'].includes(s)) return s;

  return 'intensif'; // safe default
}

export interface SystemeThresholds {
  entree_production_annee?: number[] | [number, number];
  pleine_production_annee?: number[] | [number, number];
  duree_vie_economique_ans?: number[] | [number, number];
}

function getThreshold(
  value: number[] | [number, number] | undefined,
): number | null {
  if (Array.isArray(value) && value.length >= 1 && typeof value[0] === 'number') {
    return value[0];
  }
  return null;
}

/**
 * Extract default thresholds from referentiel systemes.
 * Priority: intensif → traditionnel → first available system.
 */
function resolveDefaults(
  systemes: Record<string, SystemeThresholds> | undefined,
): SystemeThresholds {
  if (!systemes) return {};
  return systemes.intensif ?? systemes.traditionnel ?? Object.values(systemes)[0] ?? {};
}

/**
 * Detect phase age from systeme thresholds.
 * Falls back to defaults from referentiel when thresholds are missing.
 */
export function detectPhaseAge(
  ageAns: number,
  systeme: SystemeThresholds | Record<string, unknown>,
  defaults?: SystemeThresholds,
): PhaseAge {
  const s = systeme as SystemeThresholds;
  const d = defaults ?? {};

  const entreeStart = getThreshold(s.entree_production_annee) ?? getThreshold(d.entree_production_annee);
  const pleineStart = getThreshold(s.pleine_production_annee) ?? getThreshold(d.pleine_production_annee);
  const vieStart = getThreshold(s.duree_vie_economique_ans) ?? getThreshold(d.duree_vie_economique_ans);

  // If still no thresholds (no referentiel at all), assume mid-life
  if (entreeStart == null || pleineStart == null || vieStart == null) {
    return 'pleine_production';
  }

  if (ageAns < entreeStart) return 'juvenile';
  if (ageAns < pleineStart) return 'entree_production';
  if (ageAns < vieStart) return 'pleine_production';
  return 'senescence';
}

/**
 * Resolve phase_age from referentiel for a given parcel.
 * Thresholds come from referentiel.systemes[normalizedSystem],
 * falling back to referentiel defaults (intensif → traditionnel → first).
 */
export function detectPhaseAgeFromReferentiel(
  ageAns: number,
  system: string,
  referentiel: Record<string, unknown>,
): PhaseAge {
  const systemes = referentiel.systemes as Record<string, SystemeThresholds> | undefined;
  const key = normalizeSystemToReferentielKey(system);
  const systemeData = systemes?.[key] ?? {};
  const defaults = resolveDefaults(systemes);
  return detectPhaseAge(ageAns, systemeData, defaults);
}
