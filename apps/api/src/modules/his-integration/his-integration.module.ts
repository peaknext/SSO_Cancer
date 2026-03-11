import { Module } from '@nestjs/common';
import { ProtocolAnalysisModule } from '../protocol-analysis/protocol-analysis.module';
import { HisIntegrationController } from './his-integration.controller';
import { HisIntegrationService } from './his-integration.service';
import { HisApiClient } from './his-api.client';
import { HisNightlyScanService } from './his-nightly-scan.service';
import { ScanLogService } from './scan-log.service';

@Module({
  imports: [ProtocolAnalysisModule],
  controllers: [HisIntegrationController],
  providers: [HisIntegrationService, HisApiClient, HisNightlyScanService, ScanLogService],
  exports: [HisIntegrationService, HisApiClient],
})
export class HisIntegrationModule {}
