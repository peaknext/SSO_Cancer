import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();
    const baseUrl = request.config.baseUrl || 'https://ollama.peaknext.cloud';

    const body = {
      model: request.config.model || 'llama3.2',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      stream: false,
      options: {
        temperature: request.config.temperature,
        num_predict: request.config.maxTokens,
      },
    };

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Ollama API error ${response.status}: ${error}`);
      throw new Error(`Ollama API error ${response.status}: ${error.substring(0, 200)}`);
    }

    const json = await response.json();
    const content = json.message?.content || '';

    return {
      content,
      tokensUsed: json.eval_count ?? null,
      latencyMs: Date.now() - startTime,
      model: json.model || request.config.model,
      provider: 'ollama',
    };
  }

  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const url = `${baseUrl || 'https://ollama.peaknext.cloud'}/api/version`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
