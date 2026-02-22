import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from './ai-provider.interface';

/**
 * JSON schema for Claude tool_use — forces structured output
 * that exactly matches ParsedRecommendation.
 */
const RECOMMENDATION_TOOL = {
  name: 'recommend_protocol',
  description:
    'Recommend the most appropriate SSO cancer treatment protocol based on clinical visit data analysis',
  input_schema: {
    type: 'object' as const,
    properties: {
      recommendedProtocolCode: {
        type: 'string',
        description: 'Protocol code from the provided database',
      },
      recommendedProtocolId: {
        type: 'integer',
        description: 'Protocol ID from the provided database',
      },
      recommendedRegimenCode: {
        type: ['string', 'null'],
        description: 'Regimen code, or null if not applicable',
      },
      recommendedRegimenId: {
        type: ['integer', 'null'],
        description: 'Regimen ID, or null if not applicable',
      },
      confidenceScore: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Confidence score 0-100',
      },
      reasoning: {
        type: 'string',
        description: 'Clinical reasoning in Thai language (2-4 sentences)',
      },
      alternativeProtocols: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            protocolCode: { type: 'string' },
            protocolId: { type: 'integer' },
            reason: { type: 'string', description: 'Reason in Thai' },
          },
          required: ['protocolCode', 'protocolId', 'reason'],
        },
        description: 'Alternative protocol suggestions',
      },
      clinicalNotes: {
        type: 'string',
        description: 'Additional clinical observations in Thai',
      },
    },
    required: [
      'recommendedProtocolCode',
      'recommendedProtocolId',
      'confidenceScore',
      'reasoning',
      'alternativeProtocols',
      'clinicalNotes',
    ],
  },
};

@Injectable()
export class ClaudeProvider implements AiProvider {
  readonly providerName = 'claude';
  private readonly logger = new Logger(ClaudeProvider.name);

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.config.model,
        max_tokens: request.config.maxTokens,
        temperature: request.config.temperature,
        system: request.systemPrompt,
        tools: [RECOMMENDATION_TOOL],
        tool_choice: { type: 'tool', name: 'recommend_protocol' },
        messages: [{ role: 'user', content: request.userPrompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Claude API error ${response.status}: ${error}`);
      throw new Error(`Claude API error ${response.status}: ${error.substring(0, 200)}`);
    }

    const json = await response.json();

    // Extract structured output from tool_use content block
    const toolUseBlock = json.content?.find(
      (b: { type: string }) => b.type === 'tool_use',
    );
    const content = toolUseBlock
      ? JSON.stringify(toolUseBlock.input)
      : json.content?.[0]?.text || '';

    return {
      content,
      tokensUsed:
        (json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0),
      latencyMs: Date.now() - startTime,
      model: json.model || request.config.model,
      provider: 'claude',
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Use cheapest model for validation (Haiku)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
