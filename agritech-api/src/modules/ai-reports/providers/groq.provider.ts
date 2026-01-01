import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BaseAIProvider } from './base-ai.provider';
import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProvider,
} from '../interfaces';

@Injectable()
export class GroqProvider extends BaseAIProvider {
  private readonly envApiKey: string;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly defaultModel = 'llama-3.3-70b-versatile';

  constructor(configService: ConfigService) {
    super(configService, AIProvider.GROQ);
    this.envApiKey = this.configService.get<string>('GROQ_API_KEY', '');
  }

  private getEffectiveApiKey(): string {
    return this.dynamicApiKey || this.envApiKey;
  }

  validateConfig(): boolean {
    const apiKey = this.getEffectiveApiKey();
    const isValid = !!apiKey && apiKey.length > 0;
    if (!isValid) {
      this.logger.warn('Groq API key not configured');
    }
    return isValid;
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const model = request.config.model || this.defaultModel;
    const apiKey = this.getEffectiveApiKey();

    this.logger.log(`Generating with Groq model: ${model}`);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model,
          messages: this.buildMessages(request.systemPrompt, request.userPrompt),
          temperature: request.config.temperature ?? 0.7,
          max_tokens: request.config.maxTokens ?? 4096,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes timeout for AI generation
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens;

      this.logger.log(`Groq generation complete. Tokens used: ${tokensUsed}`);

      return {
        content,
        provider: AIProvider.GROQ,
        model,
        tokensUsed,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        this.logger.error(`Groq API error: ${errorMessage}`);
        throw new Error(`Groq API error: ${errorMessage}`);
      }
      return this.handleError(error, 'Groq generation');
    }
  }
}
