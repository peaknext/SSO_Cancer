import { Module } from '@nestjs/common';
import { SsoProtocolDrugsService } from './sso-protocol-drugs.service';
import { SsoProtocolDrugsController } from './sso-protocol-drugs.controller';

@Module({
  controllers: [SsoProtocolDrugsController],
  providers: [SsoProtocolDrugsService],
  exports: [SsoProtocolDrugsService],
})
export class SsoProtocolDrugsModule {}
