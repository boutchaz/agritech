import { describe, it, expect } from 'vitest';
import { buildPlanAnnuelSystemPrompt } from './plan_annuel.prompt.v3';

describe('plan_annuel.prompt.v3', () => {
  const mockConfig = {
    navigation_plan_annuel: {},
    gouvernance_recommandations: {},
  };

  const mockRef = {
    metadata: { culture: 'olivier' },
  };

  it('should contain 10 ÉTAPES DÉTERMINISTES', () => {
    const prompt = buildPlanAnnuelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('10 ÉTAPES DÉTERMINISTES');
  });

  it('should contain culture name', () => {
    const prompt = buildPlanAnnuelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('olivier');
  });

  it('should contain nutrition option determination', () => {
    const prompt = buildPlanAnnuelSystemPrompt(mockConfig, mockRef);
    expect(prompt).toContain('OPTION NUTRITION');
  });
});
