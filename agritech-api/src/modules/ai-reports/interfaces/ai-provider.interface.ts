export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

export interface AIProviderConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  config: AIProviderConfig;
}

export interface AIGenerationResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  generatedAt: Date;
}

export interface IAIProvider {
  generate(request: AIGenerationRequest): Promise<AIGenerationResponse>;
  validateConfig(): boolean;
  getProviderName(): AIProvider;
  setApiKey(apiKey: string): void;
}
