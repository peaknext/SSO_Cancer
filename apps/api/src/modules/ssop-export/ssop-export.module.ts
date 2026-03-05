import { Module } from '@nestjs/common';
import { SsoAipnCatalogModule } from '../sso-aipn-catalog/sso-aipn-catalog.module';
import { SsopExportController } from './ssop-export.controller';
import { SsopExportService } from './ssop-export.service';

@Module({
  imports: [SsoAipnCatalogModule],
  controllers: [SsopExportController],
  providers: [SsopExportService],
  exports: [SsopExportService],
})
export class SsopExportModule {}
