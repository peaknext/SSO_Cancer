import { Module } from '@nestjs/common';
import { RegimensService } from './regimens.service';
import { RegimensController } from './regimens.controller';

@Module({
  controllers: [RegimensController],
  providers: [RegimensService],
  exports: [RegimensService],
})
export class RegimensModule {}
