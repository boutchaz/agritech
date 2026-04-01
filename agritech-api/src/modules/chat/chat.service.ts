import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZaiProvider } from './providers/zai.provider';
import { ZaiTTSProvider, TTSRequest } from './providers/zai-tts.provider';
import { SendMessageDto, ChatResponseDto } from './dto';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ConversationService } from './conversation/conversation.service';
import { AgromindiaContextService } from './context/agromindia-context.service';
import { FollowUpService } from './prompt/follow-up.service';
import { AiQuotaService } from '../ai-quota/ai-quota.service';

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private readonly zaiProvider: ZaiProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly ttsProvider: ZaiTTSProvider,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly conversationService: ConversationService,
    private readonly agromindiaContextService: AgromindiaContextService,
    private readonly followUpService: FollowUpService,
    private readonly aiQuotaService: AiQuotaService,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
  }

  onModuleInit() {
    // Wire AgromindIA context into ContextBuilder
    this.contextBuilder.setAgromindiaContextService(this.agromindiaContextService);
    this.logger.log('AgromindIA context service wired into ContextBuilder');
  }

  async sendMessage(
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);

    this.logger.log(`Building context for chat request in org ${organizationId}`);

    const shouldSaveHistory = dto.save_history !== false;
    const recentMessages = shouldSaveHistory
      ? await this.conversationService.getRecentHistory(userId, organizationId, 10)
      : [];

    const context = await this.contextBuilder.build(organizationId, dto.query);

    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(
      dto.query,
      context,
      dto.language || 'en',
      recentMessages,
    );

    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiProvider.setApiKey(apiKey);

    // Check AI quota before generating
    try {
      const quotaResult = await this.aiQuotaService.checkAndConsume(organizationId, userId, 'chat');
      if (!quotaResult.allowed) {
        throw new BadRequestException({
          message: 'AI quota exceeded',
          error: 'AI_QUOTA_EXCEEDED',
          statusCode: 400,
          limit: quotaResult.limit,
          used: quotaResult.used,
          resetDate: quotaResult.resetDate,
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`Quota check failed, proceeding: ${error.message}`);
    }

    if (shouldSaveHistory) {
      await this.conversationService.saveMessage(userId, organizationId, 'user', dto.query, dto.language);
    }

    try {
      const response = await this.zaiProvider.generate({
        systemPrompt,
        userPrompt,
        config: {
          provider: 'zai' as any,
          model: 'GLM-4.5-Flash',
          temperature: 0.7,
          maxTokens: 8192,
        },
      });

      const tokensUsed = response.tokensUsed || 0;
      const costPerToken = 0.00001;
      const estimatedCost = tokensUsed * costPerToken;

      this.logger.log(
        `Chat cost: ${tokensUsed} tokens, ~$${estimatedCost.toFixed(4)} ` +
        `(org: ${organizationId}, user: ${userId}, model: ${response.model})`,
      );

      // Log AI usage (fire-and-forget)
      this.aiQuotaService.logUsage(organizationId, userId, 'chat', 'zai', response.model, response.tokensUsed, false).catch(() => {});

      // Parse follow-up suggestions from response
      const { cleanText, suggestions } = this.followUpService.parseSuggestions(response.content);

      if (shouldSaveHistory) {
        await this.conversationService.saveMessage(userId, organizationId, 'assistant', cleanText, dto.language, {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
        });
      }

      return {
        response: cleanText,
        context_summary: this.contextBuilder.summarizeContext(context),
        metadata: {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
          timestamp: response.generatedAt,
        },
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Chat generation failed: ${error.message}`, error.stack);

      let errorMessage = error.message || 'Failed to generate response';
      if (error.message?.includes('Z.ai API key') || error.message?.includes('not configured')) {
        errorMessage = 'AI service is not properly configured. Please contact support.';
      } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        errorMessage = 'The AI service took too long to respond. Please try again.';
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to the AI service. Please check your network connection.';
      }

      throw new BadRequestException(errorMessage);
    }
  }

  async sendMessageStream(
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: (metadata: any) => void;
      onError: (error: Error) => void;
    },
  ): Promise<void> {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);

    this.logger.log(`Building context for streaming chat request in org ${organizationId}`);

    const shouldSaveHistory = dto.save_history !== false;
    const recentMessages = shouldSaveHistory
      ? await this.conversationService.getRecentHistory(userId, organizationId, 10)
      : [];

    const context = await this.contextBuilder.build(organizationId, dto.query);
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(
      dto.query,
      context,
      dto.language || 'en',
      recentMessages,
    );

    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiProvider.setApiKey(apiKey);

    // Check AI quota before streaming
    try {
      const quotaResult = await this.aiQuotaService.checkAndConsume(organizationId, userId, 'chat');
      if (!quotaResult.allowed) {
        callbacks.onError(new Error(
          JSON.stringify({
            message: 'AI quota exceeded',
            error: 'AI_QUOTA_EXCEEDED',
            limit: quotaResult.limit,
            used: quotaResult.used,
            resetDate: quotaResult.resetDate,
          }),
        ));
        return;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        callbacks.onError(error);
        return;
      }
      this.logger.warn(`Quota check failed, proceeding: ${error.message}`);
    }

    if (shouldSaveHistory) {
      await this.conversationService.saveMessage(userId, organizationId, 'user', dto.query, dto.language);
    }

    let fullResponse = '';

    await this.zaiProvider.generateStream({
      systemPrompt,
      userPrompt,
      config: {
        provider: 'zai' as any,
        model: 'GLM-4.5-Flash',
        temperature: 0.7,
        maxTokens: 8192,
      },
      onToken: (token: string) => {
        fullResponse += token;
        callbacks.onToken(token);
      },
      onComplete: async () => {
        // Parse follow-up suggestions from the complete response
        const { cleanText, suggestions } = this.followUpService.parseSuggestions(fullResponse);

        // Log AI usage (fire-and-forget)
        this.aiQuotaService.logUsage(organizationId, userId, 'chat', 'zai', 'GLM-4.5-Flash', null, false).catch(() => {});

        if (shouldSaveHistory) {
          await this.conversationService.saveMessage(userId, organizationId, 'assistant', cleanText, dto.language, {
            provider: 'zai',
            model: 'GLM-4.5-Flash',
            streamed: true,
          });
        }
        callbacks.onComplete({
          provider: 'zai',
          model: 'GLM-4.5-Flash',
          timestamp: new Date(),
          suggestions,
        });
      },
      onError: (error: Error) => {
        this.logger.error(`Stream generation failed: ${error.message}`, error.stack);
        callbacks.onError(error);
      },
    });
  }

  async getConversationHistory(userId: string, organizationId: string, limit?: number) {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);
    return this.conversationService.getConversationHistory(userId, organizationId, limit);
  }

  async clearConversationHistory(userId: string, organizationId: string) {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);
    return this.conversationService.clearConversationHistory(userId, organizationId);
  }

  async textToSpeech(
    organizationId: string,
    request: TTSRequest,
  ): Promise<{ audio: Buffer; contentType: string }> {
    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.ttsProvider.setApiKey(apiKey);

    const ttsResponse = await this.ttsProvider.textToSpeech(request);

    return {
      audio: ttsResponse.audio,
      contentType: ttsResponse.contentType,
    };
  }
}
