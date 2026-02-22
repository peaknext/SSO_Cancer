import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AiProviderFactory } from './providers/provider.factory';
import { ProtocolAnalysisModule } from '../protocol-analysis/protocol-analysis.module';

@Module({
  imports: [ProtocolAnalysisModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiProvider,
    ClaudeProvider,
    OpenAiProvider,
    AiProviderFactory,
  ],
  exports: [AiService],
})
export class AiModule {}
