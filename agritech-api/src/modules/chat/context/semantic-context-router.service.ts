import { Injectable, Logger } from '@nestjs/common';
import { AIProvider } from '../../ai-reports/interfaces';
import { ContextRouterService, ContextNeeds, ContextModuleKey, MatchedModule } from './context-router.service';
import { ZaiProvider } from '../providers/zai.provider';

interface SemanticClassificationResponse {
  matches?: Array<{
    module?: string;
    confidence?: number;
  }>;
}

@Injectable()
export class SemanticContextRouterService {
  private readonly logger = new Logger(SemanticContextRouterService.name);
  private readonly timeoutMs = 3000;
  private readonly confidenceThreshold = 0.3;
  private readonly moduleKeys: ContextModuleKey[] = [
    'accounting',
    'inventory',
    'production',
    'supplierCustomer',
    'campaigns',
    'reception',
    'compliance',
    'utilities',
    'reports',
    'marketplace',
    'orchards',
    'satellite',
    'weather',
    'soil',
    'alerts',
    'forecast',
    'settings',
    'agromindiaIntel',
  ];

  constructor(
    private readonly keywordRouter: ContextRouterService,
    private readonly zaiProvider: ZaiProvider,
  ) {}

  async analyzeQuery(query: string): Promise<ContextNeeds> {
    if (!this.zaiProvider.validateConfig()) {
      this.logger.debug('Z.ai unavailable for semantic routing, using keyword fallback');
      return this.keywordRouter.analyzeQuery(query);
    }

    try {
      const matchedModules = await this.classifyWithGlm(query);

      if (matchedModules.length === 0) {
        this.logger.debug('Semantic router returned no confident matches, using keyword fallback');
        return this.keywordRouter.analyzeQuery(query);
      }

      return this.keywordRouter.createContextNeeds(query, matchedModules);
    } catch (error) {
      this.logger.warn(
        `Semantic routing failed, using keyword fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.keywordRouter.analyzeQuery(query);
    }
  }

  getMatchedModules(): MatchedModule[] {
    return this.keywordRouter.getMatchedModules();
  }

  private async classifyWithGlm(query: string): Promise<MatchedModule[]> {
    const response = await Promise.race([
      this.zaiProvider.generate({
        systemPrompt: this.buildSystemPrompt(),
        userPrompt: `Query: ${JSON.stringify(query)}`,
        config: {
          provider: AIProvider.ZAI,
          model: 'GLM-4.7-Flash',
          temperature: 0.1,
          maxTokens: 200,
        },
      }),
      this.createTimeoutPromise(),
    ]);

    return this.parseClassificationResponse(response.content);
  }

  private buildSystemPrompt(): string {
    return [
      'Classify the agricultural query into context modules.',
      'Support English, French, and Arabic.',
      'Return JSON object only: {"matches":[{"module":"accounting","confidence":0.95}]}.',
      'Only include modules with confidence > 0.3.',
      `Available modules: ${this.moduleKeys.join(', ')}.`,
    ].join(' ');
  }

  private parseClassificationResponse(content: string): MatchedModule[] {
    const parsed = JSON.parse(content) as SemanticClassificationResponse;
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];

    return matches
      .map((match) => {
        const module = typeof match.module === 'string' ? match.module : '';
        const confidence = Number(match.confidence);

        if (!this.isContextModuleKey(module) || !Number.isFinite(confidence)) {
          return null;
        }

        return {
          key: module,
          score: confidence,
        } satisfies MatchedModule;
      })
      .filter((match): match is MatchedModule => !!match && match.score > this.confidenceThreshold)
      .sort((a, b) => b.score - a.score);
  }

  private isContextModuleKey(value: string): value is ContextModuleKey {
    return this.moduleKeys.includes(value as ContextModuleKey);
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Semantic routing timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
    });
  }
}
