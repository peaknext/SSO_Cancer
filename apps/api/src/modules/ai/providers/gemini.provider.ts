import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.config.model}:generateContent?key=${request.config.apiKey}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${request.systemPrompt}\n\n${request.userPrompt}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.config.maxTokens,
        temperature: request.config.temperature,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Gemini API error ${response.status}: ${error}`);
      throw new Error(`Gemini API error ${response.status}: ${error.substring(0, 200)}`);
    }

    const json = await response.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = json.usageMetadata?.totalTokenCount || null;

    return {
      content,
      tokensUsed,
      latencyMs: Date.now() - startTime,
      model: request.config.model,
      provider: 'gemini',
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
