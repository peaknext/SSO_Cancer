import { Module } from '@nestjs/common';
import { ProtocolAnalysisController } from './protocol-analysis.controller';
import { ImportService } from './services/import.service';
import { MatchingService } from './services/matching.service';

@Module({
  controllers: [ProtocolAnalysisController],
  providers: [ImportService, MatchingService],
  exports: [ImportService, MatchingService],
})
export class ProtocolAnalysisModule {}
