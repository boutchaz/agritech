import { checkVegetation, VegetationStatus } from './vegetation-check';

describe('checkVegetation', () => {
  const currentYear = new Date().getFullYear();

  describe('Rule 0 — Bypass young plantation', () => {
    it('bypasses when age < 4', () => {
      const plantingYear = currentYear - 2; // age = 2
      const result = checkVegetation(plantingYear, [0.05, 0.03]);
      expect(result.status).toBe<VegetationStatus>('BYPASS_JEUNE_PLANTATION');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(false);
    });

    it('bypasses when planting year is null', () => {
      const result = checkVegetation(null, [0.05, 0.03]);
      expect(result.status).toBe<VegetationStatus>('BYPASS_JEUNE_PLANTATION');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(false);
    });
  });

  describe('Rule 1 — Vegetation confirmed', () => {
    it('confirms when mean >= 0.28 and min >= 0.18', () => {
      const plantingYear = currentYear - 10;
      const result = checkVegetation(plantingYear, [0.42, 0.31, 0.55]);
      expect(result.status).toBe<VegetationStatus>('VEGETATION_CONFIRMEE');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(false);
    });

    it('confirms at exact boundary values (mean=0.28, min=0.18)', () => {
      const plantingYear = currentYear - 10;
      // mean = (0.28 + 0.18 + 0.38) / 3 = 0.28, min = 0.18
      const result = checkVegetation(plantingYear, [0.28, 0.18, 0.38]);
      expect(result.status).toBe<VegetationStatus>('VEGETATION_CONFIRMEE');
      expect(result.continueCalibration).toBe(true);
    });
  });

  describe('Rule 2 — Parcelle vide', () => {
    it('blocks when mean < 0.15 and min < 0.10', () => {
      const plantingYear = currentYear - 10;
      const result = checkVegetation(plantingYear, [0.08, 0.04, 0.12]);
      expect(result.status).toBe<VegetationStatus>('PARCELLE_VIDE');
      expect(result.continueCalibration).toBe(false);
      expect(result.showMessage).toBe(true);
      expect(result.messageType).toBe('bloquant');
    });

    it('blocks at exact boundary values (mean=0.14, min=0.09)', () => {
      const plantingYear = currentYear - 10;
      // mean = (0.14 + 0.09 + 0.19) / 3 ≈ 0.14, min = 0.09
      const result = checkVegetation(plantingYear, [0.14, 0.09, 0.19]);
      expect(result.status).toBe<VegetationStatus>('PARCELLE_VIDE');
      expect(result.continueCalibration).toBe(false);
    });
  });

  describe('Rule 3 — Zone grise', () => {
    it('warns when neither confirmed nor empty', () => {
      const plantingYear = currentYear - 10;
      const result = checkVegetation(plantingYear, [0.22, 0.15, 0.25]);
      expect(result.status).toBe<VegetationStatus>('ZONE_GRISE');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(true);
      expect(result.messageType).toBe('avertissement');
    });

    it('warns when mean passes but min fails (mixed)', () => {
      const plantingYear = currentYear - 10;
      // mean = (0.30 + 0.12 + 0.48) / 3 = 0.30 >= 0.28 ✓, min = 0.12 < 0.18 ✗
      const result = checkVegetation(plantingYear, [0.30, 0.12, 0.48]);
      expect(result.status).toBe<VegetationStatus>('ZONE_GRISE');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(true);
    });
  });

  describe('Rule absolue — no data = let through', () => {
    it('bypasses when no July-August data available', () => {
      const plantingYear = currentYear - 10;
      const result = checkVegetation(plantingYear, []);
      expect(result.status).toBe<VegetationStatus>('BYPASS_JEUNE_PLANTATION');
      expect(result.continueCalibration).toBe(true);
      expect(result.showMessage).toBe(false);
    });
  });

  describe('NDVI stats in result', () => {
    it('includes computed summer mean and min', () => {
      const plantingYear = currentYear - 10;
      const result = checkVegetation(plantingYear, [0.42, 0.31, 0.55]);
      expect(result.ndviStats.summerMean).toBeCloseTo(0.4267, 3);
      expect(result.ndviStats.summerMin).toBeCloseTo(0.31, 3);
      expect(result.ndviStats.sampleCount).toBe(3);
    });
  });
});
