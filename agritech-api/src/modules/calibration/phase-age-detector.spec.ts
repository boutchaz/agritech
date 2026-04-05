import { detectPhaseAge, PhaseAge } from './phase-age-detector';

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

  it('returns pleine_production with fallback defaults when data missing', () => {
    expect(detectPhaseAge(10, {})).toBe('pleine_production');
  });

  it('returns juvenile for age 0', () => {
    expect(detectPhaseAge(0, olivierIntensifSysteme)).toBe('juvenile');
  });
});
