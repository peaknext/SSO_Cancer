import { Module } from '@nestjs/common';
import { CancerPatientsService } from './cancer-patients.service';
import { CancerPatientsController } from './cancer-patients.controller';

@Module({
  controllers: [CancerPatientsController],
  providers: [CancerPatientsService],
  exports: [CancerPatientsService],
})
export class CancerPatientsModule {}
