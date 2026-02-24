import { Module } from '@nestjs/common';
import { SsoAipnCatalogService } from './sso-aipn-catalog.service';
import { SsoAipnCatalogController } from './sso-aipn-catalog.controller';

@Module({
  controllers: [SsoAipnCatalogController],
  providers: [SsoAipnCatalogService],
  exports: [SsoAipnCatalogService],
})
export class SsoAipnCatalogModule {}
