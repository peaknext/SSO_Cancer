import { Module } from '@nestjs/common';
import { ProtocolAnalysisModule } from '../protocol-analysis/protocol-analysis.module';
import { HisIntegrationController } from './his-integration.controller';
import { HisIntegrationService } from './his-integration.service';
import { HisApiClient } from './his-api.client';
import { HisDbClient } from './his-db.client';
import { HisClientDelegate } from './his-client.factory';
import { HIS_CLIENT_TOKEN } from './his-client.interface';
import { HisNightlyScanService } from './his-nightly-scan.service';
import { ScanLogService } from './scan-log.service';

@Module({
  imports: [ProtocolAnalysisModule],
  controllers: [HisIntegrationController],
  providers: [
    HisIntegrationService,
    HisApiClient,
    HisDbClient,
    HisClientDelegate,
    { provide: HIS_CLIENT_TOKEN, useExisting: HisClientDelegate },
    HisNightlyScanService,
    ScanLogService,
  ],
  exports: [HisIntegrationService, HIS_CLIENT_TOKEN],
})
export class HisIntegrationModule {}
