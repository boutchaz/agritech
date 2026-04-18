import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ZaiTTSProvider } from './providers/zai-tts.provider';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ConversationService } from './conversation/conversation.service';
import { AgromindiaContextService } from './context/agromindia-context.service';
import { FollowUpService } from './prompt/follow-up.service';
import { StructuredResponseService } from './prompt/structured-response.service';
import { ChatToolsService } from './tools/chat-tools.service';
import { AiQuotaService } from '../ai-quota/ai-quota.service';

/**
 * ChatService Unit Tests — Post-Decomposition
 *
 * ChatService is now a slim orchestrator (~210 lines). It delegates to:
 * - ContextBuilderService (tested in context-builder.service.spec.ts)
 * - PromptBuilderService (tested in prompt-builder.service.spec.ts)
 * - ConversationService (tested in conversation.service.spec.ts)
 * - ContextRouterService (tested in context-router.service.spec.ts)
 * - AgromindiaContextService (tested in agromindia-context.service.spec.ts)
 * - FollowUpService (tested in follow-up.service.spec.ts)
 *
 * These tests focus on orchestration behavior.
 */
describe('ChatService — Orchestration', () => {
  let service: ChatService;
  let mockContextBuilder: jest.Mocked<Partial<ContextBuilderService>>;
  let mockPromptBuilder: jest.Mocked<Partial<PromptBuilderService>>;
  let mockConversation: jest.Mocked<Partial<ConversationService>>;
  let mockFollowUp: jest.Mocked<Partial<FollowUpService>>;

  const TEST_USER_ID = 'test-user-id';
  const TEST_ORG_ID = 'test-org-id';

  const mockContext = {
    currentDate: '2025-06-01',
    currentSeason: 'Spring',
    organization: { name: 'Test Farm', currency: 'MAD', account_type: 'farm', active_users_count: 1, timezone: 'Africa/Casablanca' },
    farms: { farms_count: 2, farms_recent: [], parcels_count: 5, parcels_recent: [], active_crop_cycles: 1, crop_cycles_recent: [], structures_count: 0, structures_recent: [] },
    settings: null, workers: null, tasks: null, inventory: null, accounting: null,
    satelliteWeather: null, campaigns: null, receptionBatches: null, compliance: null,
    utilities: null, reports: null, marketplace: null, orchards: null, agromindiaIntel: null,
  };

  beforeEach(async () => {
    mockContextBuilder = {
      build: jest.fn().mockResolvedValue(mockContext),
      summarizeContext: jest.fn().mockReturnValue({
        organization: 'Test Farm', farms_count: 2, parcels_count: 5, workers_count: 0,
        pending_tasks: 0, recent_invoices: 0, inventory_items: 0, recent_harvests: 0,
      }),
      setAgromindiaContextService: jest.fn(),
    };

    mockPromptBuilder = {
      buildSystemPrompt: jest.fn().mockReturnValue('System prompt'),
      buildUserPrompt: jest.fn().mockReturnValue('User prompt'),
    };

    mockConversation = {
      verifyOrganizationAccess: jest.fn().mockResolvedValue(true),
      getRecentHistory: jest.fn().mockResolvedValue([]),
      saveMessage: jest.fn().mockResolvedValue(undefined),
      getConversationHistory: jest.fn().mockResolvedValue([]),
      clearConversationHistory: jest.fn().mockResolvedValue(undefined),
    };

    mockFollowUp = {
      parseSuggestions: jest.fn().mockReturnValue({
        cleanText: 'AI response text',
        suggestions: ['Follow up 1', 'Follow up 2'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-key') } },
        { provide: ZaiTTSProvider, useValue: { textToSpeech: jest.fn(), setApiKey: jest.fn() } },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
        { provide: PromptBuilderService, useValue: mockPromptBuilder },
        { provide: ConversationService, useValue: mockConversation },
        { provide: AgromindiaContextService, useValue: { getParcelIntelligence: jest.fn(), getOrgIntelligence: jest.fn() } },
        { provide: FollowUpService, useValue: mockFollowUp },
        StructuredResponseService,
        { provide: ChatToolsService, useValue: { getToolDefinitions: jest.fn(() => []), executeTool: jest.fn() } },
        { provide: AiQuotaService, useValue: {
          checkAndConsume: jest.fn().mockResolvedValue({ allowed: true, provider: 'zai', isByok: false }),
          logUsage: jest.fn().mockResolvedValue(undefined),
          getQuotaStatus: jest.fn().mockResolvedValue({ monthly_limit: 200, current_count: 0, is_byok: false, is_unlimited: false }),
        }},
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);

    // Mock the ZaiProvider (created in constructor)
    const mockZaiProvider = service['zaiProvider'];
    mockZaiProvider.generate = jest.fn().mockResolvedValue({
      content: 'AI response text\n\n---SUGGESTIONS---\n["Follow up 1","Follow up 2"]',
      provider: 'zai',
      model: 'GLM-4.5-Flash',
      tokensUsed: 100,
      generatedAt: new Date(),
    });
    mockZaiProvider.setApiKey = jest.fn();
  });

  describe('sendMessage', () => {
    it('should verify org access, build context, build prompts, call AI, parse suggestions, return response', async () => {
      const result = await service.sendMessage(TEST_USER_ID, TEST_ORG_ID, {
        query: 'How many farms?',
        language: 'en',
      });

      expect(mockConversation.verifyOrganizationAccess).toHaveBeenCalledWith(TEST_USER_ID, TEST_ORG_ID);
      expect(mockContextBuilder.build).toHaveBeenCalledWith(TEST_ORG_ID, 'How many farms?');
      expect(mockPromptBuilder.buildSystemPrompt).toHaveBeenCalled();
      expect(mockPromptBuilder.buildUserPrompt).toHaveBeenCalled();
      expect(mockFollowUp.parseSuggestions).toHaveBeenCalled();
      expect(result.response).toBe('AI response text');
      expect(result.suggestions).toEqual(['Follow up 1', 'Follow up 2']);
      expect(result.context_summary).toBeDefined();
      expect(result.metadata.provider).toBe('zai');
    });

    it('should save history when save_history is true', async () => {
      await service.sendMessage(TEST_USER_ID, TEST_ORG_ID, {
        query: 'Test',
        save_history: true,
      });

      expect(mockConversation.saveMessage).toHaveBeenCalledTimes(2); // user + assistant
    });

    it('should not save history when save_history is false', async () => {
      await service.sendMessage(TEST_USER_ID, TEST_ORG_ID, {
        query: 'Test',
        save_history: false,
      });

      expect(mockConversation.saveMessage).not.toHaveBeenCalled();
    });
  });

  describe('getConversationHistory', () => {
    it('should verify access then return history', async () => {
      await service.getConversationHistory(TEST_USER_ID, TEST_ORG_ID);
      expect(mockConversation.verifyOrganizationAccess).toHaveBeenCalled();
      expect(mockConversation.getConversationHistory).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_ORG_ID,
        undefined,
        undefined,
      );
    });
  });

  describe('clearConversationHistory', () => {
    it('should verify access then clear history', async () => {
      await service.clearConversationHistory(TEST_USER_ID, TEST_ORG_ID);
      expect(mockConversation.verifyOrganizationAccess).toHaveBeenCalled();
      expect(mockConversation.clearConversationHistory).toHaveBeenCalledWith(TEST_USER_ID, TEST_ORG_ID);
    });
  });
});
