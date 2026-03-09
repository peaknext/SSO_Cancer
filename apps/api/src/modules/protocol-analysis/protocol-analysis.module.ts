import { Module } from '@nestjs/common';
import { ProtocolAnalysisController } from './protocol-analysis.controller';
import { ImportService } from './services/import.service';
import { MatchingService } from './services/matching.service';
import { SsoProtocolDrugsModule } from '../sso-protocol-drugs/sso-protocol-drugs.module';
import { SsoAipnCatalogModule } from '../sso-aipn-catalog/sso-aipn-catalog.module';

@Module({
  imports: [SsoProtocolDrugsModule, SsoAipnCatalogModule],
  controllers: [ProtocolAnalysisController],
  providers: [ImportService, MatchingService],
  exports: [ImportService, MatchingService],
})
export class ProtocolAnalysisModule {}
