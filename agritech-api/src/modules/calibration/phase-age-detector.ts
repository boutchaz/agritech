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

interface SystemeThresholds {
  entree_production_annee?: number[] | [number, number];
  pleine_production_annee?: number[] | [number, number];
  duree_vie_economique_ans?: number[] | [number, number];
}

const DEFAULTS: Required<{
  entree_production_annee: [number, number];
  pleine_production_annee: [number, number];
  duree_vie_economique_ans: [number, number];
}> = {
  entree_production_annee: [5, 7],
  pleine_production_annee: [10, 15],
  duree_vie_economique_ans: [60, 100],
};

function getThreshold(
  value: number[] | [number, number] | undefined,
  fallback: [number, number],
): number {
  if (Array.isArray(value) && value.length >= 1 && typeof value[0] === 'number') {
    return value[0];
  }
  return fallback[0];
}

export function detectPhaseAge(
  ageAns: number,
  systeme: SystemeThresholds | Record<string, unknown>,
): PhaseAge {
  const s = systeme as SystemeThresholds;

  const entreeStart = getThreshold(s.entree_production_annee, DEFAULTS.entree_production_annee);
  const pleineStart = getThreshold(s.pleine_production_annee, DEFAULTS.pleine_production_annee);
  const vieStart = getThreshold(s.duree_vie_economique_ans, DEFAULTS.duree_vie_economique_ans);

  if (ageAns < entreeStart) return 'juvenile';
  if (ageAns < pleineStart) return 'entree_production';
  if (ageAns < vieStart) return 'pleine_production';
  return 'senescence';
}

/**
 * Resolve phase_age from referentiel for a given parcel.
 */
export function detectPhaseAgeFromReferentiel(
  ageAns: number,
  system: string,
  referentiel: Record<string, unknown>,
): PhaseAge {
  const systemes = referentiel.systemes as Record<string, SystemeThresholds> | undefined;
  const systemeData = systemes?.[system] ?? {};
  return detectPhaseAge(ageAns, systemeData);
}
