import { Module } from '@nestjs/common';
import { SsoAipnCatalogModule } from '../sso-aipn-catalog/sso-aipn-catalog.module';
import { SsoProtocolDrugsService } from './sso-protocol-drugs.service';
import { SsoProtocolDrugsController } from './sso-protocol-drugs.controller';

@Module({
  imports: [SsoAipnCatalogModule],
  controllers: [SsoProtocolDrugsController],
  providers: [SsoProtocolDrugsService],
  exports: [SsoProtocolDrugsService],
})
export class SsoProtocolDrugsModule {}
