import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async saveMessage(
    userId: string,
    organizationId: string,
    role: 'user' | 'assistant',
    content: string,
    language?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    await client.from('chat_conversations').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      content,
      language: language || 'en',
      metadata: metadata || {},
    });
  }

  async getRecentHistory(
    userId: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const client = this.databaseService.getAdminClient();
      const { data: messages } = await client
        .from('chat_conversations')
        .select('role, content')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (messages || []).reverse().map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      this.logger.warn(`Failed to load conversation history: ${error.message}`);
      return [];
    }
  }

  async getConversationHistory(
    userId: string,
    organizationId: string,
    limit = 20,
    before?: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get total count
    const { count } = await client
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    // Build query — fetch newest first, optionally before a cursor
    let query = client
      .from('chat_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages } = await query;

    // Reverse to chronological order for the client
    const sorted = (messages || []).reverse();

    return {
      messages: sorted.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata,
      })),
      total: count || 0,
      hasMore: (messages || []).length === limit,
    };
  }

  async clearConversationHistory(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('chat_conversations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to clear chat history: ${error.message}`);
      throw new BadRequestException(`Failed to clear chat history: ${error.message}`);
    }

    return { success: true };
  }
}
