import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

// ─── Few-shot example injected in Ollama requests ────────────────────────────
// Single concise example teaches the model: stage > drug match, exact JSON format.
// Keep minimal — every token costs ~0.11s on 2 vCPU (qwen2.5:7b).
const FEWSHOT_MESSAGES: { role: string; content: string }[] = [
  {
    role: 'user',
    content: `Cancer: Breast\nICD-10: C50.9\nStage: METASTATIC\nMeds: doxorubicin, cyclophosphamide\n\nCandidates:\n1. ID=1 C0111 type=CHEMOTHERAPY intent=CURATIVE stageMatch=NO regimen=AC(ID=1) drugs=[doxorubicin,cyclophosphamide] drugMatch=100% score=85 preferred=YES\n2. ID=5 C0105 type=CHEMOTHERAPY intent=PALLIATIVE stageMatch=YES regimen=PACLI(ID=8) drugs=[paclitaxel] drugMatch=0% score=65 preferred=NO\n\nPick best. JSON:`,
  },
  {
    role: 'assistant',
    content: `{"recommendedProtocolCode":"C0105","recommendedProtocolId":5,"recommendedRegimenCode":"PACLI","recommendedRegimenId":8,"confidenceScore":65,"reasoning":"เลือก C0105 เพราะ stageMatch=YES intent=PALLIATIVE เหมาะกับระยะแพร่กระจาย ไม่เลือก C0111 แม้ drugMatch=100% แต่ stageMatch=NO intent=CURATIVE ไม่เหมาะกับ metastatic","alternativeProtocols":[],"clinicalNotes":""}`,
  },
];

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly providerName = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly MAX_RETRIES = 1; // Reduced from 2 — each attempt is slow on CPU

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();
    const baseUrl = (request.config.baseUrl || 'https://ollama.peaknext.cloud').replace(/\/+$/, '');
    const model = request.config.model || 'llama3.2';

    let lastContent = '';
    let lastEvalCount: number | null = null;
    let lastModel = model;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const body = {
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          // Single few-shot example: teaches stage > drug match + exact JSON format
          ...FEWSHOT_MESSAGES,
          { role: 'user', content: request.userPrompt },
        ],
        format: 'json',
        stream: true, // Stream to prevent reverse-proxy idle-timeouts on CPU-only inference
        options: {
          temperature: request.config.temperature,
          num_predict: 512, // qwen2.5 is more verbose; 256 truncates JSON
          num_ctx: 4096, // Room for few-shot + query + response
        },
      };

      this.logger.log(
        `Calling Ollama (attempt ${attempt + 1}/${this.MAX_RETRIES + 1}): ${baseUrl}/api/chat ` +
          `model=${model} promptTokens≈${Math.round(JSON.stringify(body).length / 4)}`,
      );

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000), // 5 min max for streaming on slow CPU
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Ollama API error ${response.status}: ${error}`);
        throw new Error(`Ollama API error ${response.status}: ${error.substring(0, 200)}`);
      }

      // Read streaming response (newline-delimited JSON chunks)
      const streamResult = await this.readStream(response, model);
      lastContent = streamResult.content;
      lastEvalCount = streamResult.evalCount;
      lastModel = streamResult.responseModel;

      this.logger.log(
        `Ollama stream complete: ${lastEvalCount ?? '?'} tokens, ${Date.now() - startTime}ms`,
      );

      // Validate that response is parseable JSON with required fields
      const parsed = this.tryExtractJson(lastContent);
      if (parsed && (parsed.recommendedProtocolId || parsed.recommendedProtocolCode)) {
        this.logger.log(
          `Ollama returned valid JSON on attempt ${attempt + 1} ` +
            `(code=${parsed.recommendedProtocolCode}, id=${parsed.recommendedProtocolId}, ` +
            `confidence=${parsed.confidenceScore})`,
        );
        return {
          content: JSON.stringify(parsed),
          tokensUsed: lastEvalCount,
          latencyMs: Date.now() - startTime,
          model: lastModel,
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
      tokensUsed: lastEvalCount,
      latencyMs: Date.now() - startTime,
      model: lastModel,
      provider: 'ollama',
    };
  }

  /**
   * Read Ollama streaming response (newline-delimited JSON chunks).
   * Each line: {"model":"...","message":{"role":"assistant","content":"token"},"done":false}
   * Final line: {"done":true,"eval_count":N,...}
   *
   * Streaming prevents reverse-proxy idle-timeout (nginx default 60s) which kills
   * the connection when CPU-only inference takes >60s with stream:false.
   */
  private async readStream(
    response: Response,
    defaultModel: string,
  ): Promise<{ content: string; evalCount: number | null; responseModel: string }> {
    let content = '';
    let evalCount: number | null = null;
    let responseModel = defaultModel;

    // Fallback for environments where response.body is unavailable
    if (!response.body) {
      const json = await response.json();
      return {
        content: json.message?.content || '',
        evalCount: json.eval_count ?? null,
        responseModel: json.model || defaultModel,
      };
    }

    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            content += chunk.message?.content || '';
            if (chunk.done) {
              evalCount = chunk.eval_count ?? null;
              responseModel = chunk.model || defaultModel;
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer);
          content += chunk.message?.content || '';
          if (chunk.done) {
            evalCount = chunk.eval_count ?? null;
            responseModel = chunk.model || defaultModel;
          }
        } catch {}
      }
    } finally {
      reader.releaseLock();
    }

    return { content, evalCount, responseModel };
  }

  /**
   * Try to extract a valid JSON object from Ollama's response.
   * Handles: raw JSON, markdown code blocks, JSON embedded in prose.
   */
  private tryExtractJson(content: string): any | null {
    if (!content?.trim()) return null;

    const jsonStr = content.trim();

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
