export interface AiProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  config: AiProviderConfig;
}

export interface AiCompletionResponse {
  content: string;
  tokensUsed: number | null;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface AiProvider {
  readonly providerName: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  validateApiKey(apiKey: string): Promise<boolean>;
}
