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
  private readonly defaultModel = 'GLM-4.5-Flash';

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

   /**
    * Retry operation with exponential backoff
    * Retries on network errors and 5xx server errors
    * Does NOT retry on 4xx client errors
    */
   private async retryWithBackoff<T>(
     operation: () => Promise<T>,
     maxRetries = 3,
     baseDelay = 1000,
   ): Promise<T> {
     let lastError: Error;

     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error) {
         lastError = error;

         // Don't retry on client errors (4xx)
         if (axios.isAxiosError(error) && error.response?.status >= 400 && error.response?.status < 500) {
           throw error;
         }

         // Don't retry on last attempt
         if (attempt === maxRetries - 1) {
           break;
         }

         // Calculate delay with exponential backoff
         const delay = baseDelay * Math.pow(2, attempt);

         this.logger.warn(
           `Z.ai API call failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`,
         );

         // Wait before retry
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }

     throw lastError;
   }

    async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
      const model = request.config.model || this.defaultModel;
      const apiKey = this.getEffectiveApiKey();

      if (!this.validateConfig()) {
        throw new Error('Z.ai API key is not configured');
      }

      this.logger.log(`Generating with Z.ai model: ${model}`);

      return this.retryWithBackoff(async () => {
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
      });
    }

    /**
     * Generate response with simulated streaming
     * Splits the full response into words and yields them with delays
     * for a more natural streaming experience
     */
    async generateStream(request: {
      systemPrompt: string;
      userPrompt: string;
      config: any;
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }): Promise<void> {
      try {
        // Use existing generate() to get full response
        const response = await this.generate({
          systemPrompt: request.systemPrompt,
          userPrompt: request.userPrompt,
          config: request.config,
        });

        // Simulate streaming by splitting into words
        const words = response.content.split(' ');

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          // Add space after word except for the last word
          const token = i < words.length - 1 ? word + ' ' : word;

          // Emit token
          request.onToken(token);

          // Delay between words for realistic streaming (50ms = ~20 words per second)
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Streaming complete
        request.onComplete();
      } catch (error) {
        this.logger.error(`Streaming failed: ${error.message}`, error.stack);
        request.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
}
