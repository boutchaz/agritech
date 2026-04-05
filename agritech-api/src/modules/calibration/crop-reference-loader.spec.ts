import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalCropReference,
  getMoteurConfig,
  reloadCropReferences,
  reloadMoteurConfig,
} from './crop-reference-loader';

describe('CropReferenceLoader', () => {
  beforeEach(() => {
    reloadCropReferences();
    reloadMoteurConfig();
  });

  describe('getMoteurConfig', () => {
    it('should return an object with expected top-level keys', () => {
      const config = getMoteurConfig();
      expect(config).not.toBeNull();
      expect(config).toHaveProperty('cultures');
      expect(config).toHaveProperty('regles_moteur');
      expect(config).toHaveProperty('gouvernance_recommandations');
      expect(config).toHaveProperty('phases_age');
    });

    it('should include olivier culture config', () => {
      const config = getMoteurConfig();
      expect(config).not.toBeNull();
      const cultures = config!.cultures as Record<string, unknown>;
      expect(cultures).toHaveProperty('olivier');
    });

    it('should cache the config on subsequent calls', () => {
      const config1 = getMoteurConfig();
      const config2 = getMoteurConfig();
      expect(config1).toBe(config2); // same reference = cached
    });
  });

  describe('getLocalCropReference (V5 olivier)', () => {
    it('should return referentiel with V2 keys for olivier', () => {
      const ref = getLocalCropReference('olivier');
      expect(ref).not.toBeNull();
      expect(ref).toHaveProperty('gdd');
      expect(ref).toHaveProperty('co_occurrence');
      expect(ref).toHaveProperty('protocole_phenologique');
      expect(ref).toHaveProperty('formes_engrais');
      expect(ref).toHaveProperty('microelements');
    });

    it('should have 20 OLI alerts', () => {
      const ref = getLocalCropReference('olivier');
      expect(ref).not.toBeNull();
      const alertes = ref!.alertes as unknown[];
      expect(Array.isArray(alertes)).toBe(true);
      expect(alertes.length).toBe(20);
    });
  });
});
