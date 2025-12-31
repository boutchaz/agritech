import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IAIProvider,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProvider,
} from '../interfaces';

export abstract class BaseAIProvider implements IAIProvider {
  protected readonly logger: Logger;
  protected readonly configService: ConfigService;
  protected readonly providerName: AIProvider;

  constructor(configService: ConfigService, providerName: AIProvider) {
    this.configService = configService;
    this.providerName = providerName;
    this.logger = new Logger(`${providerName}Provider`);
  }

  abstract generate(request: AIGenerationRequest): Promise<AIGenerationResponse>;
  abstract validateConfig(): boolean;

  getProviderName(): AIProvider {
    return this.providerName;
  }

  protected buildMessages(systemPrompt: string, userPrompt: string) {
    return [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];
  }

  protected handleError(error: unknown, operation: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`${operation} failed: ${errorMessage}`);
    throw error;
  }
}
