import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConversationService } from './conversation.service';

// Simple chainable mock for Supabase query builder
function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const mock: any = {};
  const methods = ['select', 'insert', 'delete', 'eq', 'order', 'limit', 'maybeSingle', 'single'];
  for (const method of methods) {
    mock[method] = jest.fn().mockReturnValue(mock);
  }
  // Make it thenable so await works
  mock.then = (resolve: any) => resolve(resolvedValue);
  return mock;
}

describe('ConversationService', () => {
  let service: ConversationService;
  let mockClient: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockClient = {
      from: jest.fn(),
    };
    mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockClient),
    };
    service = new ConversationService(mockDatabaseService);
  });

  describe('saveMessage', () => {
    it('should insert a message into chat_conversations', async () => {
      const chainable = createChainableMock({ data: { id: '1' }, error: null });
      mockClient.from.mockReturnValue(chainable);

      await service.saveMessage('user-1', 'org-1', 'user', 'hello', 'en');

      expect(mockClient.from).toHaveBeenCalledWith('chat_conversations');
      expect(chainable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          user_id: 'user-1',
          role: 'user',
          content: 'hello',
          language: 'en',
        }),
      );
    });

    it('should include metadata when provided', async () => {
      const chainable = createChainableMock({ data: { id: '1' }, error: null });
      mockClient.from.mockReturnValue(chainable);

      const metadata = { provider: 'zai', model: 'GLM-4.5-Flash' };
      await service.saveMessage('user-1', 'org-1', 'assistant', 'response', 'fr', metadata);

      expect(chainable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata,
        }),
      );
    });
  });

  describe('getRecentHistory', () => {
    it('should return messages in chronological order', async () => {
      const messages = [
        { role: 'assistant', content: 'response' },
        { role: 'user', content: 'question' },
      ];
      const chainable = createChainableMock({ data: messages, error: null });
      mockClient.from.mockReturnValue(chainable);

      const result = await service.getRecentHistory('user-1', 'org-1', 5);

      expect(mockClient.from).toHaveBeenCalledWith('chat_conversations');
      expect(chainable.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chainable.eq).toHaveBeenCalledWith('user_id', 'user-1');
      // Results are reversed (DB returns desc, we reverse to chronological)
      expect(result).toEqual([
        { role: 'user', content: 'question' },
        { role: 'assistant', content: 'response' },
      ]);
    });

    it('should return empty array on error', async () => {
      mockClient.from.mockImplementation(() => { throw new Error('DB error'); });

      const result = await service.getRecentHistory('user-1', 'org-1', 5);
      expect(result).toEqual([]);
    });
  });

  describe('getConversationHistory', () => {
    it('should return formatted messages with total count', async () => {
      // Mock count query
      const countChain = createChainableMock({ count: 5, error: null });
      // Mock messages query
      const messagesChain = createChainableMock({
        data: [
          { id: '1', role: 'user', content: 'hi', created_at: '2026-01-01', metadata: {} },
        ],
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? countChain : messagesChain;
      });

      const result = await service.getConversationHistory('user-1', 'org-1', 10);

      expect(result.total).toBe(5);
      expect(result.messages[0]).toEqual(
        expect.objectContaining({
          id: '1',
          role: 'user',
          content: 'hi',
        }),
      );
    });
  });

  describe('clearConversationHistory', () => {
    it('should delete user messages for the organization', async () => {
      const chainable = createChainableMock({ error: null });
      mockClient.from.mockReturnValue(chainable);

      const result = await service.clearConversationHistory('user-1', 'org-1');

      expect(mockClient.from).toHaveBeenCalledWith('chat_conversations');
      expect(chainable.delete).toHaveBeenCalled();
      expect(chainable.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chainable.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw on delete error', async () => {
      const chainable = createChainableMock({ error: { message: 'delete failed' } });
      mockClient.from.mockReturnValue(chainable);

      await expect(
        service.clearConversationHistory('user-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOrganizationAccess', () => {
    it('should pass for active organization user', async () => {
      const chainable = createChainableMock({ data: { organization_id: 'org-1' }, error: null });
      mockClient.from.mockReturnValue(chainable);

      await expect(
        service.verifyOrganizationAccess('user-1', 'org-1'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-member', async () => {
      const chainable = createChainableMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chainable);

      await expect(
        service.verifyOrganizationAccess('user-1', 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
