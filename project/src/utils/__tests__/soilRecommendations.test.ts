import { describe, it, expect } from 'vitest';
import {
  generateRecommendations,
  getNutrientStatus,
  getNutrientColor,
  type SoilData,
} from '../soilRecommendations';

describe('soilRecommendations', () => {
  describe('generateRecommendations', () => {
    it('should return empty recommendations for optimal soil with good organic matter', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const generalRec = result.find(r => r.category === 'general');
      expect(generalRec).toBeDefined();
      expect(generalRec?.title).toContain('bonne sant');
    });

    it('should detect low pH for olive crop', () => {
      const soilData: SoilData = {
        ph: 4.5,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
        crop_type: 'olive',
      };
      const result = generateRecommendations(soilData);
      const phRec = result.find(r => r.category === 'ph');
      expect(phRec).toBeDefined();
      expect(phRec?.title).toContain('acide');
      expect(phRec?.priority).toBe('high');
    });

    it('should detect high pH', () => {
      const soilData: SoilData = {
        ph: 9.0,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const phRec = result.find(r => r.category === 'ph');
      expect(phRec).toBeDefined();
      expect(phRec?.title).toContain('alcalin');
    });

    it('should detect nitrogen deficiency', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 0.5,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const nRec = result.find(r => r.title.includes('Azote'));
      expect(nRec).toBeDefined();
      expect(nRec?.priority).toBe('high');
      expect(nRec?.quantity).toContain('kg/ha');
    });

    it('should detect excess nitrogen', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 5.0,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const nRec = result.find(r => r.title.includes('Azote') && r.title.includes('lev'));
      expect(nRec).toBeDefined();
      expect(nRec?.priority).toBe('low');
    });

    it('should detect phosphorus deficiency', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.01,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const pRec = result.find(r => r.title.includes('Phosphore'));
      expect(pRec).toBeDefined();
      expect(pRec?.category).toBe('nutrient');
    });

    it('should detect potassium deficiency', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 0.5,
      };
      const result = generateRecommendations(soilData);
      const kRec = result.find(r => r.title.includes('Potassium'));
      expect(kRec).toBeDefined();
      expect(kRec?.category).toBe('nutrient');
    });

    it('should detect low organic matter as high priority when deficit is large', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 0.1,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const omRec = result.find(r => r.category === 'organic_matter');
      expect(omRec).toBeDefined();
      expect(omRec?.priority).toBe('high');
    });

    it('should detect low organic matter as medium priority when deficit is small', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 1.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
      };
      const result = generateRecommendations(soilData);
      const omRec = result.find(r => r.category === 'organic_matter');
      expect(omRec).toBeDefined();
      expect(omRec?.priority).toBe('medium');
    });

    it('should sort recommendations by priority (high first)', () => {
      const soilData: SoilData = {
        ph: 4.0,
        organic_matter: 0.5,
        nitrogen: 0.5,
        phosphorus: 0.01,
        potassium: 0.5,
      };
      const result = generateRecommendations(soilData);
      const priorities = result.map(r => r.priority);
      const highIdx = priorities.indexOf('high');
      const medIdx = priorities.indexOf('medium');
      if (highIdx !== -1 && medIdx !== -1) {
        expect(highIdx).toBeLessThan(medIdx);
      }
    });

    it('should use crop-specific requirements for citrus', () => {
      const soilData: SoilData = {
        ph: 5.3,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
        crop_type: 'citrus',
      };
      const result = generateRecommendations(soilData);
      const phRec = result.find(r => r.category === 'ph');
      expect(phRec).toBeDefined();
    });

    it('should use default requirements for unknown crop', () => {
      const soilData: SoilData = {
        ph: 6.5,
        organic_matter: 3.0,
        nitrogen: 2.0,
        phosphorus: 0.045,
        potassium: 2.0,
        crop_type: 'unknown_crop',
      };
      const result = generateRecommendations(soilData);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getNutrientStatus', () => {
    it('should return "low" when value is below minimum', () => {
      expect(getNutrientStatus(0.5, 1.0, 3.0)).toBe('low');
    });

    it('should return "optimal" when value is within range', () => {
      expect(getNutrientStatus(2.0, 1.0, 3.0)).toBe('optimal');
    });

    it('should return "high" when value exceeds maximum', () => {
      expect(getNutrientStatus(4.0, 1.0, 3.0)).toBe('high');
    });

    it('should return "optimal" at exact min boundary', () => {
      expect(getNutrientStatus(1.0, 1.0, 3.0)).toBe('optimal');
    });

    it('should return "optimal" at exact max boundary', () => {
      expect(getNutrientStatus(3.0, 1.0, 3.0)).toBe('optimal');
    });
  });

  describe('getNutrientColor', () => {
    it('should return red classes for low status', () => {
      expect(getNutrientColor('low')).toContain('red');
    });

    it('should return green classes for optimal status', () => {
      expect(getNutrientColor('optimal')).toContain('green');
    });

    it('should return yellow classes for high status', () => {
      expect(getNutrientColor('high')).toContain('yellow');
    });

    it('should include dark mode variants', () => {
      expect(getNutrientColor('low')).toContain('dark:');
      expect(getNutrientColor('optimal')).toContain('dark:');
      expect(getNutrientColor('high')).toContain('dark:');
    });
  });
});
