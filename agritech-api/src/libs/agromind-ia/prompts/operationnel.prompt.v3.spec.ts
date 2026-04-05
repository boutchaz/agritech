import { describe, it, expect } from 'vitest';
import { buildOperationnelSystemPrompt } from './operationnel.prompt.v3';

describe('operationnel.prompt.v3', () => {
  const mockConfig = {
    cultures: { olivier: { section_alertes: 'OLI', phenomenologie: { type: 'stades_bbch' }, specificites: {} } },
    gouvernance_recommandations: {
      limites_simultanées: { reactives_max: 3, planifiees_rappelees_max: 2 },
      delais_minimum_entre_recommandations: {},
      durees_expiration: {},
      structure_6_blocs_obligatoire: {},
      mention_responsabilite_obligatoire: 'La décision revient à l\'exploitant.',
      desescalade: { chemin: '🔴 → 🟠 → 🟡 → FIN', alertes_irreversibles: [] },
    },
    navigation_plan_annuel: {},
  };
  const mockRef = { metadata: { culture: 'olivier' } };

  it('should contain GOUVERNANCE', () => {
    const prompt = buildOperationnelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('GOUVERNANCE');
  });

  it('should contain 6 BLOCS', () => {
    const prompt = buildOperationnelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('6 BLOCS');
  });

  it('should contain CHEMIN A, B, C', () => {
    const prompt = buildOperationnelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('CHEMIN A');
    expect(prompt).toContain('CHEMIN B');
    expect(prompt).toContain('CHEMIN C');
  });
});
