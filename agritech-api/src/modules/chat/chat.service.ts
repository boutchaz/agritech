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
import { StructuredResponseService } from './prompt/structured-response.service';
import { AiQuotaService } from '../ai-quota/ai-quota.service';
import { ChatToolsService } from './tools/chat-tools.service';
import { safeJsonStringifyForError } from '../../common/utils/safe-json-stringify';
import {
  ZaiChatMessage,
  ZaiToolCall,
  ZaiToolGenerationResponse,
} from './providers/zai.provider';

type VisionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private readonly zaiProvider: ZaiProvider;
  private readonly defaultTextModel = 'GLM-4.7-Flash';
  private readonly visionModel = 'glm-4.6v';
  private readonly maxToolIterations = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly ttsProvider: ZaiTTSProvider,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly conversationService: ConversationService,
    private readonly agromindiaContextService: AgromindiaContextService,
    private readonly followUpService: FollowUpService,
    private readonly structuredResponseService: StructuredResponseService,
    private readonly aiQuotaService: AiQuotaService,
    private readonly chatToolsService: ChatToolsService,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
  }

  onModuleInit() {
    // Wire AgromindIA context into ContextBuilder
    this.contextBuilder.setAgromindiaContextService(this.agromindiaContextService);
    this.logger.log('AgromindIA context service wired into ContextBuilder');
  }

  private isVisionRequest(dto: SendMessageDto): boolean {
    return typeof dto.image === 'string' && dto.image.trim().length > 0;
  }

  private buildVisionSystemPrompt(language: string): string {
    return [
      'You are AgromindIA, an elite agricultural vision assistant for Moroccan farms.',
      'Analyze uploaded farm images with agronomic rigor: symptoms, pests, diseases, stress signs, and uncertainty.',
      'Do NOT give full operational treatment programs (products, doses, spray schedules, irrigation volumes) — those belong to Calibration and validated Agromind plans in the app. You may suggest non-prescriptive next steps (e.g. scout, sample, consult parcel diagnostics).',
      'Be explicit about uncertainty: if the image is inconclusive, say so and recommend the next best observation or test.',
      `Respond in ${language}.`,
      'Keep answers grounded in the provided agricultural context and the uploaded image.',
    ].join(' ');
  }

  private buildVisionContent(userPrompt: string, image: string): VisionContentPart[] {
    return [
      { type: 'text', text: userPrompt },
      { type: 'image_url', image_url: { url: image } },
    ];
  }

  private shouldEnableTools(dto: SendMessageDto, isVisionRequest: boolean): boolean {
    return dto.enableTools === true && !isVisionRequest;
  }

  /** Normalize model output: JSON { text, suggestions, data_cards } or legacy ---SUGGESTIONS--- block */
  private finalizeAssistantContent(fullResponse: string): { cleanText: string; suggestions: string[] } {
    const structuredResponse = this.structuredResponseService.parseStructuredResponse(fullResponse);
    const fallbackResponse =
      structuredResponse.text === fullResponse && structuredResponse.suggestions.length === 0
        ? this.followUpService.parseSuggestions(fullResponse)
        : null;

    return {
      cleanText: fallbackResponse?.cleanText ?? structuredResponse.text,
      suggestions: fallbackResponse?.suggestions ?? structuredResponse.suggestions,
    };
  }

  private buildToolMessages(systemPrompt: string, userPrompt: string): ZaiChatMessage[] {
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private parseToolArguments(toolCall: ZaiToolCall): Record<string, any> {
    const rawArguments = toolCall.function?.arguments;
    if (typeof rawArguments !== 'string' || rawArguments.trim().length === 0) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Tool arguments must be a JSON object');
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `Invalid JSON arguments for tool ${toolCall.function?.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async runToolLoop(
    messages: ZaiChatMessage[],
    userId: string,
    organizationId: string,
  ): Promise<ZaiToolGenerationResponse> {
    const tools = this.chatToolsService.getToolDefinitions();
    let response = await this.zaiProvider.generateWithTools({
      messages,
      tools,
      toolChoice: 'auto',
      config: {
        provider: 'zai' as any,
        model: this.defaultTextModel,
        temperature: 0.7,
        maxTokens: 8192,
      },
    });

    for (let iteration = 0; iteration < this.maxToolIterations; iteration++) {
      const toolCalls = response.toolCalls ?? [];
      if (toolCalls.length === 0) {
        return response;
      }

      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const parameters = this.parseToolArguments(toolCall);
        const result = await this.chatToolsService.executeTool(
          toolCall.function.name,
          parameters,
          userId,
          organizationId,
        );

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: (() => {
            try {
              return JSON.stringify(result);
            } catch {
              return JSON.stringify({
                error: 'Tool result could not be serialized',
                detail: safeJsonStringifyForError(result, 500),
              });
            }
          })(),
        });
      }

      response = await this.zaiProvider.generateWithTools({
        messages,
        tools,
        toolChoice: 'auto',
        config: {
          provider: 'zai' as any,
          model: this.defaultTextModel,
          temperature: 0.7,
          maxTokens: 8192,
        },
      });
    }

    throw new Error('Tool call iteration limit reached');
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
    const language = dto.language || 'en';
    const isVisionRequest = this.isVisionRequest(dto);
    const enableTools = this.shouldEnableTools(dto, isVisionRequest);
    const systemPrompt = isVisionRequest
      ? this.buildVisionSystemPrompt(language)
      : this.promptBuilder.buildSystemPrompt({ enableTools });
    const userPrompt = this.promptBuilder.buildUserPrompt(
      dto.query,
      context,
      language,
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
      const response = isVisionRequest
        ? await this.zaiProvider.generateVision({
            systemPrompt,
            content: this.buildVisionContent(userPrompt, dto.image!.trim()),
            config: {
              provider: 'zai' as any,
              temperature: 0.7,
              maxTokens: 8192,
            },
          })
        : enableTools
          ? await this.runToolLoop(
              this.buildToolMessages(systemPrompt, userPrompt),
              userId,
              organizationId,
            )
          : await this.zaiProvider.generate({
              systemPrompt,
              userPrompt,
              config: {
                provider: 'zai' as any,
                model: this.defaultTextModel,
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

      const { cleanText, suggestions } = this.finalizeAssistantContent(response.content);

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
    const language = dto.language || 'en';
    const isVisionRequest = this.isVisionRequest(dto);
    const systemPrompt = isVisionRequest
      ? this.buildVisionSystemPrompt(language)
      : this.promptBuilder.buildSystemPrompt({ enableTools: false });
    const userPrompt = this.promptBuilder.buildUserPrompt(
      dto.query,
      context,
      language,
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

    // Tool calling is intentionally disabled for streaming in this first rollout.
    // Future enhancement: support tool-aware SSE orchestration with multi-step agent loops.

    const model = isVisionRequest ? this.visionModel : this.defaultTextModel;
    const streamCallbacks = {
      onToken: (token: string) => {
        fullResponse += token;
        callbacks.onToken(token);
      },
      onComplete: async () => {
        const { cleanText, suggestions } = this.finalizeAssistantContent(fullResponse);

        this.aiQuotaService.logUsage(organizationId, userId, 'chat', 'zai', model, null, false).catch(() => {});

        if (shouldSaveHistory) {
          await this.conversationService.saveMessage(userId, organizationId, 'assistant', cleanText, dto.language, {
            provider: 'zai',
            model,
            streamed: true,
          });
        }
        callbacks.onComplete({
          provider: 'zai',
          model,
          timestamp: new Date(),
          suggestions,
          cleanText,
        });
      },
      onError: (error: Error) => {
        this.logger.error(`Stream generation failed: ${error.message}`, error.stack);
        callbacks.onError(error);
      },
    };

    if (isVisionRequest) {
      await this.zaiProvider.generateVisionStream({
        systemPrompt,
        content: this.buildVisionContent(userPrompt, dto.image!.trim()),
        config: {
          provider: 'zai' as any,
          temperature: 0.7,
          maxTokens: 8192,
        },
        ...streamCallbacks,
      });
      return;
    }

    await this.zaiProvider.generateStream({
      systemPrompt,
      userPrompt,
      config: {
        provider: 'zai' as any,
        model: this.defaultTextModel,
        temperature: 0.7,
        maxTokens: 8192,
      },
      ...streamCallbacks,
    });
  }

  async getConversationHistory(userId: string, organizationId: string, limit?: number, before?: string) {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);
    return this.conversationService.getConversationHistory(userId, organizationId, limit, before);
  }

  async clearConversationHistory(userId: string, organizationId: string) {
    await this.conversationService.verifyOrganizationAccess(userId, organizationId);
    return this.conversationService.clearConversationHistory(userId, organizationId);
  }

  async textToSpeech(
    _organizationId: string,
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
