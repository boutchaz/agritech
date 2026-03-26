import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  describe('buildSystemPrompt', () => {
    it('should contain agricultural consultant role', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('agricultural consultant');
    });

    it('should contain language rule', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('Language Rule');
    });

    it('should contain response guidelines', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('BE CONCISE');
    });
  });

  describe('buildUserPrompt', () => {
    const baseContext: any = {
      organization: {
        id: 'org-1',
        name: 'Test Farm',
        currency: 'MAD',
        timezone: 'Africa/Casablanca',
        account_type: 'standard',
        active_users_count: 3,
      },
      farms: null,
      workers: null,
      accounting: null,
      inventory: null,
      production: null,
      currentDate: '2026-03-26',
      currentSeason: 'spring',
    };

    it('should include French language instruction for fr', () => {
      const prompt = service.buildUserPrompt('bonjour', baseContext, 'fr', []);
      expect(prompt).toContain('LANGUE OBLIGATOIRE');
      expect(prompt).toContain('français');
    });

    it('should include English language instruction for en', () => {
      const prompt = service.buildUserPrompt('hello', baseContext, 'en', []);
      expect(prompt).toContain('REQUIRED LANGUAGE');
      expect(prompt).toContain('English');
    });

    it('should include Arabic language instruction for ar', () => {
      const prompt = service.buildUserPrompt('مرحبا', baseContext, 'ar', []);
      expect(prompt).toContain('اللغة الإلزامية');
      expect(prompt).toContain('العربية');
    });

    it('should include organization context', () => {
      const prompt = service.buildUserPrompt('hello', baseContext, 'en', []);
      expect(prompt).toContain('Test Farm');
      expect(prompt).toContain('MAD');
    });

    it('should include the user query', () => {
      const prompt = service.buildUserPrompt('how many farms?', baseContext, 'en', []);
      expect(prompt).toContain('how many farms?');
    });

    it('should include conversation history when provided', () => {
      const history = [
        { role: 'user', content: 'previous question' },
        { role: 'assistant', content: 'previous answer' },
      ];
      const prompt = service.buildUserPrompt('follow up', baseContext, 'en', history);
      expect(prompt).toContain('previous question');
      expect(prompt).toContain('previous answer');
      expect(prompt).toContain('CONVERSATION HISTORY');
    });

    it('should not include conversation history section when empty', () => {
      const prompt = service.buildUserPrompt('hello', baseContext, 'en', []);
      expect(prompt).not.toContain('CONVERSATION HISTORY');
    });

    it('should include current date and season', () => {
      const prompt = service.buildUserPrompt('hello', baseContext, 'en', []);
      expect(prompt).toContain('2026-03-26');
      expect(prompt).toContain('spring');
    });

    it('should include AGROMINDIA INTELLIGENCE section when agromindiaIntel is populated', () => {
      const contextWithIntel = {
        ...baseContext,
        agromindiaIntel: [
          {
            parcel_id: 'p-1',
            parcel_name: 'Parcelle Azef',
            crop_type: 'olivier',
            diagnostics: {
              scenario_code: 'B',
              scenario: 'Vegetation stress detected',
              confidence: 0.82,
              indicators: {
                ndvi_band: 'vigilance',
                ndvi_trend: 'declining',
                ndre_status: 'low',
                ndmi_trend: 'declining',
                water_balance: -15,
                weather_anomaly: false,
              },
            },
            recommendations: [
              {
                id: 'r-1',
                status: 'pending',
                priority: 'high',
                constat: 'NDVI dropped 15%',
                diagnostic: 'Water stress confirmed',
                action: 'Increase irrigation frequency',
                valid_from: '2026-03-20',
                valid_until: '2026-04-20',
              },
            ],
            annual_plan: {
              status: 'active',
              upcoming_interventions: [
                {
                  month: 4,
                  week: 1,
                  intervention_type: 'fertilization',
                  description: 'Spring NPK application',
                  product: 'NPK 15-15-15',
                  dose: '200 kg/ha',
                  status: 'planned',
                },
              ],
              overdue_interventions: [],
              plan_summary: { total: 12, executed: 3, planned: 8, skipped: 1 },
            },
            calibration: {
              status: 'completed',
              confidence_score: 0.9,
              zone_classification: 'normal',
              baseline_ndvi: 0.55,
              baseline_ndre: 0.3,
              baseline_ndmi: 0.2,
            },
            referential: null,
          },
        ],
      };

      const prompt = service.buildUserPrompt('what about my parcel?', contextWithIntel, 'en', []);
      expect(prompt).toContain('AGROMINDIA INTELLIGENCE');
      expect(prompt).toContain('Parcelle Azef');
      expect(prompt).toContain('Scenario B');
      expect(prompt).toContain('Increase irrigation frequency');
      expect(prompt).toContain('Spring NPK application');
      expect(prompt).toContain('baseline NDVI: 0.55');
    });

    it('should not include AGROMINDIA section when agromindiaIntel is null', () => {
      const prompt = service.buildUserPrompt('hello', baseContext, 'en', []);
      expect(prompt).not.toContain('AGROMINDIA INTELLIGENCE');
    });
  });

  describe('buildSystemPrompt with AgromindIA instructions', () => {
    it('should instruct AI to use AgromindIA computed data', () => {
      const prompt = service.buildSystemPrompt();
      expect(prompt).toContain('AgromindIA');
    });
  });
});
