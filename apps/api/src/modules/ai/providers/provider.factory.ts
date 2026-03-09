import { Injectable, BadRequestException } from '@nestjs/common';
import { AiProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { ClaudeProvider } from './claude.provider';
import { OpenAiProvider } from './openai.provider';
import { OllamaProvider } from './ollama.provider';

@Injectable()
export class AiProviderFactory {
  private readonly providers = new Map<string, AiProvider>();

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly claudeProvider: ClaudeProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {
    this.providers.set('gemini', this.geminiProvider);
    this.providers.set('claude', this.claudeProvider);
    this.providers.set('openai', this.openAiProvider);
    this.providers.set('ollama', this.ollamaProvider);
  }

  getProvider(name: string): AiProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Unknown AI provider: ${name}`);
    }
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
