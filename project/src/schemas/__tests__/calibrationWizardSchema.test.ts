import { describe, it, expect } from 'vitest';
import {
  PlantationStepSchema,
  IrrigationStepSchema,
  HarvestRecordSchema,
  HarvestHistoryStepSchema,
  CulturalHistoryStepSchema,
  StressEventSchema,
  normalizeCalibrationOptionalSelects,
  calibrationWizardDefaultValues,
} from '../calibrationWizardSchema';

describe('calibrationWizardSchema', () => {
  describe('PlantationStepSchema', () => {
    it('should validate valid plantation data', () => {
      const result = PlantationStepSchema.safeParse({
        plantation_age: 10,
        water_source: 'well',
        water_source_changed: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing plantation_age', () => {
      const result = PlantationStepSchema.safeParse({
        water_source: 'well',
        water_source_changed: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative plantation_age', () => {
      const result = PlantationStepSchema.safeParse({
        plantation_age: -1,
        water_source: 'well',
        water_source_changed: false,
      });
      expect(result.success).toBe(false);
    });

    it('should require water_source_change_date when water_source_changed is true', () => {
      const result = PlantationStepSchema.safeParse({
        plantation_age: 10,
        water_source: 'well',
        water_source_changed: true,
      });
      expect(result.success).toBe(false);
    });

    it('should require previous_water_source when water_source_changed is true', () => {
      const result = PlantationStepSchema.safeParse({
        plantation_age: 10,
        water_source: 'well',
        water_source_changed: true,
        water_source_change_date: '2024-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('should pass when water_source_changed is true and all fields provided', () => {
      const result = PlantationStepSchema.safeParse({
        plantation_age: 10,
        water_source: 'well',
        water_source_changed: true,
        water_source_change_date: '2024-01-01',
        previous_water_source: 'dam',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid water_source values', () => {
      const sources = ['well', 'dam', 'seguia', 'municipal', 'mixed', 'other'];
      for (const source of sources) {
        const result = PlantationStepSchema.safeParse({
          plantation_age: 10,
          water_source: source,
          water_source_changed: false,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('IrrigationStepSchema', () => {
    it('should validate valid irrigation data', () => {
      const result = IrrigationStepSchema.safeParse({
        irrigation_frequency: 'daily',
        volume_per_tree_liters: 50,
        irrigation_regime_changed: false,
      });
      expect(result.success).toBe(true);
    });

    it('should require fields when irrigation_regime_changed is true', () => {
      const result = IrrigationStepSchema.safeParse({
        irrigation_frequency: 'daily',
        volume_per_tree_liters: 50,
        irrigation_regime_changed: true,
        irrigation_change_date: '2024-01-01',
        previous_irrigation_frequency: 'weekly',
        previous_volume_per_tree_liters: 30,
      });
      expect(result.success).toBe(true);
    });

    it('should reject when irrigation_regime_changed is true without required fields', () => {
      const result = IrrigationStepSchema.safeParse({
        irrigation_frequency: 'daily',
        volume_per_tree_liters: 50,
        irrigation_regime_changed: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('HarvestRecordSchema', () => {
    it('should validate a valid harvest record', () => {
      const result = HarvestRecordSchema.safeParse({
        year: 2024,
        yield_value: 5.5,
        unit: 't_ha',
      });
      expect(result.success).toBe(true);
    });

    it('should reject year below 1900', () => {
      const result = HarvestRecordSchema.safeParse({
        year: 1899,
        yield_value: 5.5,
        unit: 't_ha',
      });
      expect(result.success).toBe(false);
    });

    it('should reject year above 2100', () => {
      const result = HarvestRecordSchema.safeParse({
        year: 2101,
        yield_value: 5.5,
        unit: 't_ha',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative yield', () => {
      const result = HarvestRecordSchema.safeParse({
        year: 2024,
        yield_value: -1,
        unit: 't_ha',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('HarvestHistoryStepSchema', () => {
    it('should require at least 3 harvests', () => {
      const result = HarvestHistoryStepSchema.safeParse({
        harvests: [
          { year: 2022, yield_value: 5, unit: 't_ha' },
          { year: 2023, yield_value: 6, unit: 't_ha' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 5 harvests', () => {
      const harvests = Array.from({ length: 6 }, (_, i) => ({
        year: 2020 + i,
        yield_value: 5,
        unit: 't_ha',
      }));
      const result = HarvestHistoryStepSchema.safeParse({ harvests });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 3 harvests', () => {
      const result = HarvestHistoryStepSchema.safeParse({
        harvests: [
          { year: 2022, yield_value: 5, unit: 't_ha' },
          { year: 2023, yield_value: 6, unit: 't_ha' },
          { year: 2024, yield_value: 7, unit: 't_ha' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('StressEventSchema', () => {
    it('should validate a valid stress event', () => {
      const result = StressEventSchema.safeParse({
        type: 'drought',
        year: 2023,
        description: 'Severe drought',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid stress types', () => {
      const types = ['drought', 'frost', 'disease', 'pest', 'salinity', 'other'];
      for (const type of types) {
        const result = StressEventSchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('normalizeCalibrationOptionalSelects', () => {
    it('should convert empty strings to undefined', () => {
      const result = normalizeCalibrationOptionalSelects({
        pruning_practiced: '',
        pruning_type: '',
      });
      expect(result.pruning_practiced).toBeUndefined();
      expect(result.pruning_type).toBeUndefined();
    });

    it('should convert null to undefined', () => {
      const result = normalizeCalibrationOptionalSelects({
        pruning_practiced: null,
      });
      expect(result.pruning_practiced).toBeUndefined();
    });

    it('should preserve valid values', () => {
      const result = normalizeCalibrationOptionalSelects({
        pruning_practiced: 'yes',
      });
      expect(result.pruning_practiced).toBe('yes');
    });

    it('should convert whitespace-only strings to undefined', () => {
      const result = normalizeCalibrationOptionalSelects({
        pruning_type: '   ',
      });
      expect(result.pruning_type).toBeUndefined();
    });

    it('should not affect non-select keys', () => {
      const result = normalizeCalibrationOptionalSelects({
        plantation_age: 10,
        observations: 'some text',
      });
      expect(result.plantation_age).toBe(10);
      expect(result.observations).toBe('some text');
    });
  });

  describe('calibrationWizardDefaultValues', () => {
    it('should have plantation_age of 0', () => {
      expect(calibrationWizardDefaultValues.plantation_age).toBe(0);
    });

    it('should have default water_source as well', () => {
      expect(calibrationWizardDefaultValues.water_source).toBe('well');
    });

    it('should have 3 default harvest entries', () => {
      expect(calibrationWizardDefaultValues.harvests).toHaveLength(3);
    });

    it('should have empty stress_events', () => {
      expect(calibrationWizardDefaultValues.stress_events).toEqual([]);
    });

    it('should have soil_analysis_available as no', () => {
      expect(calibrationWizardDefaultValues.soil_analysis_available).toBe('no');
    });
  });
});
