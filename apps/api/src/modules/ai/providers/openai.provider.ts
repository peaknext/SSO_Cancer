import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.config.model,
        max_tokens: request.config.maxTokens,
        temperature: request.config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenAI API error ${response.status}: ${error}`);
      throw new Error(`OpenAI API error ${response.status}: ${error.substring(0, 200)}`);
    }

    const json = await response.json();
    return {
      content: json.choices?.[0]?.message?.content || '',
      tokensUsed: json.usage ? json.usage.prompt_tokens + json.usage.completion_tokens : null,
      latencyMs: Date.now() - startTime,
      model: request.config.model,
      provider: 'openai',
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
