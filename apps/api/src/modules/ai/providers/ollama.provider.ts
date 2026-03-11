import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly MAX_RETRIES = 2;

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();
    const baseUrl = (request.config.baseUrl || 'https://ollama.peaknext.cloud').replace(/\/+$/, '');
    const model = request.config.model || 'llama3.2';

    // Ollama small models need higher num_predict for JSON output (default 128 is too low)
    const numPredict = Math.max(request.config.maxTokens, 1024);

    let lastContent = '';
    let lastJson: any = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const body = {
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: request.config.temperature,
          num_predict: numPredict,
        },
      };

      this.logger.log(
        `Calling Ollama (attempt ${attempt + 1}/${this.MAX_RETRIES + 1}): ${baseUrl}/api/chat ` +
          `model=${model} bodySize=${JSON.stringify(body).length}`,
      );

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(240000),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Ollama API error ${response.status}: ${error}`);
        throw new Error(`Ollama API error ${response.status}: ${error.substring(0, 200)}`);
      }

      lastJson = await response.json();
      lastContent = lastJson.message?.content || '';

      // Validate that response is parseable JSON with required fields
      // Note: small models may include protocolCode but not protocolId — accept either
      const parsed = this.tryExtractJson(lastContent);
      if (parsed && (parsed.recommendedProtocolId || parsed.recommendedProtocolCode)) {
        this.logger.log(
          `Ollama returned valid JSON on attempt ${attempt + 1} ` +
            `(code=${parsed.recommendedProtocolCode}, id=${parsed.recommendedProtocolId}, ` +
            `confidence=${parsed.confidenceScore})`,
        );
        return {
          content: JSON.stringify(parsed),
          tokensUsed: lastJson.eval_count ?? null,
          latencyMs: Date.now() - startTime,
          model: lastJson.model || model,
          provider: 'ollama',
        };
      }

      this.logger.warn(
        `Ollama attempt ${attempt + 1} returned invalid JSON: ${lastContent.substring(0, 300)}`,
      );
    }

    // All retries failed — return the last content anyway for parseAiResponse to handle
    this.logger.error(
      `Ollama failed to return valid JSON after ${this.MAX_RETRIES + 1} attempts. ` +
        `Last response: ${lastContent.substring(0, 500)}`,
    );

    return {
      content: lastContent,
      tokensUsed: lastJson?.eval_count ?? null,
      latencyMs: Date.now() - startTime,
      model: lastJson?.model || model,
      provider: 'ollama',
    };
  }

  /**
   * Try to extract a valid JSON object from Ollama's response.
   * Handles: raw JSON, markdown code blocks, JSON embedded in prose.
   */
  private tryExtractJson(content: string): any | null {
    if (!content?.trim()) return null;

    let jsonStr = content.trim();

    // 1. Try direct parse
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {}

    // 2. Try extracting from markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {}
    }

    // 3. Try finding JSON object in prose (first { to last })
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
      } catch {}
    }

    return null;
  }

  async validateApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const url = `${(baseUrl || 'https://ollama.peaknext.cloud').replace(/\/+$/, '')}/api/version`;
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
