import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import { BaseAIProvider } from '../../ai-reports/providers/base-ai.provider';
import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProvider,
} from '../../ai-reports/interfaces';

@Injectable()
export class ZaiProvider extends BaseAIProvider {
  private readonly envApiKey: string;
  private readonly apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private readonly defaultModel = 'glm-4-plus';

  constructor(configService: ConfigService) {
    super(configService, 'zai' as AIProvider);
    this.envApiKey = this.configService.get<string>('ZAI_API_KEY', '');
  }

  private getEffectiveApiKey(): string {
    const apiKey = this.dynamicApiKey || this.envApiKey;
    return this.generateZaiToken(apiKey);
  }

  /**
   * Generate Z.ai JWT token from API key
   * API key format: id.secret
   */
  private generateZaiToken(apiKey: string): string {
    try {
      const [id, secret] = apiKey.split('.');
      if (!id || !secret) {
        throw new Error('Invalid Z.ai API key format');
      }

      const payload = {
        api_key: id,
        exp: Date.now() + 3600 * 1000, // 1 hour expiration
        timestamp: Date.now(),
      };

      return jwt.sign(payload, secret, { algorithm: 'HS256' });
    } catch (error) {
      this.logger.error('Failed to generate Z.ai token', error);
      return apiKey;
    }
  }

  validateConfig(): boolean {
    const apiKey = this.dynamicApiKey || this.envApiKey;
    const isValid = !!apiKey && apiKey.includes('.') && apiKey.split('.').length === 2;
    if (!isValid) {
      this.logger.warn('Z.ai API key not configured or invalid format (expected: id.secret)');
    }
    return isValid;
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const model = request.config.model || this.defaultModel;
    const apiKey = this.getEffectiveApiKey();

    if (!this.validateConfig()) {
      throw new Error('Z.ai API key is not configured');
    }

    this.logger.log(`Generating with Z.ai model: ${model}`);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model,
          messages: this.buildMessages(request.systemPrompt, request.userPrompt),
          temperature: request.config.temperature ?? 0.7,
          max_tokens: request.config.maxTokens ?? 8192,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000, // 3 minutes timeout for chat with context
        },
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens;

      this.logger.log(`Z.ai generation complete. Tokens used: ${tokensUsed}`);

      return {
        content,
        provider: 'zai' as AIProvider,
        model,
        tokensUsed,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = (error as AxiosError).response?.data
          ? JSON.stringify((error as AxiosError).response?.data)
          : error.message;
        this.logger.error(`Z.ai API error: ${errorMessage}`);
        throw new Error(`Z.ai API error: ${errorMessage}`);
      }
      return this.handleError(error, 'Z.ai generation');
    }
  }
}
