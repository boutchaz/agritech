import { detectPhaseAge, detectPhaseAgeFromReferentiel, normalizeSystemToReferentielKey } from './phase-age-detector';

describe('detectPhaseAge', () => {
  // Olivier intensif thresholds: entree=[4,5], pleine=[7,10], vie=[50,80]
  const olivierIntensifSysteme = {
    entree_production_annee: [4, 5],
    pleine_production_annee: [7, 10],
    duree_vie_economique_ans: [50, 80],
  };

  it('returns juvenile for age < entree_production start', () => {
    expect(detectPhaseAge(2, olivierIntensifSysteme)).toBe('juvenile');
    expect(detectPhaseAge(3, olivierIntensifSysteme)).toBe('juvenile');
  });

  it('returns entree_production for age in [entree_start, pleine_start)', () => {
    expect(detectPhaseAge(4, olivierIntensifSysteme)).toBe('entree_production');
    expect(detectPhaseAge(5, olivierIntensifSysteme)).toBe('entree_production');
    expect(detectPhaseAge(6, olivierIntensifSysteme)).toBe('entree_production');
  });

  it('returns pleine_production for age in [pleine_start, vie_start)', () => {
    expect(detectPhaseAge(7, olivierIntensifSysteme)).toBe('pleine_production');
    expect(detectPhaseAge(15, olivierIntensifSysteme)).toBe('pleine_production');
    expect(detectPhaseAge(49, olivierIntensifSysteme)).toBe('pleine_production');
  });

  it('returns senescence for age >= vie_economique start', () => {
    expect(detectPhaseAge(50, olivierIntensifSysteme)).toBe('senescence');
    expect(detectPhaseAge(80, olivierIntensifSysteme)).toBe('senescence');
  });

  // Super-intensif: entree=[2,3], pleine=[4,6], vie=[15,20]
  const superIntensifSysteme = {
    entree_production_annee: [2, 3],
    pleine_production_annee: [4, 6],
    duree_vie_economique_ans: [15, 20],
  };

  it('works for super-intensif thresholds', () => {
    expect(detectPhaseAge(1, superIntensifSysteme)).toBe('juvenile');
    expect(detectPhaseAge(2, superIntensifSysteme)).toBe('entree_production');
    expect(detectPhaseAge(4, superIntensifSysteme)).toBe('pleine_production');
    expect(detectPhaseAge(15, superIntensifSysteme)).toBe('senescence');
  });

  it('returns pleine_production when no thresholds available at all', () => {
    expect(detectPhaseAge(10, {})).toBe('pleine_production');
  });

  it('uses defaults from referentiel when systeme has partial data', () => {
    const defaults = {
      entree_production_annee: [4, 5] as [number, number],
      pleine_production_annee: [7, 10] as [number, number],
      duree_vie_economique_ans: [50, 80] as [number, number],
    };
    // Empty systeme → uses all defaults from referentiel
    expect(detectPhaseAge(2, {}, defaults)).toBe('juvenile');
    expect(detectPhaseAge(5, {}, defaults)).toBe('entree_production');
    expect(detectPhaseAge(8, {}, defaults)).toBe('pleine_production');
    expect(detectPhaseAge(55, {}, defaults)).toBe('senescence');
  });

  it('returns juvenile for age 0', () => {
    expect(detectPhaseAge(0, olivierIntensifSysteme)).toBe('juvenile');
  });
});

describe('normalizeSystemToReferentielKey', () => {
  it.each([
    // DB values
    ['Traditional', 'traditionnel'],
    ['Intensive', 'intensif'],
    ['Super-Intensive (4x2)', 'super_intensif'],
    ['Super-Intensive (3x1.5)', 'super_intensif'],
    ['Semi-Intensive', 'intensif'],
    // Frontend French values
    ['Super intensif', 'super_intensif'],
    ['Intensif', 'intensif'],
    ['Semi-intensif', 'intensif'],
    ['Traditionnel', 'traditionnel'],
    ['Traditionnel amélioré', 'traditionnel'],
    ['Traditionnel très espacé', 'traditionnel'],
    // Frontend stored values (type + spacing)
    ['Traditionnelle (12x12)', 'traditionnel'],
    ['Traditionnelle / Semi-Intensive (8x8)', 'traditionnel'],
    ['Super-Intensive (4x1,5)', 'super_intensif'],
    ['Intensive (6x6)', 'intensif'],
    ['Semi-Intensive (8x7)', 'intensif'],
    // Already referentiel keys
    ['traditionnel', 'traditionnel'],
    ['intensif', 'intensif'],
    ['super_intensif', 'super_intensif'],
  ])('maps "%s" → "%s"', (input, expected) => {
    expect(normalizeSystemToReferentielKey(input)).toBe(expected);
  });
});

describe('detectPhaseAgeFromReferentiel', () => {
  const referentiel = {
    systemes: {
      intensif: {
        entree_production_annee: [4, 5],
        pleine_production_annee: [7, 10],
        duree_vie_economique_ans: [50, 80],
      },
      super_intensif: {
        entree_production_annee: [2, 3],
        pleine_production_annee: [4, 6],
        duree_vie_economique_ans: [15, 20],
      },
      traditionnel: {
        entree_production_annee: [6, 8],
        pleine_production_annee: [12, 15],
        duree_vie_economique_ans: [80, 120],
      },
    },
  };

  it('resolves "Super-Intensive (4x2)" to super_intensif thresholds', () => {
    expect(detectPhaseAgeFromReferentiel(1, 'Super-Intensive (4x2)', referentiel)).toBe('juvenile');
    expect(detectPhaseAgeFromReferentiel(3, 'Super-Intensive (4x2)', referentiel)).toBe('entree_production');
    expect(detectPhaseAgeFromReferentiel(5, 'Super-Intensive (4x2)', referentiel)).toBe('pleine_production');
    expect(detectPhaseAgeFromReferentiel(16, 'Super-Intensive (4x2)', referentiel)).toBe('senescence');
  });

  it('resolves "Traditional" to traditionnel thresholds', () => {
    expect(detectPhaseAgeFromReferentiel(3, 'Traditional', referentiel)).toBe('juvenile');
    expect(detectPhaseAgeFromReferentiel(7, 'Traditional', referentiel)).toBe('entree_production');
    expect(detectPhaseAgeFromReferentiel(13, 'Traditional', referentiel)).toBe('pleine_production');
  });

  it('resolves "Intensive" to intensif thresholds', () => {
    expect(detectPhaseAgeFromReferentiel(2, 'Intensive', referentiel)).toBe('juvenile');
    expect(detectPhaseAgeFromReferentiel(5, 'Intensive', referentiel)).toBe('entree_production');
  });

  it('falls back to intensif defaults for unknown system', () => {
    // "unknown_system" normalizes to "intensif" (default), uses intensif thresholds
    expect(detectPhaseAgeFromReferentiel(2, 'unknown_system', referentiel)).toBe('juvenile');
    expect(detectPhaseAgeFromReferentiel(5, 'unknown_system', referentiel)).toBe('entree_production');
    expect(detectPhaseAgeFromReferentiel(8, 'unknown_system', referentiel)).toBe('pleine_production');
  });

  it('falls back to referentiel defaults when referentiel has no systemes', () => {
    expect(detectPhaseAgeFromReferentiel(10, 'Intensive', {})).toBe('pleine_production');
  });
});
