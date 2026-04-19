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
  private readonly defaultModel = 'openai/gpt-oss-120b';

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
          max_tokens: request.config.maxTokens ?? 8192,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 minutes timeout for AI generation
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

  async generateStream(request: {
    systemPrompt: string;
    userPrompt: string;
    config: AIGenerationRequest['config'];
    onToken: (token: string) => void;
    onComplete: (meta?: { tokensUsed?: number }) => void;
    onError: (error: Error) => void;
  }): Promise<void> {
    const model = request.config.model || this.defaultModel;
    const apiKey = this.getEffectiveApiKey();

    if (!this.validateConfig()) {
      request.onError(new Error('Groq API key is not configured'));
      return;
    }

    this.logger.log(`Streaming with Groq model: ${model}`);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model,
          messages: this.buildMessages(request.systemPrompt, request.userPrompt),
          temperature: request.config.temperature ?? 0.7,
          max_tokens: request.config.maxTokens ?? 8192,
          stream: true,
          stream_options: { include_usage: true },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000,
          responseType: 'stream',
        },
      );

      await new Promise<void>((resolve, reject) => {
        const stream = response.data as NodeJS.ReadableStream;
        let buffer = '';
        let isSettled = false;
        let isComplete = false;
        let streamTokensUsed: number | undefined;

        const cleanup = () => {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onStreamError);
        };

        const finishSuccess = () => {
          if (isSettled) {
            return;
          }

          isSettled = true;
          isComplete = true;
          cleanup();
          request.onComplete(
            streamTokensUsed != null ? { tokensUsed: streamTokensUsed } : undefined,
          );
          resolve();
        };

        const finishError = (error: Error) => {
          if (isSettled) {
            return;
          }

          isSettled = true;
          cleanup();
          reject(error);
        };

        const processSseLine = (line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) {
            return;
          }

          const data = trimmedLine.slice(5).trim();
          if (!data) {
            return;
          }

          if (data === '[DONE]') {
            finishSuccess();
            return;
          }

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            finishError(
              new Error(
                `Failed to parse Groq stream chunk: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
            return;
          }

          if (parsed.error) {
            finishError(new Error(`Groq stream error: ${parsed.error.message || 'Unknown error'}`));
            return;
          }

          if (parsed.usage?.total_tokens) {
            streamTokensUsed = parsed.usage.total_tokens;
          }

          if (
            Array.isArray(parsed.choices) &&
            parsed.choices.length === 0 &&
            parsed.finish_reason === 'stop'
          ) {
            finishSuccess();
            return;
          }

          const token = parsed.choices?.[0]?.delta?.content;
          if (typeof token === 'string' && token.length > 0) {
            request.onToken(token);
          }
        };

        const onData = (chunk: Buffer | string) => {
          if (isSettled) {
            return;
          }

          buffer += chunk.toString();
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            processSseLine(line);
            if (isSettled) {
              return;
            }
          }
        };

        const onEnd = () => {
          if (isSettled) {
            return;
          }

          if (buffer.trim()) {
            processSseLine(buffer);
            buffer = '';
          }

          if (!isComplete && !isSettled) {
            finishError(new Error('Groq stream ended unexpectedly before completion'));
          }
        };

        const onStreamError = (error: Error) => {
          finishError(new Error(`Groq stream interrupted: ${error.message}`));
        };

        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onStreamError);
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        this.logger.error(`Groq streaming API error: ${errorMessage}`);
        request.onError(new Error(`Groq API error: ${errorMessage}`));
        return;
      }

      this.logger.error(`Groq streaming failed: ${error instanceof Error ? error.message : String(error)}`);
      request.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
