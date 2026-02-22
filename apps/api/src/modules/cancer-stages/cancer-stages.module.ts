import { Module } from '@nestjs/common';
import { CancerStagesService } from './cancer-stages.service';
import { CancerStagesController } from './cancer-stages.controller';

@Module({
  controllers: [CancerStagesController],
  providers: [CancerStagesService],
  exports: [CancerStagesService],
})
export class CancerStagesModule {}
