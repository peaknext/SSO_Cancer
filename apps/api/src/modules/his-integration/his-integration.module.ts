import { Module } from '@nestjs/common';
import { ProtocolAnalysisModule } from '../protocol-analysis/protocol-analysis.module';
import { HisIntegrationController } from './his-integration.controller';
import { HisIntegrationService } from './his-integration.service';
import { HisApiClient } from './his-api.client';

@Module({
  imports: [ProtocolAnalysisModule],
  controllers: [HisIntegrationController],
  providers: [HisIntegrationService, HisApiClient],
  exports: [HisIntegrationService],
})
export class HisIntegrationModule {}
