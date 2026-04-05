import { describe, it, expect } from 'vitest';
import { buildCalibrageSystemPrompt, buildCalibrageUserPrompt } from './calibrage.prompt.v3';
import type { CalibrageInput } from '../types';

describe('calibrage.prompt.v3', () => {
  const mockConfig = {
    cultures: {
      olivier: {
        phenomenologie: {
          type: 'stades_bbch',
          section: 'stades_bbch',
          gdd_tbase_c: 7.5,
          gdd_plafond_c: 30,
        },
        indices_satellites: {
          indices_calculer: ['NDVI', 'NIRv', 'NDMI', 'NDRE'],
          vigueur_principal: 'NIRv',
          stress_eau: 'NDMI',
        },
        specificites: {},
        rapport_agriculteur: {
          icone_score: {},
          score_sante_labels: {},
        },
      },
    },
    regles_moteur: {
      score_confiance_points: {},
      score_sante_composantes: {},
    },
    phases_age: {},
  };

  const mockRef = {
    metadata: { culture: 'olivier', version: '5.0' },
    alertes: [],
  };

  describe('buildCalibrageSystemPrompt', () => {
    it('should contain MODE OBSERVATION PURE', () => {
      const prompt = buildCalibrageSystemPrompt(mockConfig, mockRef);
      expect(prompt).toContain('MODE OBSERVATION PURE');
    });

    it('should contain culture name', () => {
      const prompt = buildCalibrageSystemPrompt(mockConfig, mockRef);
      expect(prompt).toContain('olivier');
    });

    it('should contain injected config as JSON', () => {
      const prompt = buildCalibrageSystemPrompt(mockConfig, mockRef);
      expect(prompt).toContain('regles_moteur');
      expect(prompt).toContain('phases_age');
    });

    it('should contain referentiel as JSON', () => {
      const prompt = buildCalibrageSystemPrompt(mockConfig, mockRef);
      expect(prompt).toContain('RÉFÉRENTIEL CULTURE');
    });
  });

  describe('buildCalibrageUserPrompt', () => {
    const mockInput: CalibrageInput = {
      profil: {
        parcelle_id: 'test-123',
        culture: 'olivier',
        variete: 'Picholine Marocaine',
        systeme: 'intensif',
        age_ans: 15,
        densite_arbres_ha: 277,
        surface_ha: 10,
        irrigation: { type: 'goutte_a_goutte', efficience: 0.9 },
        localisation: { lat: 33.8, lng: -5.5, region: 'Meknes' },
        langue: 'fr',
      },
      satellite_history: [
        {
          date: '2024-01-15',
          indices: { NDVI: 0.45, NIRv: 0.22, NDMI: 0.15, NDRE: 0.18 },
          nb_pixels_purs: 50,
          couverture_nuageuse_pct: 10,
        },
      ],
      meteo_history: [
        {
          date: '2024-01-15',
          Tmin: 5, Tmax: 18, Tmoy: 11.5,
          precip_mm: 12, ETP_mm: 2.5,
          HR_pct: 70, vent_km_h: 15,
        },
      ],
    };

    it('should contain profil parcelle', () => {
      const prompt = buildCalibrageUserPrompt(mockInput);
      expect(prompt).toContain('PROFIL PARCELLE');
      expect(prompt).toContain('test-123');
    });

    it('should contain satellite history', () => {
      const prompt = buildCalibrageUserPrompt(mockInput);
      expect(prompt).toContain('HISTORIQUE SATELLITE');
      expect(prompt).toContain('2024-01-15');
    });

    it('should indicate missing analyses with confidence penalty', () => {
      const prompt = buildCalibrageUserPrompt(mockInput);
      expect(prompt).toContain('ABSENTE');
      expect(prompt).toContain('-20 pts');
    });
  });
});
