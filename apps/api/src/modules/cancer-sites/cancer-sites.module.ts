import { Module } from '@nestjs/common';
import { CancerSitesService } from './cancer-sites.service';
import { CancerSitesController } from './cancer-sites.controller';

@Module({
  controllers: [CancerSitesController],
  providers: [CancerSitesService],
  exports: [CancerSitesService],
})
export class CancerSitesModule {}
