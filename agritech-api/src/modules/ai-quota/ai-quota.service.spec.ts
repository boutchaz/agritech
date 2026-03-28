import { AiQuotaService } from './ai-quota.service';
import { UNLIMITED } from './ai-quota.constants';

describe('AiQuotaService', () => {
  let service: AiQuotaService;
  let mockSupabase: any;

  const ORG_ID = 'test-org-id';
  const USER_ID = 'test-user-id';

  const createMockSupabase = () => {
    const chainable = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      single: jest.fn().mockResolvedValue({ data: null }),
    };
    return {
      from: jest.fn().mockReturnValue(chainable),
      _chainable: chainable,
    };
  };

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    const mockDbService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabase),
    } as any;
    service = new AiQuotaService(mockDbService);
  });

  describe('getOrCreateQuota', () => {
    it('should create quota with correct monthly_limit based on org subscription', async () => {
      // No existing quota
      const chain = mockSupabase._chainable;
      
      // First call: ai_quotas select → null
      // Second call: subscriptions select → STANDARD
      // Third call: ai_quotas insert
      let fromCallCount = 0;
      mockSupabase.from = jest.fn().mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'ai_quotas' && fromCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { formula: 'STANDARD', agromind_ia_level: null },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_quotas') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'quota-1',
                    monthly_limit: 200,
                    current_count: 0,
                    period_start: new Date().toISOString(),
                    period_end: new Date().toISOString(),
                  },
                }),
              }),
            }),
          };
        }
        return chain;
      });

      const quota = await service.getOrCreateQuota(ORG_ID);
      expect(quota.monthly_limit).toBe(200);
      expect(quota.current_count).toBe(0);
    });
  });

  describe('checkAndConsume', () => {
    it('within quota + no BYOK → returns allowed with zai provider', async () => {
      let fromCallCount = 0;
      mockSupabase.from = jest.fn().mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'organization_ai_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_quotas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'q1',
                    monthly_limit: 200,
                    current_count: 50,
                    period_start: new Date().toISOString(),
                    period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
                  },
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return mockSupabase._chainable;
      });

      const result = await service.checkAndConsume(ORG_ID, USER_ID, 'chat');
      expect(result.allowed).toBe(true);
      expect(result.provider).toBe('zai');
      expect(result.isByok).toBe(false);
    });

    it('at limit + no BYOK → returns not allowed with quota info', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
      mockSupabase.from = jest.fn().mockImplementation((table: string) => {
        if (table === 'organization_ai_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_quotas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'q1',
                    monthly_limit: 200,
                    current_count: 200,
                    period_start: new Date().toISOString(),
                    period_end: futureDate,
                  },
                }),
              }),
            }),
          };
        }
        return mockSupabase._chainable;
      });

      const result = await service.checkAndConsume(ORG_ID, USER_ID, 'chat');
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('AI_QUOTA_EXCEEDED');
      expect(result.limit).toBe(200);
      expect(result.used).toBe(200);
      expect(result.resetDate).toBe(futureDate);
    });

    it('at limit + BYOK enabled → returns allowed with byok provider', async () => {
      mockSupabase.from = jest.fn().mockImplementation((table: string) => {
        if (table === 'organization_ai_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [{ id: 'setting-1' }] }),
                }),
              }),
            }),
          };
        }
        return mockSupabase._chainable;
      });

      const result = await service.checkAndConsume(ORG_ID, USER_ID, 'chat');
      expect(result.allowed).toBe(true);
      expect(result.provider).toBe('byok');
      expect(result.isByok).toBe(true);
    });

    it('enterprise tier → always allowed', async () => {
      mockSupabase.from = jest.fn().mockImplementation((table: string) => {
        if (table === 'organization_ai_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_quotas') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'q1',
                    monthly_limit: UNLIMITED,
                    current_count: 9999,
                    period_start: new Date().toISOString(),
                    period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
                  },
                }),
              }),
            }),
          };
        }
        return mockSupabase._chainable;
      });

      const result = await service.checkAndConsume(ORG_ID, USER_ID, 'chat');
      expect(result.allowed).toBe(true);
      expect(result.provider).toBe('zai');
      expect(result.isByok).toBe(false);
    });
  });

  describe('logUsage', () => {
    it('inserts a row into ai_usage_log', async () => {
      const insertFn = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from = jest.fn().mockReturnValue({ insert: insertFn });

      await service.logUsage(ORG_ID, USER_ID, 'chat', 'zai', 'GLM-4.5-Flash', 100, false);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_log');
      expect(insertFn).toHaveBeenCalledWith({
        organization_id: ORG_ID,
        user_id: USER_ID,
        feature: 'chat',
        provider: 'zai',
        model: 'GLM-4.5-Flash',
        tokens_used: 100,
        is_byok: false,
      });
    });
  });
});
