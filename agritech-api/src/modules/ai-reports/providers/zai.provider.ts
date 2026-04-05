import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { formatAxiosErrorForLog } from '../../../common/utils/safe-json-stringify';
import * as jwt from 'jsonwebtoken';
import { BaseAIProvider } from './base-ai.provider';
import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProvider,
} from '../interfaces';

@Injectable()
export class ZaiProvider extends BaseAIProvider {
  private readonly envApiKey: string;
  private readonly apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private readonly defaultModel = 'GLM-4.7-Flash';

  constructor(configService: ConfigService) {
    super(configService, AIProvider.ZAI);
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

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const payload = {
        api_key: id,
        exp: nowInSeconds + 3600, // 1 hour expiration (in SECONDS)
        timestamp: nowInSeconds,   // Z.ai requires this in SECONDS
      };

      // Z.ai requires sign_type: 'SIGN' in JWT header
      return jwt.sign(payload, secret, { 
        algorithm: 'HS256',
        header: { alg: 'HS256', sign_type: 'SIGN' }
      } as jwt.SignOptions);
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
          timeout: 300000, // 5 minutes timeout for AI reports
        },
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens;

      this.logger.log(`Z.ai generation complete. Tokens used: ${tokensUsed}`);

      return {
        content,
        provider: AIProvider.ZAI,
        model,
        tokensUsed,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = formatAxiosErrorForLog(error as AxiosError);
        this.logger.error(`Z.ai API error: ${errorMessage}`);
        throw new Error(`Z.ai API error: ${errorMessage}`);
      }
      return this.handleError(error, 'Z.ai generation');
    }
  }
}
