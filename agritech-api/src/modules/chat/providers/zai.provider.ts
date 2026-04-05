import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import { BaseAIProvider } from '../../ai-reports/providers/base-ai.provider';
import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProvider,
} from '../../ai-reports/interfaces';
import { ToolDefinition } from '../tools/chat-tools.service';
import { formatAxiosErrorForLog, streamApiErrorMessage } from '../../../common/utils/safe-json-stringify';

export interface ZaiToolCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ZaiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ZaiToolCall[];
}

export interface ZaiToolGenerationResponse extends AIGenerationResponse {
  toolCalls?: ZaiToolCall[];
  finishReason?: string | null;
}

@Injectable()
export class ZaiProvider extends BaseAIProvider {
  private readonly envApiKey: string;
  private readonly apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private readonly defaultModel = 'GLM-4.7-Flash';
  private readonly visionModel = 'glm-4.6v';

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

    private buildVisionMessages(
      systemPrompt: string,
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >,
    ) {
      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ];
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
              response_format: { type: 'json_object' },
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
            const errorMessage = formatAxiosErrorForLog(error as AxiosError);
            this.logger.error(`Z.ai API error: ${errorMessage}`);
            throw new Error(`Z.ai API error: ${errorMessage}`);
          }
          return this.handleError(error, 'Z.ai generation');
        }
      });
    }

    async generateWithTools(request: {
      messages: ZaiChatMessage[];
      tools: ToolDefinition[];
      toolChoice?: 'auto' | 'none';
      config: any;
    }): Promise<ZaiToolGenerationResponse> {
      const model = request.config.model || this.defaultModel;
      const apiKey = this.getEffectiveApiKey();

      if (!this.validateConfig()) {
        throw new Error('Z.ai API key is not configured');
      }

      this.logger.log(`Generating with tools using Z.ai model: ${model}`);

      return this.retryWithBackoff(async () => {
        try {
          const response = await axios.post(
            this.apiUrl,
            {
              model,
              messages: request.messages,
              tools: request.tools,
              tool_choice: request.toolChoice ?? 'auto',
              temperature: request.config.temperature ?? 0.7,
              max_tokens: request.config.maxTokens ?? 8192,
              response_format: { type: 'json_object' },
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 180000,
            },
          );

          const choice = response.data.choices?.[0];
          const content = choice?.message?.content || '';
          const tokensUsed = response.data.usage?.total_tokens;
          const toolCalls = Array.isArray(choice?.message?.tool_calls)
            ? (choice.message.tool_calls as ZaiToolCall[])
            : undefined;

          return {
            content,
            provider: 'zai' as AIProvider,
            model,
            tokensUsed,
            generatedAt: new Date(),
            toolCalls,
            finishReason: choice?.finish_reason ?? null,
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const errorMessage = formatAxiosErrorForLog(error as AxiosError);
            this.logger.error(`Z.ai API tool error: ${errorMessage}`);
            throw new Error(`Z.ai API error: ${errorMessage}`);
          }
          return this.handleError(error, 'Z.ai tool generation');
        }
      });
    }

    async generateStream(request: {
      systemPrompt: string;
      userPrompt: string;
      config: any;
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }): Promise<void> {
      try {
        const model = request.config.model || this.defaultModel;
        const apiKey = this.getEffectiveApiKey();

        if (!this.validateConfig()) {
          throw new Error('Z.ai API key is not configured');
        }

        this.logger.log(`Streaming with Z.ai model: ${model}`);

        const response = await this.retryWithBackoff(async () => {
          try {
            return await axios.post(
              this.apiUrl,
              {
                model,
                messages: this.buildMessages(request.systemPrompt, request.userPrompt),
                temperature: request.config.temperature ?? 0.7,
                max_tokens: request.config.maxTokens ?? 8192,
                stream: true,
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: 180000,
                responseType: 'stream',
              },
            );
          } catch (error) {
            if (axios.isAxiosError(error)) {
              const errorMessage = formatAxiosErrorForLog(error as AxiosError);
              this.logger.error(`Z.ai streaming API error: ${errorMessage}`);
              throw new Error(`Z.ai streaming API error: ${errorMessage}`);
            }

            throw error;
          }
        });

        await new Promise<void>((resolve, reject) => {
          const stream = response.data as NodeJS.ReadableStream;
          let buffer = '';
          let isSettled = false;
          let isComplete = false;

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
            request.onComplete();
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
              finishError(new Error(`Failed to parse Z.ai stream chunk: ${error instanceof Error ? error.message : String(error)}`));
              return;
            }

            if (parsed.error) {
              const message = streamApiErrorMessage(parsed.error);
              finishError(new Error(`Z.ai stream error: ${message}`));
              return;
            }

            if (Array.isArray(parsed.choices) && parsed.choices.length === 0 && parsed.finish_reason === 'stop') {
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
              finishError(new Error('Z.ai stream ended unexpectedly before completion'));
            }
          };

          const onStreamError = (error: Error) => {
            finishError(new Error(`Z.ai stream interrupted: ${error.message}`));
          };

          stream.on('data', onData);
          stream.on('end', onEnd);
          stream.on('error', onStreamError);
        });
      } catch (error) {
        this.logger.error(`Streaming failed: ${error.message}`, error.stack);
        request.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    async generateStreamWithTools(request: {
      messages: ZaiChatMessage[];
      tools: ToolDefinition[];
      toolChoice?: 'auto' | 'none';
      config: any;
      onToken: (token: string) => void;
      onToolCalls?: (toolCalls: ZaiToolCall[]) => void;
      onComplete: (result?: { toolCalls?: ZaiToolCall[] }) => void;
      onError: (error: Error) => void;
    }): Promise<void> {
      try {
        const model = request.config.model || this.defaultModel;
        const apiKey = this.getEffectiveApiKey();

        if (!this.validateConfig()) {
          throw new Error('Z.ai API key is not configured');
        }

        this.logger.log(`Streaming with tools using Z.ai model: ${model}`);

        const response = await this.retryWithBackoff(async () => {
          try {
            return await axios.post(
              this.apiUrl,
              {
                model,
                messages: request.messages,
                tools: request.tools,
                tool_choice: request.toolChoice ?? 'auto',
                temperature: request.config.temperature ?? 0.7,
                max_tokens: request.config.maxTokens ?? 8192,
                stream: true,
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: 180000,
                responseType: 'stream',
              },
            );
          } catch (error) {
            if (axios.isAxiosError(error)) {
              const errorMessage = formatAxiosErrorForLog(error as AxiosError);
              this.logger.error(`Z.ai streaming API tool error: ${errorMessage}`);
              throw new Error(`Z.ai streaming API error: ${errorMessage}`);
            }

            throw error;
          }
        });

        await new Promise<void>((resolve, reject) => {
          const stream = response.data as NodeJS.ReadableStream;
          let buffer = '';
          let isSettled = false;
          let isComplete = false;
          const toolCallMap = new Map<number, ZaiToolCall>();

          const cleanup = () => {
            stream.removeListener('data', onData);
            stream.removeListener('end', onEnd);
            stream.removeListener('error', onStreamError);
          };

          const getToolCalls = () =>
            Array.from(toolCallMap.entries())
              .sort(([left], [right]) => left - right)
              .map(([, toolCall]) => toolCall);

          const finishSuccess = () => {
            if (isSettled) {
              return;
            }

            isSettled = true;
            isComplete = true;
            cleanup();
            request.onComplete({ toolCalls: getToolCalls() });
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

          const processToolCalls = (deltaToolCalls: any[]) => {
            for (const rawToolCall of deltaToolCalls) {
              const index = typeof rawToolCall.index === 'number' ? rawToolCall.index : 0;
              const existing = toolCallMap.get(index) ?? {
                id: rawToolCall.id,
                type: 'function' as const,
                function: {
                  name: '',
                  arguments: '',
                },
              };

              if (typeof rawToolCall.id === 'string') {
                existing.id = rawToolCall.id;
              }
              if (typeof rawToolCall.type === 'string') {
                existing.type = rawToolCall.type;
              }
              if (typeof rawToolCall.function?.name === 'string') {
                existing.function.name += rawToolCall.function.name;
              }
              if (typeof rawToolCall.function?.arguments === 'string') {
                existing.function.arguments += rawToolCall.function.arguments;
              }

              toolCallMap.set(index, existing);
            }

            request.onToolCalls?.(getToolCalls());
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
              finishError(new Error(`Failed to parse Z.ai tool stream chunk: ${error instanceof Error ? error.message : String(error)}`));
              return;
            }

            if (parsed.error) {
              const message = streamApiErrorMessage(parsed.error);
              finishError(new Error(`Z.ai tool stream error: ${message}`));
              return;
            }

            if (Array.isArray(parsed.choices) && parsed.choices.length === 0 && parsed.finish_reason === 'stop') {
              finishSuccess();
              return;
            }

            const delta = parsed.choices?.[0]?.delta;
            const token = delta?.content;
            if (typeof token === 'string' && token.length > 0) {
              request.onToken(token);
            }

            if (Array.isArray(delta?.tool_calls) && delta.tool_calls.length > 0) {
              processToolCalls(delta.tool_calls);
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
              finishError(new Error('Z.ai tool stream ended unexpectedly before completion'));
            }
          };

          const onStreamError = (error: Error) => {
            finishError(new Error(`Z.ai tool stream interrupted: ${error.message}`));
          };

          stream.on('data', onData);
          stream.on('end', onEnd);
          stream.on('error', onStreamError);
        });
      } catch (error) {
        this.logger.error(`Tool streaming failed: ${error.message}`, error.stack);
        request.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    async generateVision(request: {
      systemPrompt: string;
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
      config: any;
    }): Promise<AIGenerationResponse> {
      const model = this.visionModel;
      const apiKey = this.getEffectiveApiKey();

      if (!this.validateConfig()) {
        throw new Error('Z.ai API key is not configured');
      }

      this.logger.log(`Generating vision response with Z.ai model: ${model}`);

      return this.retryWithBackoff(async () => {
        try {
          const response = await axios.post(
            this.apiUrl,
            {
              model,
              messages: this.buildVisionMessages(request.systemPrompt, request.content),
              temperature: request.config.temperature ?? 0.7,
              max_tokens: request.config.maxTokens ?? 8192,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 180000,
            },
          );

          const content = response.data.choices?.[0]?.message?.content || '';
          const tokensUsed = response.data.usage?.total_tokens;

          this.logger.log(`Z.ai vision generation complete. Tokens used: ${tokensUsed}`);

          return {
            content,
            provider: 'zai' as AIProvider,
            model,
            tokensUsed,
            generatedAt: new Date(),
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const errorMessage = formatAxiosErrorForLog(error as AxiosError);
            this.logger.error(`Z.ai vision API error: ${errorMessage}`);
            throw new Error(`Z.ai vision API error: ${errorMessage}`);
          }
          return this.handleError(error, 'Z.ai vision generation');
        }
      });
    }

    async generateVisionStream(request: {
      systemPrompt: string;
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
      config: any;
      onToken: (token: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }): Promise<void> {
      try {
        const model = this.visionModel;
        const apiKey = this.getEffectiveApiKey();

        if (!this.validateConfig()) {
          throw new Error('Z.ai API key is not configured');
        }

        this.logger.log(`Streaming vision response with Z.ai model: ${model}`);

        const response = await this.retryWithBackoff(async () => {
          try {
            return await axios.post(
              this.apiUrl,
              {
                model,
                messages: this.buildVisionMessages(request.systemPrompt, request.content),
                temperature: request.config.temperature ?? 0.7,
                max_tokens: request.config.maxTokens ?? 8192,
                stream: true,
              },
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                timeout: 180000,
                responseType: 'stream',
              },
            );
          } catch (error) {
            if (axios.isAxiosError(error)) {
              const errorMessage = formatAxiosErrorForLog(error as AxiosError);
              this.logger.error(`Z.ai vision streaming API error: ${errorMessage}`);
              throw new Error(`Z.ai vision streaming API error: ${errorMessage}`);
            }

            throw error;
          }
        });

        await new Promise<void>((resolve, reject) => {
          const stream = response.data as NodeJS.ReadableStream;
          let buffer = '';
          let isSettled = false;
          let isComplete = false;

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
            request.onComplete();
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
              finishError(new Error(`Failed to parse Z.ai vision stream chunk: ${error instanceof Error ? error.message : String(error)}`));
              return;
            }

            if (parsed.error) {
              const message = streamApiErrorMessage(parsed.error);
              finishError(new Error(`Z.ai vision stream error: ${message}`));
              return;
            }

            if (Array.isArray(parsed.choices) && parsed.choices.length === 0 && parsed.finish_reason === 'stop') {
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
              finishError(new Error('Z.ai vision stream ended unexpectedly before completion'));
            }
          };

          const onStreamError = (error: Error) => {
            finishError(new Error(`Z.ai vision stream interrupted: ${error.message}`));
          };

          stream.on('data', onData);
          stream.on('end', onEnd);
          stream.on('error', onStreamError);
        });
      } catch (error) {
        this.logger.error(`Vision streaming failed: ${error.message}`, error.stack);
        request.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
}
