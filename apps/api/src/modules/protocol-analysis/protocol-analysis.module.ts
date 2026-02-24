import { Module } from '@nestjs/common';
import { ProtocolAnalysisController } from './protocol-analysis.controller';
import { ImportService } from './services/import.service';
import { MatchingService } from './services/matching.service';
import { SsoProtocolDrugsModule } from '../sso-protocol-drugs/sso-protocol-drugs.module';

@Module({
  imports: [SsoProtocolDrugsModule],
  controllers: [ProtocolAnalysisController],
  providers: [ImportService, MatchingService],
  exports: [ImportService, MatchingService],
})
export class ProtocolAnalysisModule {}
