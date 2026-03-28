import { ContextSummarizerService } from './context-summarizer.service';

describe('ContextSummarizerService', () => {
  let service: ContextSummarizerService;

  beforeEach(() => {
    service = new ContextSummarizerService();
  });

  describe('summarizeFarms', () => {
    it('produces string without UUIDs, under 200 tokens', () => {
      const farms = [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Ferme Al Baraka', total_area: 150, city: 'Meknes' },
        { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Ferme Oued Fes', total_area: 80, city: 'Fes' },
      ];
      const result = service.summarizeFarms(farms);
      expect(result).not.toContain('550e8400');
      expect(result).not.toContain('a1b2c3d4');
      expect(result).toContain('Ferme Al Baraka');
      expect(result).toContain('150');
      // Rough token estimate: words ≈ tokens * 0.75
      expect(result.split(/\s+/).length).toBeLessThan(200);
    });

    it('returns "No farms registered." for empty data', () => {
      const result = service.summarizeFarms([]);
      expect(result).toBe('No farms registered.');
    });
  });

  describe('summarizeAgromindiaIntel', () => {
    it('produces concise scenario + recommendation summary', () => {
      const intel = [{
        parcel_name: 'B3',
        crop_type: 'olivier',
        diagnostics: { scenario_code: 'B', scenario: 'Stress hydrique modéré', confidence: 0.85 },
        recommendations: [
          { priority: 'high', constat: 'Manque eau', action: 'Irriguer 30mm', status: 'pending' },
        ],
        annual_plan: null,
        calibration: null,
        referential: null,
      }];
      const result = service.summarizeAgromindiaIntel(intel);
      expect(result).toContain('B3');
      expect(result).toContain('Scenario B');
      expect(result).toContain('Irriguer 30mm');
    });
  });
});
