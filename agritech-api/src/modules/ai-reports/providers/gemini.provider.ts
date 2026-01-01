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
export class GeminiProvider extends BaseAIProvider {
  private readonly envApiKey: string;
  private readonly defaultModel = 'gemini-1.5-pro';

  constructor(configService: ConfigService) {
    super(configService, AIProvider.GEMINI);
    this.envApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY', '');
  }

  private getEffectiveApiKey(): string {
    return this.dynamicApiKey || this.envApiKey;
  }

  validateConfig(): boolean {
    const apiKey = this.getEffectiveApiKey();
    const isValid = !!apiKey && apiKey.length > 0;
    if (!isValid) {
      this.logger.warn('Google AI API key not configured');
    }
    return isValid;
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const model = request.config.model || this.defaultModel;
    const apiKey = this.getEffectiveApiKey();
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    this.logger.log(`Generating with Gemini model: ${model}`);

    try {
      const response = await axios.post(
        apiUrl,
        {
          contents: [
            {
              parts: [
                {
                  text: `${request.systemPrompt}\n\n${request.userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.config.temperature ?? 0.7,
            maxOutputTokens: request.config.maxTokens ?? 4096,
            responseMimeType: 'application/json',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes timeout for AI generation
        },
      );

      const content =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokensUsed = response.data.usageMetadata?.totalTokenCount;

      this.logger.log(`Gemini generation complete. Tokens used: ${tokensUsed}`);

      return {
        content,
        provider: AIProvider.GEMINI,
        model,
        tokensUsed,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error?.message || error.message;
        this.logger.error(`Gemini API error: ${errorMessage}`);
        throw new Error(`Gemini API error: ${errorMessage}`);
      }
      return this.handleError(error, 'Gemini generation');
    }
  }
}
