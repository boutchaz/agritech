import { describe, it, expect } from 'vitest';
import { buildRecalibrageSystemPrompt, buildRecalibragePartielUserPrompt } from './recalibrage.prompt';

describe('recalibrage.prompt', () => {
  const mockRef = { moteur_config: { culture: 'olivier' } };

  it('should contain F2 and F3', () => {
    const prompt = buildRecalibrageSystemPrompt(mockRef);
    expect(prompt).toContain('F2');
    expect(prompt).toContain('F3');
  });

  it('should build partial user prompt with CHANGEMENT DÉCLARÉ', () => {
    const input = {
      baseline_actuelle: { scores: { confiance_global: 65 } },
      type: 'F2_partiel' as const,
      changement: { type: 'source_eau', description: 'New well', date: '2026-01-15' },
    } as any;
    const prompt = buildRecalibragePartielUserPrompt(input);
    expect(prompt).toContain('CHANGEMENT DÉCLARÉ');
    expect(prompt).toContain('source_eau');
  });
});
